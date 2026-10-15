/**
 * doSlice — Delivery Order (Surat Jalan) management.
 *
 * Methods:
 *   saveDO(doObj)   — create or update a DO; updates linked items' doNos, deliveryDate, and status
 *   deleteDO(doId)  — delete a DO; reverts linked items' delivery status if needed
 *
 * HOW DELIVERY STATUS WORKS:
 *   Each DO has a `lines` array: [{ itemId, qtyDelivered }].
 *   When a DO is saved/deleted, we sum all DOs' qtyDelivered for each item:
 *     - total >= item.qty  → item status = "delivered"
 *     - 0 < total < qty   → item status = "partial"
 *     - total = 0          → item status = "ordered" (reverted)
 *   After updating items, syncPOStatuses cascades to the parent PO.
 */

import { collections, cleanRecord, dbHelpers, pbError } from "../../lib/pocketbase";
import { logAct } from "../useActivityStore";
import { syncPOStatuses } from "./syncPOStatuses";

export function createDOSlice(set, get) {
  return {
    saveDO: async (doObj) => {
      try {
        // Upsert: match by ID first, then by doNo
        const existing = get().dos.find((d) => d.id === doObj.id || d.doNo === doObj.doNo);
        const savedDO = existing
          ? await collections.dos().update(existing.id, cleanRecord({ ...doObj, id: existing.id }))
          : await collections.dos().create(cleanRecord(doObj));

        // Update every item that appears in this DO's lines
        const allDos = [...get().dos, savedDO];
        await Promise.all(
          doObj.lines.map(async (line) => {
            const item = get().items.find((i) => i.id === line.itemId);
            if (!item) return;

            const newDoNos = [...new Set([...(item.doNos ?? []), doObj.doNo])];
            const deliveryDate = item.deliveryDate || doObj.deliveryDate;

            // Sum all delivered qty across all DOs for this item
            const totalDelivered = allDos.reduce(
              (sum, d) => sum + ((d.lines ?? []).find((l) => l.itemId === item.id)?.qtyDelivered ?? 0),
              0
            );
            const newStatus =
              totalDelivered >= item.qty ? "delivered" :
              totalDelivered > 0        ? "partial"    :
              item.status;

            return collections.items().update(item.id, { ...item, doNos: newDoNos, deliveryDate, status: newStatus });
          })
        );

        // Re-fetch items to get the authoritative DB state, then sync PO statuses
        const freshItems = await dbHelpers.getAll("items");
        const synced = syncPOStatuses(get().pos, freshItems);

        set((s) => ({
          dos: existing
            ? s.dos.map((d) => (d.id === existing.id ? savedDO : d))
            : [...s.dos, savedDO],
          items: freshItems,
          pos:   synced.pos,
        }));

        logAct({
          type:       "do_created",
          title:      `DO ${existing ? "Updated" : "Created"}: ${savedDO.doNo}`,
          detail:     `${doObj.lines.length} item(s)`,
          entityId:   savedDO.id,
          entityType: "do",
        });

      } catch (error) {
        console.error("Failed to save DO:", error);
        get().toast("⚠️ Gagal menyimpan DO: " + error.message);
      }
    },

    deleteDO: async (doId) => {
      try {
        const doObj = get().dos.find((d) => d.id === doId);
        if (!doObj) return;

        await collections.dos().delete(doId);

        // Revert delivery status for items that were in this DO
        const remainingDos = get().dos.filter((d) => d.id !== doId);
        await Promise.all(
          (doObj.lines ?? []).map(async (line) => {
            const item = get().items.find((i) => i.id === line.itemId);
            if (!item) return;

            const totalDelivered = remainingDos.reduce(
              (sum, d) => sum + ((d.lines ?? []).find((l) => l.itemId === item.id)?.qtyDelivered ?? 0),
              0
            );
            const newDoNos = (item.doNos ?? []).filter((n) => n !== doObj.doNo);

            // Only revert status if the item was in a delivery-related state
            let newStatus = item.status;
            if (["delivered", "partial"].includes(item.status)) {
              newStatus =
                totalDelivered >= item.qty ? "delivered" :
                totalDelivered > 0        ? "partial"    :
                "ordered";
            }

            return collections.items().update(item.id, { ...item, doNos: newDoNos, status: newStatus });
          })
        );

        const freshItems = await dbHelpers.getAll("items");
        const synced = syncPOStatuses(get().pos, freshItems);

        set((s) => ({
          dos:   s.dos.filter((d) => d.id !== doId),
          items: freshItems,
          pos:   synced.pos,
        }));

      } catch (error) {
        console.error("Failed to delete DO:", error);
        get().toast(pbError(error, "hapus DO"));
      }
    },
  };
}
