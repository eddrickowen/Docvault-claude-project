import { memo } from "react";
import { Btn, Ico, IC, SPill } from "../ui";
import { InlineCell } from "./InlineCell";
import { fmt, fmtShort, itemNet, itemMargin, getQtyDel, fmtDate, diffDays, agingColor, agingBg } from "../../lib/helpers";
import { ITEM_STATUS } from "../../lib/constants";
import { usePOStore } from "../../store/usePOStore";

/**
 * ItemTableRow - Shared component for PO item rows.
 * Replaces duplicated logic in POList and AllItems.
 * Memoized to prevent unnecessary re-renders.
 */
export const ItemTableRow = memo(function ItemTableRow({
  item,
  po,
  subIdx,
  isSub = false,
  isSel = false,
  onToggleSel,
  onUpdate,
  onEdit,
  onDelete,
  onJumpPO,
  suppliers = [],
  dos = [],
  zoneTypes = [],
  stickyL = "",
  stickyR = "",
  tdCls = "py-1.5 px-2 border-b border-border-default text-[11px] align-middle",
  showBuyPrice = false,
}) {
  const products = usePOStore(s => s.products);
  const masterProduct = (products || []).find(p => p.name === item.itemName || p.sku === item.itemName);
  const mg = itemMargin(item);
  const net = itemNet(item);
  const qDel = getQtyDel(item.id, dos);
  const itemDOs = (dos || []).filter((d) => (d.lines || []).some((l) => l.itemId === item.id));

  const main = (item.supplierAssignments || []).find((a) => a.role === "main");
  const mainSup = suppliers.find((s) => s.id === main?.supplierId);

  const rowBg = isSel 
    ? "bg-[#eff6ff]" 
    : isSub 
      ? "bg-[#f8fafc] hover:bg-white" 
      : (subIdx % 2 === 0 ? "bg-white hover:bg-surface-alt" : "bg-surface-alt hover:bg-white");
  
  const mgCls = mg === null ? "text-text-muted" : mg >= 0 ? "text-green" : "text-red";
  const qDelCls = qDel >= item.qty ? "text-green" : "text-amber";

  return (
    <tr className={`${rowBg} transition-colors ${isSub ? "border-l-[3px] border-l-brand" : "border-b border-border-default"}`}>
      {/* Selection Column */}
      <td className={`${tdCls} ${stickyL} ${rowBg}`} onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={isSel} onChange={onToggleSel} />
      </td>

      {/* Item Name */}
      <td className={tdCls} title={item.itemName}>
        <div className={`font-semibold line-clamp-3 min-w-[120px] max-w-[200px] break-words whitespace-normal leading-snug ${isSub ? "text-[10px] text-text-secondary pl-2" : ""}`}>
          {item.itemName}
          {masterProduct ? (
            <div className={`text-[9px] mt-0.5 font-bold flex items-center gap-1 ${masterProduct.stockLevel <= (masterProduct.safetyStock || 0) ? "text-red" : "text-green"}`}>
               <span className="opacity-70">📦</span> Stock: {masterProduct.stockLevel} {masterProduct.uom}
            </div>
          ) : (
            <div className="text-[9px] mt-0.5 text-text-muted italic flex items-center gap-1">
              <span className="opacity-50">⚠️</span> Not in catalog
            </div>
          )}
          {!isSub && (item.supplierAssignments || []).length > 1 && (
            <span className="ml-1 text-[9px] text-text-muted inline-block">+{(item.supplierAssignments || []).length - 1}</span>
          )}
        </div>
      </td>

      {/* Qty & Unit */}
      <td className={`${tdCls} font-mono`}>
        <div className="flex items-center gap-1">
          <span>{item.qty}</span>
          <span className="text-text-secondary text-[10px]">{item.unit}</span>
        </div>
      </td>

      {/* Delivered Qty */}
      <td className={`${tdCls} font-mono`}>
        <span className={`font-bold ${qDelCls}`}>{qDel}</span>
        <span className="text-text-muted text-[10px]"> / {item.qty}</span>
      </td>

      {/* Buy Price (Conditional) */}
      {showBuyPrice && (
        <td className={`${tdCls} font-mono text-text-muted italic`}>
          {main?.pricePerUnit ? fmt(main.pricePerUnit) : "–"}
        </td>
      )}

      {/* Price Unit */}
      <td className={`${tdCls} font-mono whitespace-nowrap`}>{fmt(item.unitPrice)}</td>

      {/* Total Net */}
      <td className={`${tdCls} font-mono font-bold text-brand whitespace-nowrap`}>{fmt(net)}</td>

      {/* Main Supplier */}
      <td className={`${tdCls} truncate max-w-[120px]`} title={mainSup?.name || ""}>
        {mainSup
          ? <span className="text-[11px] text-text-primary">{mainSup.name}</span>
          : <span className="text-[11px] text-text-muted italic">Belum diset</span>
        }
      </td>

      {/* Margin */}
      <td className={`${tdCls} font-mono font-bold whitespace-nowrap ${mgCls}`}>
        {mg === null ? "–" : (isSub || !onJumpPO ? fmtShort(mg) : fmt(mg))}
      </td>

      {/* Status Pill */}
      <td className={`${tdCls} status-select-fix`} onClick={(e) => e.stopPropagation()}>
        <SPill value={item.status} onChange={(v) => onUpdate({ ...item, status: v })} cfg={ITEM_STATUS} mini />
      </td>

      {/* Delivery Date */}
      <td className={`${tdCls} whitespace-nowrap`}>
        <InlineCell value={item.deliveryDate} onSave={(v) => onUpdate({ ...item, deliveryDate: v })} isDate placeholder="–" />
      </td>

      {/* Invoice No */}
      <td className={tdCls} title={item.invoiceNo}>
        <div className="max-w-[120px] whitespace-normal break-words line-clamp-2">
          <InlineCell value={item.invoiceNo} onSave={(v) => onUpdate({ ...item, invoiceNo: v })} mono placeholder="INV..." />
        </div>
      </td>

      {/* Zone Type */}
      <td className={`${tdCls} truncate max-w-[110px]`} title={item.zoneType || po?.zoneType || ""}>
        <InlineCell
          value={item.zoneType || po?.zoneType || ""}
          onSave={(v) => onUpdate({ ...item, zoneType: v })}
          select
          opts={(zoneTypes || []).map(z => ({ v: typeof z === "object" ? z.name : z, l: typeof z === "object" ? z.name : z }))}
          placeholder="Pilih Zona..."
        />
      </td>

      {/* Aging (NEW: Matches AllItems header) */}
      <td className={`${tdCls} text-center`}>
        {po && !["paid", "cancelled"].includes(po.status) ? (
          (() => {
            const days = diffDays(po.orderDate);
            return days >= 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" 
                style={{ color: agingColor(days), background: agingBg(days) }}
              >
                {days}h
              </span>
            ) : "–";
          })()
        ) : "–"}
      </td>

      {/* Note */}
      <td className={tdCls} title={item.notes || ""}>
        <div className="max-w-[140px] whitespace-normal break-words line-clamp-2">
          <InlineCell 
            value={item.notes || ""} 
            onSave={(v) => onUpdate({ ...item, notes: v })} 
            placeholder="Catatan..." 
          />
        </div>
      </td>

      {/* PO Number (Optional, for AllItems) */}
      {onJumpPO && (
        <td className={tdCls} title={po?.orderNo || ""}>
          {po?.orderNo
            ? (
              <span
                className="font-mono text-brand cursor-pointer hover:underline"
                onClick={e => { e.stopPropagation(); onJumpPO(po.id); }}
              >
                {po.orderNo}
              </span>
            )
            : "–"}
        </td>
      )}

      {/* Company (Optional, for AllItems) */}
      {onJumpPO && (
        <td className={tdCls} title={po?.company || ""}>
          <div className="max-w-[160px] line-clamp-2 break-words whitespace-normal leading-tight">
            {po?.company || "–"}
          </div>
        </td>
      )}

      {/* DO Tags */}
      <td className={tdCls}>
        <div className="flex flex-col gap-0.5">
          {itemDOs.map((d) => {
            const line = d.lines.find((l) => l.itemId === item.id);
            return (
              <div key={d.id} className="flex flex-col">
                <span className="text-[9px] font-mono text-brand bg-brand-soft rounded-[3px] px-1 whitespace-nowrap">{d.doNo}</span>
                {onJumpPO && <span className="text-[8px] text-text-muted">{fmtDate(d.deliveryDate)} · {line?.qtyDelivered} {item.unit}</span>}
                {!onJumpPO && <span className="text-[9px] text-text-muted">{line?.qtyDelivered}{item.unit ? ` ${item.unit}` : ""}</span>}
              </div>
            );
          })}
          {!itemDOs.length && <span className="text-[9px] text-text-muted">–</span>}
          {!onJumpPO && qDel > 0 && <span className={`text-[9px] font-bold ${qDelCls}`}>{qDel}/{item.qty}</span>}
        </div>
      </td>

      {/* Action Buttons */}
      <td className={`${tdCls} ${stickyR} ${rowBg} !p-[4px_4px]`}>
        <div className="flex gap-1 justify-end items-center">
          {item.status !== "delivered" && (
            <Btn size="sm" variant="ghost" title="Mark Delivered" className="!p-0 w-[22px] h-[22px] justify-center" onClick={() => onUpdate({ ...item, status: "delivered" })}>
              <Ico d={IC.truck} size={11} color="var(--color-brand)" />
            </Btn>
          )}
          <Btn size="sm" variant="ghost" title="Edit Item" className="!p-0 w-[22px] h-[22px] justify-center" onClick={() => onEdit(item)}>
            <Ico d={IC.edit} size={10} />
          </Btn>
          <Btn size="sm" variant="danger" title="Hapus Item" className="!p-0 w-[22px] h-[22px] justify-center" onClick={() => onDelete(item)}>
            <Ico d={IC.trash} size={10} />
          </Btn>
        </div>
      </td>
    </tr>
  );
});
