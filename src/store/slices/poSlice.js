/**
 * poSlice — Purchase Order CRUD operations.
 *
 * Methods:
 *   addPO(po, draftItems)     — create or update a PO + its line items in one call
 *   updatePO(po)              — update PO header fields only
 *   deletePO(id)              — delete PO and all its items + DOs
 *   bulkDeletePOs(ids)        — delete many POs via server-side batch endpoint
 *   bulkImportPOs(payload)    — import many POs+items from CSV wizard
 *
 * NOTE on bulkDeletePOs and bulkImportPOs:
 *   Both temporarily unsubscribe from real-time events to prevent a
 *   flood of WebSocket messages from freezing the UI during bulk ops.
 *   They re-subscribe in the finally block.
 */

import { pb, collections, cleanRecord, pbError } from "../../lib/pocketbase";
import { logger } from "../../lib/logger";
import { batchCreate, batchDelete } from "../../lib/batchHelpers";
import { logAct } from "../useActivityStore";

export function createPOSlice(set, get) {
  return {
    /* ── Create / Update ─────────────────────────────────────────── */

    addPO: async (po, draftItems = []) => {
      try {
        // If a PO with the same ID or orderNo already exists → update it
        const existing =
          (po.id && get().pos.find((p) => p.id === po.id)) ||
          (po.orderNo && get().pos.find((p) => p.orderNo.toLowerCase() === po.orderNo.toLowerCase()));

        const savedPO = existing
          ? await collections.pos().update(existing.id, cleanRecord({ ...po, id: existing.id }))
          : await collections.pos().create(cleanRecord(po));

        // Separate draft items into create vs update buckets
        const savedItems = [];
        if (draftItems.length > 0) {
          const toCreate = [];
          const toUpdate = [];

          for (const item of draftItems) {
            const itemWithPoId = { ...item, poId: savedPO.id };
            const itemExists = item.id && get().items.find((i) => i.id === item.id);
            if (itemExists) toUpdate.push({ ...cleanRecord(itemWithPoId), id: item.id });
            else            toCreate.push(cleanRecord(itemWithPoId));
          }

          if (toCreate.length > 0) {
            const result = await batchCreate(collections.items(), toCreate, 30);
            savedItems.push(...result.success);
            if (result.failed.length > 0) logger.warn(`Failed to create ${result.failed.length} items`);
          }

          if (toUpdate.length > 0) {
            const results = await Promise.all(
              toUpdate.map((item) =>
                collections.items().update(item.id, item)
                  .then((updated) => ({ ok: true, item: updated }))
                  .catch((err) => { logger.warn("Item update failed:", err); return { ok: false }; })
              )
            );
            results.filter((r) => r.ok).forEach((r) => savedItems.push(r.item));
          }
        }

        // Optimistic local state update (real-time will also arrive shortly)
        set((s) => {
          const newPos = s.pos.find((x) => x.id === savedPO.id)
            ? s.pos.map((x) => (x.id === savedPO.id ? savedPO : x))
            : [...s.pos, savedPO];

          const savedIds = new Set(savedItems.map((i) => i.id));
          const newItems = savedItems.length
            ? [...s.items.filter((i) => !savedIds.has(i.id)), ...savedItems]
            : s.items;

          return { pos: newPos, items: newItems };
        });

        get()._saveToHistory(`${existing ? "Edit" : "Tambah"} PO: ${savedPO.orderNo || savedPO.id}`);
        logAct({
          type:       existing ? "po_updated" : "po_created",
          title:      existing ? `PO Updated: ${savedPO.orderNo}` : `New PO: ${savedPO.orderNo || "Draft"}`,
          detail:     `${savedPO.company} · ${draftItems.length} item(s)`,
          entityId:   savedPO.id,
          entityType: "po",
        });

      } catch (error) {
        console.error("Failed to save PO:", error);
        get().toast("⚠️ Gagal menyimpan PO: " + error.message);
      }
    },

    updatePO: async (po) => {
      try {
        const updated = await collections.pos().update(po.id, cleanRecord(po));
        set((s) => ({ pos: s.pos.map((x) => (x.id === po.id ? updated : x)) }));
        logAct({ type: "po_updated", title: `PO Updated: ${po.orderNo}`, detail: po.company, entityId: po.id, entityType: "po" });
      } catch (error) {
        console.error("Failed to update PO:", error);
        get().toast("⚠️ Gagal update PO: " + error.message);
      }
    },

    /* ── Delete ──────────────────────────────────────────────────── */

    deletePO: async (id) => {
      try {
        const po = get().pos.find((p) => p.id === id);
        get()._saveToHistory(`Hapus PO: ${po?.orderNo || id}`);

        const itemIds = get().items.filter((i) => i.poId === id).map((i) => i.id);
        const doIds   = get().dos.filter((d) => d.poId === id).map((d) => d.id);

        // Delete PO, items, and DOs concurrently
        const [poResult, itemsResult, dosResult] = await Promise.all([
          collections.pos().delete(id).then(() => ({ ok: true })).catch((e) => ({ ok: false, error: e })),
          itemIds.length ? batchDelete(collections.items(), itemIds, 30) : Promise.resolve({ failed: [] }),
          doIds.length   ? batchDelete(collections.dos(),   doIds,   30) : Promise.resolve({ failed: [] }),
        ]);

        if (!poResult.ok)              throw new Error("Gagal hapus PO: " + poResult.error?.message);
        if (itemsResult.failed.length) throw new Error(`Gagal hapus ${itemsResult.failed.length} item`);
        if (dosResult.failed.length)   throw new Error(`Gagal hapus ${dosResult.failed.length} DO`);

        set((s) => ({
          pos:   s.pos.filter((x) => x.id !== id),
          items: s.items.filter((i) => i.poId !== id),
          dos:   s.dos.filter((d) => d.poId !== id),
        }));
        logAct({ type: "po_deleted", title: `PO Deleted: ${po?.orderNo || id}`, detail: `Incl. ${itemIds.length} items`, entityId: id, entityType: "po" });

      } catch (error) {
        console.error("Failed to delete PO:", error);
        get().toast(pbError(error, "hapus PO"));
        throw error; // re-throw so bulkDelete can aggregate failures
      }
    },

    /* ── Bulk Operations ─────────────────────────────────────────── */

    bulkDeletePOs: async (ids) => {
      if (!ids?.length) return;
      try {
        get()._saveToHistory(`Hapus ${ids.length} PO (Bulk)`);
        get()._unsubscribeRealtime(); // avoid event storm during bulk op

        const response = await pb.send("/api/bulk-delete", { method: "POST", body: { ids } });

        if (!response.success) throw new Error(response.error || "Gagal hapus PO massal");

        const idSet = new Set(ids);
        set((s) => ({
          pos:   s.pos.filter((p) => !idSet.has(p.id)),
          items: s.items.filter((i) => !idSet.has(i.poId)),
          dos:   s.dos.filter((d) => !idSet.has(d.poId)),
        }));
        get().toast(`✓ ${ids.length} PO berhasil dihapus.`);

      } catch (error) {
        console.error("Failed to bulk delete POs:", error);
        get().toast(pbError(error, "hapus massal PO"));
      } finally {
        get()._subscribeToRealtime(); // always re-enable
      }
    },

    bulkImportPOs: async (payload) => {
      if (!payload?.pos?.length) return;
      try {
        get().toast(`🔄 Mengimpor ${payload.pos.length} PO...`);
        get()._unsubscribeRealtime(); // avoid event storm during bulk op

        const response = await pb.send("/api/bulk-import", { method: "POST", body: payload });

        if (!response.success) throw new Error(response.error || "Gagal import data");

        // Re-fetch everything so local state matches server
        await get().init();
        get().toast(`✓ Berhasil import ${response.createdPOs} PO dan ${response.createdItems} item.`);

      } catch (error) {
        console.error("Failed to bulk import:", error);
        get().toast("⚠️ Gagal import massal: " + error.message);
        get()._subscribeToRealtime(); // re-enable on error (init() does it on success)
        throw error;
      }
    },
  };
}
