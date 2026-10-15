/**
 * itemSlice — Line item CRUD operations.
 *
 * Methods:
 *   addItem(item)             — create or update a single item; syncs parent PO status
 *   updateItem(item)          — update item; syncs PO status + auto-adjusts product stock
 *   deleteItem(id)            — delete item; syncs parent PO status
 *
 * IMPORTANT — Status cascade:
 *   Every write calls syncPOStatuses() so the parent PO's status is always
 *   consistent with its items. Any PO whose status changed is persisted to DB
 *   in the background (fire-and-forget, won't block the UI).
 *
 * IMPORTANT — Automatic stock adjustment (updateItem only):
 *   When an item's status changes to/from "delivered", the matching product's
 *   stockLevel is adjusted automatically. Match is by itemName or SKU.
 */

import { collections, cleanRecord, pbError } from "../../lib/pocketbase";
import { logger } from "../../lib/logger";
import { logAct } from "../useActivityStore";
import { syncPOStatuses } from "./syncPOStatuses";

/** Persist changed POs to DB in the background after a status sync. */
function persistChangedPos(changedPos) {
  changedPos.forEach((po) =>
    collections.pos().update(po.id, cleanRecord(po))
      .catch((e) => console.error("Auto-sync PO status failed:", e))
  );
}

export function createItemSlice(set, get) {
  return {
    addItem: async (item) => {
      try {
        const existing = item.id && get().items.find((i) => i.id === item.id);
        const saved = existing
          ? await collections.items().update(item.id, cleanRecord(item))
          : await collections.items().create(cleanRecord(item));

        set((s) => {
          const newItems = s.items.find((x) => x.id === saved.id)
            ? s.items.map((x) => (x.id === saved.id ? saved : x))
            : [...s.items, saved];
          const synced = syncPOStatuses(s.pos, newItems);
          if (synced.changedPos.length) persistChangedPos(synced.changedPos);
          return { items: synced.items, pos: synced.pos };
        });

        logAct({
          type:       existing ? "item_updated" : "item_added",
          title:      existing ? `Item Updated: ${item.itemName}` : `Item Added: ${item.itemName}`,
          detail:     `Qty ${item.qty} ${item.unit} @ ${item.unitPrice}`,
          entityId:   saved.id,
          entityType: "item",
        });

      } catch (error) {
        console.error("Failed to add item:", error);
        get().toast("⚠️ Gagal menyimpan item: " + error.message);
      }
    },

    updateItem: async (item) => {
      try {
        const prev    = get().items.find((x) => x.id === item.id);
        const updated = await collections.items().update(item.id, cleanRecord(item));

        set((s) => {
          const newItems = s.items.map((x) => (x.id === item.id ? updated : x));
          const synced = syncPOStatuses(s.pos, newItems);
          if (synced.changedPos.length) persistChangedPos(synced.changedPos);
          return { items: synced.items, pos: synced.pos };
        });

        // ── Auto stock adjustment ─────────────────────────────────────
        // When delivery status changes, adjust the matching product's stock.
        // Match is attempted by itemName then by sku (best-effort).
        const statusChanged = prev?.status !== item.status;
        if (statusChanged) {
          const isDelivered  = item.status === "delivered";
          const wasDelivered = prev?.status === "delivered";

          if (isDelivered || wasDelivered) {
            const product = get().products.find(
              (p) => p.name === item.itemName || p.sku === item.sku
            );
            if (product) {
              const delta    = isDelivered ? (item.qty || 0) : -(prev.qty || 0);
              const newLevel = (product.stockLevel || 0) + delta;
              await collections.products().update(product.id, { stockLevel: newLevel });
              logAct({
                type:       "stock_adjusted",
                title:      `Inventory Auto-Sync: ${product.name}`,
                detail:     `Stock ${delta > 0 ? "+" : ""}${delta} ${product.uom} → status ${item.status}`,
                entityId:   product.id,
                entityType: "product",
              });
            }
          }
        }

        logAct({
          type:       statusChanged ? "item_status" : "item_updated",
          title:      statusChanged ? `Status: ${item.itemName} → ${item.status}` : `Item Updated: ${item.itemName}`,
          detail:     statusChanged ? `${prev?.status} → ${item.status}` : `Qty ${item.qty} ${item.unit}`,
          entityId:   item.id,
          entityType: "item",
        });

      } catch (error) {
        console.error("Failed to update item:", error);
        get().toast("⚠️ Gagal update item: " + error.message);
      }
    },

    deleteItem: async (id) => {
      try {
        const item = get().items.find((x) => x.id === id);
        await collections.items().delete(id);

        set((s) => {
          const newItems = s.items.filter((x) => x.id !== id);
          const synced = syncPOStatuses(s.pos, newItems);
          if (synced.changedPos.length) persistChangedPos(synced.changedPos);
          return { items: synced.items, pos: synced.pos };
        });

        logAct({
          type:       "item_deleted",
          title:      `Item Deleted: ${item?.itemName || id}`,
          entityId:   id,
          entityType: "item",
        });

      } catch (error) {
        console.error("Failed to delete item:", error);
        get().toast(pbError(error, "hapus item"));
      }
    },
  };
}
