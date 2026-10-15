/**
 * POTableRow — Renders a single PO row (and its expanded detail row).
 *
 * Extracted from POList so the main component only handles layout.
 * The expanded detail row renders POExpandedRow which contains the full
 * line-item table, DO list, and inline editing for a given PO.
 */

import { Fragment } from "react";
import { Btn, Ico, IC, SPill } from "../../components/ui";
import { POExpandedRow } from "../../components/po";
import {
  calcPOTotals, isOverdue, isIncompletePO,
  fmtDate, fmtShort, getPOZone, getPOProgress,
  diffDays, agingColor, agingBg, uid, today,
} from "../../lib/helpers";
import { INIT_PO_STATUS } from "../../lib/constants";
import { stickyL, stickyR } from "../../lib/tableStyles";

const tdCls = "py-0.5 px-1.5 border-b border-border-default text-[11px] align-middle";

/** Shows delivery / invoice / paid progress badges for a PO. */
function POProgress({ poId, items }) {
  const { n, del, inv, paid } = getPOProgress(poId, items);
  if (!n) return null;
  const delCls  = del === n
    ? "text-green border-green-mid bg-green-soft"
    : del > 0
    ? "text-amber border-[#a7f3d0] bg-green-soft"
    : "text-text-muted border-border-default bg-bg-app";
  const invCls  = inv  > 0
    ? "text-brand border-brand-mid bg-brand-soft"
    : "text-text-muted border-border-default bg-bg-app";
  const paidCls = paid === n
    ? "text-purple border-[#c4b5fd] bg-purple-soft"
    : paid > 0
    ? "text-purple border-[#ddd6fe] bg-purple-soft"
    : "text-text-muted border-border-default bg-bg-app";
  return (
    <div className="flex gap-[3px] mt-[2px] flex-wrap">
      <span title={`Terkirim: ${del}/${n} item`} className={`text-[9px] font-semibold rounded-[3px] py-px px-[5px] border ${delCls}`}>🚚 {del}/{n}</span>
      <span title={`Invoice: ${inv}/${n} item`}  className={`text-[9px] font-semibold rounded-[3px] py-px px-[5px] border ${invCls}`}>📄 {inv}/{n}</span>
      <span title={`Paid: ${paid}/${n} item`}    className={`text-[9px] font-semibold rounded-[3px] py-px px-[5px] border ${paidCls}`}>✓ {paid}/{n}</span>
    </div>
  );
}

export function POTableRow({
  po, idx,
  items, dos, suppliers, zoneTypes, settings, hsDB,
  bulkSel, setBulkSel,
  exp, setExp,
  updatePO, updateItem, addItem, deleteItem, addPO, deletePO, addSupplier, saveDO, deleteDO,
  toast, ask,
  setEditPO, setShowForm, setDoTarget,
}) {
  const tots       = calcPOTotals(po, items);
  const over       = isOverdue(po, items, settings.overdueDays);
  const isExp      = exp === po.id;
  const poDosCount = dos.filter((d) => d.poId === po.id).length;
  const cellBg     = bulkSel.has(po.id) ? "bg-[#eff6ff]" : idx % 2 === 0 ? "bg-white" : "bg-surface-alt";
  const rowBg      = bulkSel.has(po.id) ? "bg-[#eff6ff]" : idx % 2 === 0 ? "bg-white" : "bg-surface-alt";
  const agingDays  = po.status !== "paid" && po.status !== "cancelled" ? diffDays(po.orderDate) : -1;

  return (
    <Fragment>
      {/* ── Main row ── */}
      <tr
        id={"po-row-" + po.id}
        className={`cursor-pointer ${rowBg}`}
        onClick={() => setExp((v) => v === po.id ? null : po.id)}
      >
        {/* Checkbox */}
        <td className={`${tdCls} ${stickyL} ${cellBg}`} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={bulkSel.has(po.id)}
            onChange={(e) => {
              const s = new Set(bulkSel);
              e.target.checked ? s.add(po.id) : s.delete(po.id);
              setBulkSel(s);
            }}
          />
        </td>

        {/* PO Number + badges */}
        <td className={`${tdCls} font-bold`}>
          <div className="flex items-center gap-1.5">
            <Ico d={isExp ? IC.chevD : IC.chevR} size={12} color="var(--color-text-muted)" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span
                  className="text-[11px] font-bold text-text-primary truncate block"
                  title={po.orderNo}
                >
                  {po.orderNo}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(po.orderNo || "").then(() => toast("✓ No. PO disalin"));
                  }}
                  className="bg-transparent border-none cursor-pointer p-[1px_3px] text-text-muted inline-flex"
                >
                  <Ico d={IC.copy} size={10} color="var(--color-text-muted)" />
                </button>
              </div>
              {po.quoteRef    && <div className="text-[9px] text-text-muted truncate max-w-[180px] hover:overflow-visible hover:whitespace-normal" title={po.quoteRef}>{po.quoteRef}</div>}
              {poDosCount > 0 && <div className="text-[9px] text-brand mt-px">📋 {poDosCount} DO</div>}
            </div>
            {over                     && <Ico d={IC.warn} size={12} color="var(--color-amber)" title="Overdue" />}
            {po.priority === "urgent" && <Ico d={IC.fire} size={12} color="var(--color-red)"   title="Urgent" />}
            {isIncompletePO(po)       && (
              <span className="inline-flex items-center gap-0.5 px-[5px] py-px rounded bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] text-[9px] font-bold" title="PO tidak lengkap">
                ⚠ Incomplete
              </span>
            )}
          </div>
        </td>

        {/* Company */}
        <td className={`${tdCls} truncate cursor-help`} title={po.company}>
          {po.company}
        </td>

        {/* Order date */}
        <td className={`${tdCls} whitespace-nowrap font-mono`}>{fmtDate(po.orderDate)}</td>

        {/* Status pill (click-to-change) */}
        <td className={tdCls} onClick={(e) => e.stopPropagation()}>
          <SPill
            micro
            value={po.status}
            onChange={(v) => {
              // If changing to delivered, offer to cascade to all items
              if (v === "delivered" && items.some((i) => i.poId === po.id && i.status !== "delivered")) {
                ask(
                  `Ubah semua item di PO ini menjadi Delivered?`,
                  () => {
                    updatePO({ ...po, status: v });
                    items.filter((i) => i.poId === po.id).forEach((i) => updateItem({ ...i, status: "delivered" }));
                    toast("✓ PO dan semua Item diubah ke Delivered");
                  },
                  { confirmLabel: "Ya, Ubah Semua" }
                );
              } else {
                updatePO({ ...po, status: v });
              }
            }}
            cfg={INIT_PO_STATUS}
          />
        </td>

        {/* Priority */}
        <td className={tdCls}>
          <span className={`text-[10px] font-semibold capitalize ${po.priority === "urgent" ? "text-red" : "text-text-primary"}`}>
            {po.priority === "urgent" ? "🔥 " : ""}{po.priority}
          </span>
        </td>

        {/* Item count + progress */}
        <td className={tdCls}>
          <div className="text-xs font-bold text-brand">{items.filter((i) => i.poId === po.id).length} item</div>
          <POProgress poId={po.id} items={items} />
        </td>

        {/* Total */}
        <td className={`${tdCls} font-mono font-bold whitespace-nowrap text-right`}>{fmtShort(tots.total)}</td>

        {/* Zone */}
        <td className={`${tdCls} truncate text-text-secondary`}>{getPOZone(po.id, items)}</td>

        {/* Aging badge */}
        <td className={`${tdCls} text-right`}>
          {agingDays >= 0
            ? (
              <span
                className="text-[11px] font-bold px-[7px] py-0.5 rounded-[5px] whitespace-nowrap"
                style={{ color: agingColor(agingDays), background: agingBg(agingDays) }}
              >
                {agingDays}h
              </span>
            ) : (
              <span className="text-[10px] text-text-muted">–</span>
            )
          }
        </td>

        {/* Notes */}
        <td className={`${tdCls} truncate text-[10px] text-text-muted`} title={po.notes}>
          {po.notes || "–"}
        </td>

        {/* Action buttons */}
        <td className={`${tdCls} ${stickyR} ${cellBg} !p-[4px_12px] w-[120px]`} onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-[6px] justify-end items-center">
            <Btn size="sm" variant="ghost" title="Edit PO" className="!p-0 w-[24px] h-[24px] justify-center"
              onClick={() => { setEditPO(po); setShowForm(true); }}
            >
              <Ico d={IC.edit} size={11} />
            </Btn>
            <Btn size="sm" variant="ghost" title="Buat DO" className="!p-0 w-[24px] h-[24px] justify-center"
              onClick={() => setDoTarget({ po, preSelect: new Set() })}
            >
              <Ico d={IC.truck} size={11} color="var(--color-brand)" />
            </Btn>
            <Btn size="sm" variant="ghost" title="Duplikat PO" className="!p-0 w-[24px] h-[24px] justify-center"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const nPOId = uid();
                  const nPO   = { ...po, id: nPOId, orderNo: `COPY-${po.orderNo}`, orderDate: today(), status: "draft", createdAt: today() };
                  const nItms = items
                    .filter((i) => i.poId === po.id)
                    .map((i) => ({ ...i, id: uid(), poId: nPOId, status: "ordered", doNos: [], deliveryDate: "", invoiceNo: "" }));
                  await addPO(nPO, nItms);
                  toast("✓ PO diduplikat");
                } catch (err) {
                  toast("✗ Gagal menduplikat PO");
                  console.error(err);
                }
              }}
            >
              <Ico d={IC.copy} size={11} />
            </Btn>
            <Btn size="sm" variant="danger" title="Hapus PO" className="!p-0 w-[24px] h-[24px] justify-center"
              onClick={() => ask(
                `Hapus PO "${po.orderNo}" beserta ${items.filter((i) => i.poId === po.id).length} item?`,
                () => deletePO(po.id),
                { danger: true, confirmLabel: "Ya, Hapus" }
              )}
            >
              <Ico d={IC.trash} size={11} />
            </Btn>
          </div>
        </td>
      </tr>

      {/* ── Expanded detail row ── */}
      {isExp && (
        <tr>
          <td colSpan={12} className="p-0 border-b border-border-default bg-surface-alt/30">
            <POExpandedRow
              po={po} items={items} suppliers={suppliers} dos={dos}
              zoneTypes={zoneTypes} settings={settings} hsDB={hsDB}
              onUpdateItem={updateItem}
              onUpdatePO={updatePO}
              onAddItem={addItem}
              onConfirmDelete={(ids, cb) =>
                ask(
                  `Hapus ${ids.length} item?`,
                  () => { ids.forEach((id) => deleteItem(id)); cb(); },
                  { danger: true, confirmLabel: "Ya, Hapus" }
                )
              }
              onOpenDO={(p, sel) => setDoTarget({ po: p, preSelect: sel })}
              onAddSupplier={addSupplier}
              onDeleteDO={deleteDO}
            />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
