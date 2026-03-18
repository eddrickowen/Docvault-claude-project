/**
 * usePOStore — Zustand store with idb-keyval persistence.
 * Migrates existing localStorage data automatically on first load.
 * Auto-syncs PO status inside actions — no useEffect chains needed.
 */
import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import {
  INIT_POS, INIT_ITEMS, INIT_SUPPLIERS, INIT_DOS,
  INIT_COMPANIES, INIT_ZONE_TYPES, INIT_SETTINGS, INIT_HS_DB, UOM_OPTIONS,
  STATUS_RANK,
} from "../lib/constants";
import { today } from "../lib/helpers";

/* ── IDB key map ── */
const K = {
  pos: "po66_pos",
  items: "po66_items",
  suppliers: "po66_suppliers",
  dos: "po66_dos",
  companies: "po66_companies",
  zoneTypes: "po66_zones",
  settings: "po66_settings",
  hsDB: "po66_hsdb",
  uom: "po66_uom",
};

/* ── Load one key: IDB first, fallback localStorage → IDB, then init value ── */
async function loadKey(key, initVal) {
  let val = await idbGet(key);
  if (val === undefined) {
    try {
      const s = localStorage.getItem(key);
      if (s) {
        val = JSON.parse(s);
        await idbSet(key, val); // migrate to IDB
      }
    } catch { /* ignore */ }
  }
  return val ?? initVal;
}

/* ── Fire-and-forget persist ── */
function save(key, val) {
  idbSet(key, val).catch(() => {});
}

/**
 * Given updated items array, return updated pos array with auto-synced statuses.
 * No side-effects — pure function, called inside set() to keep state consistent.
 */
function syncPOStatuses(pos, items) {
  const newPos = [...pos];
  const newItems = [...items];
  let changed = false;

  newPos.forEach((po, idx) => {
    const poItems = newItems.filter((i) => i.poId === po.id);
    if (!poItems.length) return;

    // PO -> Item Cascade
    // If PO is set to a final state, all its items should follow.
    if (["paid", "delivered", "invoiced", "cancelled"].includes(po.status)) {
      poItems.forEach(item => {
        if (item.status !== po.status && STATUS_RANK[po.status] > (STATUS_RANK[item.status] || 0)) {
          const itemIdx = newItems.findIndex(i => i.id === item.id);
          newItems[itemIdx] = { ...newItems[itemIdx], status: po.status };
          changed = true;
        }
      });
    }

    // Item -> PO Sync
    const statuses = poItems.map(i => i.status);
    const allSame = statuses.every(s => s === statuses[0] && s !== "pending" && s !== "ordered");
    
    let targetPoStatus = po.status;
    if (allSame) {
      // If all items are in the same state, PO takes that state (with "ordered" mapping to "confirmed")
      targetPoStatus = statuses[0] === "ordered" ? "confirmed" : statuses[0];
    } else {
      // Mixed states logic
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
export const usePOStore = create((set, get) => ({
  /* ── State ── */
  pos: [], items: [], suppliers: [], dos: [],
  companies: [], zoneTypes: [], settings: {}, hsDB: [], uom: [],
  _loaded: false,
  _toast: null, // { id, msg }
  jumpTargetPOId: null,
  triggerNewPO: false,
  setTriggerNewPO: (val) => set({ triggerNewPO: val }),

  /* ── Init: load all data from IDB (with localStorage migration) ── */
  init: async () => {
    const [pos, items, suppliers, dos, companies, zoneTypes, settings, hsDB, uom] =
      await Promise.all([
        loadKey(K.pos,       INIT_POS),
        loadKey(K.items,     INIT_ITEMS),
        loadKey(K.suppliers, INIT_SUPPLIERS),
        loadKey(K.dos,       INIT_DOS),
        loadKey(K.companies, INIT_COMPANIES),
        loadKey(K.zoneTypes, INIT_ZONE_TYPES),
        loadKey(K.settings,  INIT_SETTINGS),
        loadKey(K.hsDB,      INIT_HS_DB),
        loadKey(K.uom,       UOM_OPTIONS),
      ]);
    set({ pos, items, suppliers, dos, companies, zoneTypes, settings, hsDB, uom, _loaded: true });
  },

  /* ── Toast ── */
  toast: (msg) => {
    const id = Date.now();
    set({ _toast: { id, msg } });
    setTimeout(() => set((s) => s._toast?.id === id ? { _toast: null } : {}), 2500);
  },

  /* ── Cross-page jump helpers ── */
  setJumpTargetPO: (id) => set(() => ({ jumpTargetPOId: id })),

  /* ════════ PO CRUD ════════ */
  addPO: (po, draftItems = []) => set((s) => {
    const newPos = s.pos.find((x) => x.id === po.id)
      ? s.pos.map((x) => (x.id === po.id ? po : x))
      : [...s.pos, po];
    const ids = new Set(draftItems.map((i) => i.id));
    const newItems = draftItems.length
      ? [...s.items.filter((i) => !ids.has(i.id)), ...draftItems]
      : s.items;
    save(K.pos, newPos); save(K.items, newItems);
    return { pos: newPos, items: newItems };
  }),

  updatePO: (po) => set((s) => {
    const newPos = s.pos.map((x) => (x.id === po.id ? po : x));
    save(K.pos, newPos);
    return { pos: newPos };
  }),

  deletePO: (id) => set((s) => {
    const newPos   = s.pos.filter((x) => x.id !== id);
    const newItems = s.items.filter((i) => i.poId !== id);
    const newDos   = s.dos.filter((d) => d.poId !== id);
    save(K.pos, newPos); save(K.items, newItems); save(K.dos, newDos);
    return { pos: newPos, items: newItems, dos: newDos };
  }),

  /* ════════ Company CRUD ════════ */
  addCompany: (compObj) => set((s) => {
    const newComps = [...s.companies, compObj];
    save(K.companies, newComps);
    return { companies: newComps };
  }),

  /* ════════ Zone Type CRUD ════════ */
  addZoneType: (zoneObj) => set((s) => {
    const newZones = [...s.zoneTypes, zoneObj];
    save(K.zoneTypes, newZones);
    return { zoneTypes: newZones };
  }),

  /* ════════ Item CRUD ════════ */
  addItem: (item) => set((s) => {
    const newItems = s.items.find((x) => x.id === item.id)
      ? s.items.map((x) => (x.id === item.id ? item : x))
      : [...s.items, item];
    const synced = syncPOStatuses(s.pos, newItems);
    save(K.items, synced.items); save(K.pos, synced.pos);
    return { items: synced.items, pos: synced.pos };
  }),

  updateItem: (item) => set((s) => {
    const newItems = s.items.map((x) => (x.id === item.id ? item : x));
    const synced = syncPOStatuses(s.pos, newItems);
    save(K.items, synced.items); save(K.pos, synced.pos);
    return { items: synced.items, pos: synced.pos };
  }),

  deleteItem: (id) => set((s) => {
    const newItems = s.items.filter((x) => x.id !== id);
    const synced = syncPOStatuses(s.pos, newItems);
    save(K.items, synced.items); save(K.pos, synced.pos);
    return { items: synced.items, pos: synced.pos };
  }),

  /* ════════ Supplier CRUD ════════ */
  addSupplier: (supplier) => set((s) => {
    const newSup = s.suppliers.find((x) => x.id === supplier.id)
      ? s.suppliers.map((x) => (x.id === supplier.id ? supplier : x))
      : [...s.suppliers, supplier];
    save(K.suppliers, newSup);
    return { suppliers: newSup };
  }),

  updateSupplier: (supplier) => set((s) => {
    const newSup = s.suppliers.map((x) => (x.id === supplier.id ? supplier : x));
    save(K.suppliers, newSup);
    return { suppliers: newSup };
  }),

  archiveSupplier: (id) => set((s) => {
    const newSup = s.suppliers.map((sup) =>
      sup.id === id ? { ...sup, deletedAt: today() } : sup
    );
    save(K.suppliers, newSup);
    return { suppliers: newSup };
  }),

  deleteSupplier: (id) => set((s) => {
    const newSup = s.suppliers.filter((x) => x.id !== id);
    save(K.suppliers, newSup);
    return { suppliers: newSup };
  }),

  /* ════════ DO Management ════════ */
  saveDO: (doObj) => set((s) => {
    const newDos = [...s.dos, doObj];

    // Update item doNos + deliveryDate
    let newItems = s.items.map((i) => {
      const line = doObj.lines.find((l) => l.itemId === i.id);
      if (!line) return i;
      const newDoNos = [...new Set([...(i.doNos ?? []), doObj.doNo])];
      return { ...i, doNos: newDoNos, deliveryDate: i.deliveryDate || doObj.deliveryDate };
    });

    // Auto-update item status based on cumulative qty delivered
    newItems = newItems.map((i) => {
      if (!doObj.lines.some((l) => l.itemId === i.id)) return i;
      const total = newDos.reduce(
        (acc, d) => acc + ((d.lines ?? []).find((l) => l.itemId === i.id)?.qtyDelivered ?? 0),
        0
      );
      const newStatus = total >= i.qty ? "delivered" : total > 0 ? "partial" : i.status;
      return { ...i, status: newStatus };
    });

    const newPos = syncPOStatuses(s.pos, newItems);
    save(K.dos, newDos); save(K.items, newItems); save(K.pos, newPos);
    return { dos: newDos, items: newItems, pos: newPos };
  }),

  deleteDO: (doId) => set((s) => {
    const doObj = s.dos.find((d) => d.id === doId);
    if (!doObj) return {};
    const newDos = s.dos.filter((d) => d.id !== doId);
    const newItems = s.items.map((i) => {
      if (!(doObj.lines ?? []).some((l) => l.itemId === i.id)) return i;
      const total = newDos.reduce(
        (acc, d) => acc + ((d.lines ?? []).find((l) => l.itemId === i.id)?.qtyDelivered ?? 0),
        0
      );
      const newDoNos = (i.doNos ?? []).filter((n) => n !== doObj.doNo);
      const newStatus = total >= i.qty ? "delivered" : total > 0 ? "partial" : "ordered";
      return { ...i, doNos: newDoNos, status: newStatus };
    });
    const newPos = syncPOStatuses(s.pos, newItems);
    save(K.dos, newDos); save(K.items, newItems); save(K.pos, newPos);
    return { dos: newDos, items: newItems, pos: newPos };
  }),

  /* ════════ Settings ════════ */
  saveSettings: (settings) => set(() => { save(K.settings, settings); return { settings }; }),
  saveCompanies: (companies) => set(() => { save(K.companies, companies); return { companies }; }),
  saveZoneTypes: (zoneTypes) => set(() => { save(K.zoneTypes, zoneTypes); return { zoneTypes }; }),
  saveHsDB:      (hsDB)      => set(() => { save(K.hsDB,      hsDB);      return { hsDB };      }),
  saveUom:       (uom)       => set(() => { save(K.uom,       uom);       return { uom };       }),
}));
