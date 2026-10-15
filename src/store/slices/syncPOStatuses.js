/**
 * syncPOStatuses — pure status-sync function between POs and their items.
 *
 * WHY THIS EXISTS:
 *   PO status and item statuses must stay consistent. For example:
 *   - If a PO is marked "paid", all its items become "paid"
 *   - If all items reach "delivered", the PO becomes "delivered"
 *   - If only some items are delivered, the PO becomes "partial_del"
 *
 * This is a PURE FUNCTION — no side effects, no DB calls.
 * It only mutates copies, never the originals.
 * Called inside Zustand set() after any item or PO change.
 *
 * @param {Array} pos   - Current PO array
 * @param {Array} items - Current item array (already updated)
 * @returns {{ pos: Array, items: Array, changedPos: Array }}
 *   - pos/items: updated arrays
 *   - changedPos: POs whose status changed (caller persists them to DB)
 */

import { STATUS_RANK } from "../../lib/constants";

export function syncPOStatuses(pos, items) {
  const newPos   = [...pos];
  const newItems = [...items];
  const changedPos = [];

  // Build O(1) lookup maps so we don't do nested loops
  const itemsByPoId  = new Map(); // poId → item[]
  const itemIndexMap = new Map(); // itemId → index in newItems

  newItems.forEach((item, idx) => {
    if (!itemsByPoId.has(item.poId)) itemsByPoId.set(item.poId, []);
    itemsByPoId.get(item.poId).push(item);
    itemIndexMap.set(item.id, idx);
  });

  newPos.forEach((po, poIdx) => {
    const poItems = itemsByPoId.get(po.id) || [];
    if (!poItems.length) return;

    // ── PO → Item Cascade ─────────────────────────────────────────────
    // When a PO reaches a terminal status, push that status down to items
    // that haven't reached it yet (e.g. marking PO "paid" pays all items).
    const cascadeStatuses = ["paid", "delivered", "invoiced", "cancelled"];
    if (cascadeStatuses.includes(po.status)) {
      poItems.forEach((item) => {
        const poRank   = STATUS_RANK[po.status] || 0;
        const itemRank = STATUS_RANK[item.status] || 0;
        if (item.status !== po.status && poRank > itemRank) {
          const itemIdx = itemIndexMap.get(item.id);
          newItems[itemIdx] = { ...newItems[itemIdx], status: po.status };
          item.status = po.status; // keep local ref in sync
        }
      });
    }

    // ── Item → PO Sync ────────────────────────────────────────────────
    // Compute what the PO status *should* be based on its items.
    const statuses = poItems.map((i) => i.status);
    const allSame  = statuses.length > 0 &&
      statuses.every((s) => s === statuses[0] && s !== "pending" && s !== "ordered");

    let targetPoStatus = po.status;

    if (allSame) {
      // All items share the same terminal status → PO matches
      // Exception: "ordered" maps to "confirmed" at the PO level
      targetPoStatus = statuses[0] === "ordered" ? "confirmed" : statuses[0];
    } else {
      // Mixed statuses → compute partial/aggregate PO status
      const hasPaid = statuses.some((s) => s === "paid");
      const hasInv  = statuses.some((s) => ["invoiced", "paid"].includes(s));
      const hasDel  = statuses.some((s) => ["delivered", "partial", "invoiced", "paid"].includes(s));
      const hasOrd  = statuses.some((s) => s === "ordered");

      if (hasPaid)     targetPoStatus = "partial_pay";
      else if (hasInv) targetPoStatus = "invoiced";
      else if (hasDel) targetPoStatus = "partial_del";
      else if (hasOrd) targetPoStatus = "confirmed";
    }

    if (targetPoStatus !== po.status) {
      newPos[poIdx] = { ...newPos[poIdx], status: targetPoStatus };
      changedPos.push(newPos[poIdx]);
    }
  });

  return { pos: newPos, items: newItems, changedPos };
}
