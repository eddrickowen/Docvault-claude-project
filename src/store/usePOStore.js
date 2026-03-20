/**
 * usePOStore — Zustand store with PocketBase persistence.
 * Real-time sync, multi-device support, conflict-free updates.
 */
import { create } from "zustand";
import { pb, collections, dbHelpers, cleanRecord } from "../lib/pocketbase";
import { logger } from "../lib/logger";
import { batchDelete, batchCreate } from "../lib/batchHelpers";
import {
  INIT_POS, INIT_ITEMS, INIT_SUPPLIERS, INIT_DOS,
  INIT_COMPANIES, INIT_ZONE_TYPES, INIT_SETTINGS, INIT_HS_DB, UOM_OPTIONS,
  STATUS_RANK,
} from "../lib/constants";
import { today } from "../lib/helpers";

/**
 * Given updated items array, return updated pos array with auto-synced statuses.
 * No side-effects — pure function, called inside set() to keep state consistent.
 * Optimized with Maps for O(n) complexity instead of O(n²).
 */
function syncPOStatuses(pos, items) {
  const newPos = [...pos];
  const newItems = [...items];
  let changed = false;

  // Build item lookup maps for O(1) access
  const itemsByPoId = new Map();
  const itemIndexMap = new Map();

  newItems.forEach((item, idx) => {
    if (!itemsByPoId.has(item.poId)) {
      itemsByPoId.set(item.poId, []);
    }
    itemsByPoId.get(item.poId).push(item);
    itemIndexMap.set(item.id, idx);
  });

  newPos.forEach((po, idx) => {
    const poItems = itemsByPoId.get(po.id) || [];
    if (!poItems.length) return;

    // PO -> Item Cascade
    if (["paid", "delivered", "invoiced", "cancelled"].includes(po.status)) {
      poItems.forEach(item => {
        if (item.status !== po.status && STATUS_RANK[po.status] > (STATUS_RANK[item.status] || 0)) {
          const itemIdx = itemIndexMap.get(item.id);
          newItems[itemIdx] = { ...newItems[itemIdx], status: po.status };
          // Update in-memory ref too
          item.status = po.status;
          changed = true;
        }
      });
    }

    // Item -> PO Sync
    const statuses = poItems.map(i => i.status);
    const allSame = statuses.every(s => s === statuses[0] && s !== "pending" && s !== "ordered");

    let targetPoStatus = po.status;
    if (allSame) {
      targetPoStatus = statuses[0] === "ordered" ? "confirmed" : statuses[0];
    } else {
      const hasPaid = statuses.some(s => s === "paid");
      const hasInv  = statuses.some(s => ["invoiced", "paid"].includes(s));
      const hasDel  = statuses.some(s => ["delivered", "partial", "invoiced", "paid"].includes(s));
      const hasOrd  = statuses.some(s => s === "ordered");

      if (hasPaid) targetPoStatus = "partial_pay";
      else if (hasInv) targetPoStatus = "invoiced";
      else if (hasDel) targetPoStatus = "partial_del";
      else if (hasOrd) targetPoStatus = "confirmed";
    }

    if (targetPoStatus !== po.status) {
      newPos[idx] = { ...newPos[idx], status: targetPoStatus };
      changed = true;
    }
  });

  return { pos: newPos, items: newItems, changed };
}

/* ════════════════════════════════════════════════════════════ */
const MAX_HISTORY = 20; // Keep last 20 operations for undo/redo

export const usePOStore = create((set, get) => ({
  /* ── State ── */
  pos: [], items: [], suppliers: [], dos: [],
  companies: [], zoneTypes: [], settings: {}, hsDB: [], uom: [],
  _loaded: false,
  _toast: null, // { id, msg }
  jumpTargetPOId: null,
  triggerNewPO: false,
  setTriggerNewPO: (val) => set({ triggerNewPO: val }),

  /* ── Undo/Redo State ── */
  history: [],
  historyIndex: -1,

  /* ── Init: load all data from PocketBase ── */
  init: async () => {
    try {
      logger.log('🔄 Loading data from PocketBase...');

      // Load all collections in parallel for faster initial load
      const [
        pos,
        items,
        suppliers,
        dos,
        companies,
        zoneTypes,
        hsDB,
        settingsResult,
        uomResult
      ] = await Promise.all([
        dbHelpers.getAll('pos'),
        dbHelpers.getAll('items'),
        dbHelpers.getAll('suppliers'),
        dbHelpers.getAll('dos'),
        dbHelpers.getAll('companies'),
        dbHelpers.getAll('zone_types'),
        dbHelpers.getAll('hs_codes'),
        // Load settings (special handling - single record)
        collections.settings().getFullList().catch(() => []),
        // Load UOM
        collections.settings().getFirstListItem('key="uom"').catch(() => null)
      ]);

      logger.log('📦 Data loaded:', { pos: pos.length, items: items.length, suppliers: suppliers.length });

      // Process settings
      let settings = INIT_SETTINGS;
      if (settingsResult.length > 0) {
        const sObj = settingsResult.find(r => r.key === 'app_settings');
        settings = sObj?.value || INIT_SETTINGS;
      }

      // Process UOM
      let uom = UOM_OPTIONS;
      if (uomResult) {
        uom = uomResult.value || UOM_OPTIONS;
      }

      logger.log('✅ Data loaded:', { pos: pos.length, items: items.length, suppliers: suppliers.length });

      set({
        pos,
        items,
        suppliers,
        dos,
        companies: companies.map(c => c.name || c),
        zoneTypes: zoneTypes.map(z => z.name || z),
        settings,
        hsDB: hsDB.map(h => ({ code: h.code, desc: h.desc })),
        uom,
        _loaded: true
      });

      // Subscribe to real-time updates
      get()._subscribeToRealtime();

    } catch (error) {
      console.error('❌ Failed to load data:', error);
      get().toast('⚠️ Failed to connect to server. Using offline mode.');

      // Fallback to empty state if server unavailable
      set({
        pos: INIT_POS,
        items: INIT_ITEMS,
        suppliers: INIT_SUPPLIERS,
        dos: INIT_DOS,
        companies: INIT_COMPANIES,
        zoneTypes: INIT_ZONE_TYPES,
        settings: INIT_SETTINGS,
        hsDB: INIT_HS_DB,
        uom: UOM_OPTIONS,
        _loaded: true
      });
    }
  },

  /* ── Real-time subscriptions ── */
  _subscribeToRealtime: () => {
    logger.log('🔔 Setting up real-time subscriptions...');

    // Subscribe to POs
    pb.collection('pos').subscribe('*', (e) => {
      logger.log('🔄 PO changed:', e.action, e.record);
      set((state) => {
        if (e.action === 'create') {
          return { pos: [...state.pos, e.record] };
        }
        if (e.action === 'update') {
          return { pos: state.pos.map(p => p.id === e.record.id ? e.record : p) };
        }
        if (e.action === 'delete') {
          return { pos: state.pos.filter(p => p.id !== e.record.id) };
        }
        return state;
      });
    });

    // Subscribe to Items
    pb.collection('items').subscribe('*', (e) => {
      logger.log('🔄 Item changed:', e.action, e.record);
      set((state) => {
        let newItems = state.items;
        if (e.action === 'create') {
          newItems = [...state.items, e.record];
        } else if (e.action === 'update') {
          newItems = state.items.map(i => i.id === e.record.id ? e.record : i);
        } else if (e.action === 'delete') {
          newItems = state.items.filter(i => i.id !== e.record.id);
        }

        // Sync PO statuses
        const synced = syncPOStatuses(state.pos, newItems);
        return { items: newItems, pos: synced.pos };
      });
    });

    // Subscribe to Suppliers
    pb.collection('suppliers').subscribe('*', (e) => {
      set((state) => {
        if (e.action === 'create') return { suppliers: [...state.suppliers, e.record] };
        if (e.action === 'update') return { suppliers: state.suppliers.map(s => s.id === e.record.id ? e.record : s) };
        if (e.action === 'delete') return { suppliers: state.suppliers.filter(s => s.id !== e.record.id) };
        return state;
      });
    });

    // Subscribe to DOs
    pb.collection('dos').subscribe('*', (e) => {
      set((state) => {
        if (e.action === 'create') return { dos: [...state.dos, e.record] };
        if (e.action === 'update') return { dos: state.dos.map(d => d.id === e.record.id ? e.record : d) };
        if (e.action === 'delete') return { dos: state.dos.filter(d => d.id !== e.record.id) };
        return state;
      });
    });

    logger.log('✅ Real-time subscriptions active');
  },

  /* ── Toast ── */
  toast: (msg) => {
    const id = Date.now();
    set({ _toast: { id, msg } });
    setTimeout(() => set((s) => s._toast?.id === id ? { _toast: null } : {}), 2500);
  },

  /* ── Cross-page jump helpers ── */
  setJumpTargetPO: (id) => set(() => ({ jumpTargetPOId: id })),

  /* ════════ Undo/Redo System (kept for compatibility, client-side only) ════════ */
  _saveToHistory: (action) => {
    const s = get();
    const snapshot = {
      pos: JSON.parse(JSON.stringify(s.pos)),
      items: JSON.parse(JSON.stringify(s.items)),
      suppliers: JSON.parse(JSON.stringify(s.suppliers)),
      dos: JSON.parse(JSON.stringify(s.dos)),
      action,
      timestamp: Date.now(),
    };

    const newHistory = s.historyIndex < s.history.length - 1
      ? s.history.slice(0, s.historyIndex + 1)
      : [...s.history];

    newHistory.push(snapshot);
    const trimmedHistory = newHistory.slice(-MAX_HISTORY);

    set({
      history: trimmedHistory,
      historyIndex: trimmedHistory.length - 1
    });
  },

  undo: () => {
    const s = get();
    if (s.historyIndex < 0) {
      get().toast("⚠ Tidak ada yang bisa di-undo");
      return;
    }

    const snapshot = s.history[s.historyIndex];
    set({
      pos: JSON.parse(JSON.stringify(snapshot.pos)),
      items: JSON.parse(JSON.stringify(snapshot.items)),
      suppliers: JSON.parse(JSON.stringify(snapshot.suppliers)),
      dos: JSON.parse(JSON.stringify(snapshot.dos)),
      historyIndex: s.historyIndex - 1
    });

    get().toast(`↶ Undo: ${snapshot.action}`);
  },

  redo: () => {
    const s = get();
    if (s.historyIndex >= s.history.length - 1) {
      get().toast("⚠ Tidak ada yang bisa di-redo");
      return;
    }

    const snapshot = s.history[s.historyIndex + 1];
    set({
      pos: JSON.parse(JSON.stringify(snapshot.pos)),
      items: JSON.parse(JSON.stringify(snapshot.items)),
      suppliers: JSON.parse(JSON.stringify(snapshot.suppliers)),
      dos: JSON.parse(JSON.stringify(snapshot.dos)),
      historyIndex: s.historyIndex + 1
    });

    get().toast(`↷ Redo: ${snapshot.action}`);
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  /* ════════ PO CRUD ════════ */
  addPO: async (po, draftItems = []) => {
    try {
      // Find existing PO in DB by ID or OrderNo
      const existing = (po.id && get().pos.find(p => p.id === po.id)) || 
                      (po.orderNo && get().pos.find(p => p.orderNo.toLowerCase() === po.orderNo.toLowerCase()));

      const savedPO = existing
        ? await collections.pos().update(existing.id, cleanRecord({ ...po, id: existing.id }))
        : await collections.pos().create(cleanRecord(po));

      // Save all items using batch operations for better performance
      const savedItems = [];
      if (draftItems.length > 0) {
        const itemsToCreate = [];
        const itemsToUpdate = [];

        for (const item of draftItems) {
          const itemToSave = { ...item, poId: savedPO.id };
          const itemExisting = item.id && get().items.find(i => i.id === item.id);

          if (itemExisting) {
            itemsToUpdate.push({ ...cleanRecord(itemToSave), id: item.id });
          } else {
            itemsToCreate.push(cleanRecord(itemToSave));
          }
        }

        // Create new items in batch
        if (itemsToCreate.length > 0) {
          const createResult = await batchCreate(collections.items(), itemsToCreate, 30);
          savedItems.push(...createResult.success);
          if (createResult.failed.length > 0) {
            logger.log(`⚠️ Failed to create ${createResult.failed.length} items`);
          }
        }

        // Update existing items concurrently
        if (itemsToUpdate.length > 0) {
          const updatePromises = itemsToUpdate.map(item =>
            collections.items().update(item.id, item)
              .then(updated => ({ success: true, item: updated }))
              .catch(error => ({ success: false, error, item }))
          );
          const updateResults = await Promise.all(updatePromises);
          updateResults.forEach(result => {
            if (result.success) {
              savedItems.push(result.item);
            } else {
              logger.log(`⚠️ Failed to update item:`, result.error);
            }
          });
        }
      }

      // Update local state (real-time will also update, but this is instant feedback)
      set((s) => {
        const newPos = s.pos.find(x => x.id === savedPO.id)
          ? s.pos.map(x => x.id === savedPO.id ? savedPO : x)
          : [...s.pos, savedPO];

        const ids = new Set(savedItems.map(i => i.id));
        const newItems = savedItems.length
          ? [...s.items.filter(i => !ids.has(i.id)), ...savedItems]
          : s.items;

        return { pos: newPos, items: newItems };
      });

    } catch (error) {
      console.error('Failed to add PO:', error);
      get().toast('⚠️ Failed to save PO: ' + error.message);
    }
  },

  updatePO: async (po) => {
    try {
      const updated = await collections.pos().update(po.id, cleanRecord(po));
      set((s) => ({ pos: s.pos.map(x => x.id === po.id ? updated : x) }));
    } catch (error) {
      console.error('Failed to update PO:', error);
      get().toast('⚠️ Failed to update PO: ' + error.message);
    }
  },

  deletePO: async (id) => {
    try {
      const po = get().pos.find(p => p.id === id);
      get()._saveToHistory(`Hapus PO: ${po?.orderNo || id}`);

      // Collect items and DOs to delete
      const itemsToDelete = get().items.filter(i => i.poId === id);
      const dosToDelete = get().dos.filter(d => d.poId === id);

      // Delete all related records concurrently with PO using batch operations
      const [poResult, itemsResult, dosResult] = await Promise.all([
        collections.pos().delete(id).then(() => ({ success: true })).catch(error => ({ success: false, error })),
        itemsToDelete.length > 0
          ? batchDelete(collections.items(), itemsToDelete.map(i => i.id), 30)
          : Promise.resolve({ success: [], failed: [] }),
        dosToDelete.length > 0
          ? batchDelete(collections.dos(), dosToDelete.map(d => d.id), 30)
          : Promise.resolve({ success: [], failed: [] })
      ]);

      // Check for failures and throw error if PO deletion failed
      if (!poResult.success) {
        throw new Error(`Failed to delete PO: ${poResult.error.message}`);
      }
      if (itemsResult.failed.length > 0) {
        logger.warn(`⚠️ Failed to delete ${itemsResult.failed.length} items`);
        // Throw error to prevent silent failure
        throw new Error(`Failed to delete ${itemsResult.failed.length} items`);
      }
      if (dosResult.failed.length > 0) {
        logger.warn(`⚠️ Failed to delete ${dosResult.failed.length} DOs`);
        // Throw error to prevent silent failure
        throw new Error(`Failed to delete ${dosResult.failed.length} DOs`);
      }

      // Update local state only if deletion succeeded
      set((s) => ({
        pos: s.pos.filter(x => x.id !== id),
        items: s.items.filter(i => i.poId !== id),
        dos: s.dos.filter(d => d.poId !== id)
      }));

    } catch (error) {
      console.error('Failed to delete PO:', error);
      get().toast('⚠️ Failed to delete PO: ' + error.message);
      // Re-throw the error so bulk delete can handle it properly
      throw error;
    }
  },

  bulkDeletePOs: async (ids) => {
    if (!ids || ids.length === 0) return;
    try {
      get()._saveToHistory(`Hapus ${ids.length} PO (Bulk)`);
      
      // Call the custom backend endpoint for efficient SQL deletion
      const response = await pb.send("/api/bulk-delete", {
        method: "POST",
        body: { ids } // Let SDK handle stringify and headers
      });

      if (response.success) {
        // Update local state instantly by filtering out the deleted IDs
        const idSet = new Set(ids);
        set((s) => ({
          pos: s.pos.filter(p => !idSet.has(p.id)),
          items: s.items.filter(i => !idSet.has(i.poId)),
          dos: s.dos.filter(d => !idSet.has(d.poId))
        }));
        get().toast(`✓ ${ids.length} PO berhasil dihapus.`);
      } else {
        throw new Error(response.error || "Gagal menghapus PO");
      }
    } catch (error) {
      console.error('Failed to bulk delete POs:', error);
      get().toast('⚠️ Gagal menghapus PO secara massal: ' + error.message);
    }
  },

  /* ════════ Company CRUD ════════ */
  addCompany: async (compObj) => {
    try {
      const name = typeof compObj === 'string' ? compObj : compObj.name;
      const record = await collections.companies().create({ name });
      set((s) => ({ companies: [...s.companies, record.name] }));
    } catch (error) {
      console.error('Failed to add company:', error);
    }
  },

  /* ════════ Zone Type CRUD ════════ */
  addZoneType: async (zoneObj) => {
    try {
      const name = typeof zoneObj === 'string' ? zoneObj : zoneObj.name;
      const saved = await collections.zoneTypes().create({ name });
      set((s) => ({ zoneTypes: [...s.zoneTypes, saved.name] }));
    } catch (error) {
      console.error('Failed to add zone type:', error);
    }
  },

  upsertZoneType: async (name) => {
    if (!name) return;
    try {
      const existing = get().zoneTypes.find(z => z.toLowerCase() === name.toLowerCase());
      if (!existing) {
        const saved = await collections.zoneTypes().create({ name });
        set((s) => ({ zoneTypes: [...s.zoneTypes, saved.name] }));
      }
    } catch (e) { /* Ignore dupe errors */ }
  },

  /* ════════ Item CRUD ════════ */
  addItem: async (item) => {
    try {
      const existing = item.id && get().items.find(i => i.id === item.id);
      const saved = existing
        ? await collections.items().update(item.id, cleanRecord(item))
        : await collections.items().create(cleanRecord(item));

      set((s) => {
        const newItems = s.items.find(x => x.id === saved.id)
          ? s.items.map(x => x.id === saved.id ? saved : x)
          : [...s.items, saved];
        const synced = syncPOStatuses(s.pos, newItems);
        return { items: synced.items, pos: synced.pos };
      });
    } catch (error) {
      console.error('Failed to add item:', error);
      get().toast('⚠️ Failed to save item: ' + error.message);
    }
  },

  updateItem: async (item) => {
    try {
      const updated = await collections.items().update(item.id, cleanRecord(item));
      set((s) => {
        const newItems = s.items.map(x => x.id === item.id ? updated : x);
        const synced = syncPOStatuses(s.pos, newItems);
        return { items: synced.items, pos: synced.pos };
      });
    } catch (error) {
      console.error('Failed to update item:', error);
      get().toast('⚠️ Failed to update item: ' + error.message);
    }
  },

  deleteItem: async (id) => {
    try {
      await collections.items().delete(id);
      set((s) => {
        const newItems = s.items.filter(x => x.id !== id);
        const synced = syncPOStatuses(s.pos, newItems);
        return { items: synced.items, pos: synced.pos };
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
      get().toast('⚠️ Failed to delete item: ' + error.message);
    }
  },

  /* ════════ Supplier CRUD ════════ */
  addSupplier: async (supplier) => {
    try {
      const existing = supplier.id && get().suppliers.find(s => s.id === supplier.id);
      
      const saved = existing
        ? await collections.suppliers().update(supplier.id, cleanRecord(supplier))
        : await collections.suppliers().create(cleanRecord(supplier));

      set((s) => {
        const newSup = s.suppliers.find(x => x.id === saved.id)
          ? s.suppliers.map(x => x.id === saved.id ? saved : x)
          : [...s.suppliers, saved];
        return { suppliers: newSup };
      });
    } catch (error) {
      console.error('Failed to add supplier:', error);
      get().toast('⚠️ Failed to save supplier: ' + error.message);
    }
  },

  updateSupplier: async (supplier) => {
    try {
      const updated = await collections.suppliers().update(supplier.id, supplier);
      set((s) => ({ suppliers: s.suppliers.map(x => x.id === supplier.id ? updated : x) }));
    } catch (error) {
      console.error('Failed to update supplier:', error);
    }
  },

  archiveSupplier: async (id) => {
    try {
      const updated = await collections.suppliers().update(id, { deletedAt: today() });
      set((s) => ({ suppliers: s.suppliers.map(sup => sup.id === id ? updated : sup) }));
    } catch (error) {
      console.error('Failed to archive supplier:', error);
    }
  },

  deleteSupplier: async (id) => {
    try {
      await collections.suppliers().delete(id);
      set((s) => ({ suppliers: s.suppliers.filter(x => x.id !== id) }));
    } catch (error) {
      console.error('Failed to delete supplier:', error);
    }
  },

  /* ════════ DO Management ════════ */
  saveDO: async (doObj) => {
    try {
      // Upsert DO
      const existingDO = get().dos.find(d => d.id === doObj.id || d.doNo === doObj.doNo);
      const savedDO = existingDO
        ? await collections.dos().update(existingDO.id, cleanRecord({ ...doObj, id: existingDO.id }))
        : await collections.dos().create(cleanRecord(doObj));

      // Update items with DO info
      const itemUpdates = doObj.lines.map(async (line) => {
        const item = get().items.find(i => i.id === line.itemId);
        if (!item) return;

        const newDoNos = [...new Set([...(item.doNos ?? []), doObj.doNo])];
        const deliveryDate = item.deliveryDate || doObj.deliveryDate;

        // Calculate total delivered
        const allDos = [...get().dos, savedDO];
        const total = allDos.reduce(
          (acc, d) => acc + ((d.lines ?? []).find(l => l.itemId === item.id)?.qtyDelivered ?? 0),
          0
        );
        const newStatus = total >= item.qty ? "delivered" : total > 0 ? "partial" : item.status;

        return collections.items().update(item.id, {
          ...item,
          doNos: newDoNos,
          deliveryDate,
          status: newStatus
        });
      });

      await Promise.all(itemUpdates);

      // Reload items to get updated data
      const items = await dbHelpers.getAll('items');
      const synced = syncPOStatuses(get().pos, items);

      set((s) => ({
        dos: existingDO
          ? s.dos.map(d => d.id === existingDO.id ? savedDO : d)
          : [...s.dos, savedDO],
        items,
        pos: synced.pos
      }));

    } catch (error) {
      console.error('Failed to save DO:', error);
      get().toast('⚠️ Failed to save DO: ' + error.message);
    }
  },

  deleteDO: async (doId) => {
    try {
      const doObj = get().dos.find(d => d.id === doId);
      if (!doObj) return;

      await collections.dos().delete(doId);

      // Update items
      const itemUpdates = (doObj.lines ?? []).map(async (line) => {
        const item = get().items.find(i => i.id === line.itemId);
        if (!item) return;

        const remainingDos = get().dos.filter(d => d.id !== doId);
        const total = remainingDos.reduce(
          (acc, d) => acc + ((d.lines ?? []).find(l => l.itemId === item.id)?.qtyDelivered ?? 0),
          0
        );
        const newDoNos = (item.doNos ?? []).filter(n => n !== doObj.doNo);

        let newStatus = item.status;
        if (["delivered", "partial"].includes(item.status)) {
          newStatus = total >= item.qty ? "delivered" : total > 0 ? "partial" : "ordered";
        }

        return collections.items().update(item.id, {
          ...item,
          doNos: newDoNos,
          status: newStatus
        });
      });

      await Promise.all(itemUpdates);

      const items = await dbHelpers.getAll('items');
      const synced = syncPOStatuses(get().pos, items);

      set((s) => ({
        dos: s.dos.filter(d => d.id !== doId),
        items,
        pos: synced.pos
      }));

    } catch (error) {
      console.error('Failed to delete DO:', error);
      get().toast('⚠️ Failed to delete DO: ' + error.message);
    }
  },

  /* ════════ Settings ════════ */
  saveSettings: async (settings) => {
    try {
      // Check if settings record exists
      const existing = await collections.settings().getFirstListItem('key="app_settings"').catch(() => null);

      if (existing) {
        await collections.settings().update(existing.id, { key: 'app_settings', value: settings });
      } else {
        await collections.settings().create({ key: 'app_settings', value: settings });
      }

      set({ settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  saveCompanies: async (companies) => {
    try {
      // Note: This is a simplified version. In production, you'd want to sync properly
      set({ companies });
    } catch (error) {
      console.error('Failed to save companies:', error);
    }
  },

  saveZoneTypes: async (zoneTypes) => {
    try {
      set({ zoneTypes });
    } catch (error) {
      console.error('Failed to save zone types:', error);
    }
  },

  saveHsDB: async (hsDB) => {
    try {
      set({ hsDB });
    } catch (error) {
      console.error('Failed to save HS DB:', error);
    }
  },

  upsertHSCode: async (code, desc = "") => {
    if (!code) return;
    try {
      const existing = get().hsDB.find(h => h.code === code);
      if (!existing) {
        const saved = await collections.hsCodes().create({ code, desc });
        set((s) => ({ hsDB: [...s.hsDB, { code: saved.code, desc: saved.desc }] }));
      }
    } catch (e) { /* Ignore dupe errors from server */ }
  },

  saveUom: async (uom) => {
    try {
      const existing = await collections.settings().getFirstListItem('key="uom"').catch(() => null);

      if (existing) {
        await collections.settings().update(existing.id, { key: 'uom', value: uom });
      } else {
        await collections.settings().create({ key: 'uom', value: uom });
      }

      set({ uom });
    } catch (error) {
      console.error('Failed to save UOM:', error);
    }
  },
}));
