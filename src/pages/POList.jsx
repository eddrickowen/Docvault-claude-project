import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { Btn, Ico, IC, Modal, SPill, FIn, FSel } from "../components/ui";
import { Pagination, DateRangeFilter, NumberRangeFilter, TextFilter, ColFilter, InlineCell, CopyTSVButton, ImportWizard, DataTableToolbar, DataTableHeader } from "../components/shared";
import { ItemForm, POForm, DOGeneratorModal, DOPrintTemplate, SupplierFormModal, BulkEditModal } from "../components/forms";
import { useConfirm, useDataTable } from "../hooks";
import { usePOStore } from "../store/usePOStore";
import {
  uid, today, diffDays, fmtDate, fmtShort, fmt, calcPOTotals, getPOProgress, getPOZone, getQtyDel,
  isOverdue, isIncompletePO, agingColor, agingBg,
  parseSmartDate, parseIDR, mapPOSt, mapItemSt,
  exportCSV, copyTSV, applyDateFilter, applyNumFilter, applyTextFilter,
  itemNet, itemMargin, itemBuy
} from "../lib/helpers";
import { INIT_PO_STATUS, ITEM_STATUS, PAGE_SIZE, mkItem, VENDOR_NAME, DEFAULT_EXCEL_ITEM_COLS, DEFAULT_EXCEL_PO_COLS } from "../lib/constants";

/* ── Class constants ── */
const thCls   = "py-[7px] px-2 text-[10px] font-bold text-text-secondary text-left whitespace-nowrap border-b border-border-default uppercase tracking-[.02em] bg-surface-alt cursor-pointer select-none";
const tdCls   = "py-1.5 px-2 border-b border-border-default text-[11px] align-middle";
const stickyL = "sticky left-0 z-[1] shadow-[3px_0_6px_rgba(0,0,0,0.05)]";
const stickyR = "sticky right-0 z-[1] shadow-[-3px_0_6px_rgba(0,0,0,0.05)]";
const doThCls = "py-[5px] px-[10px] text-[9px] font-bold text-text-secondary text-left border-b border-border-default uppercase";

/* ── DODetailPanel (internal) ── */
function DODetailPanel({ dos, poId, po, items, onDeleteDO }) {
  const poDos = (dos || []).filter((d) => d.poId === poId);
  const [printDO, setPrintDO] = useState(null);

  if (!poDos.length) return <span className="text-[11px] text-text-muted">Belum ada DO</span>;

  return (
    <>
      {printDO && (
        <>
          <DOPrintTemplate
            doData={printDO}
            po={po}
            items={items}
            vendorName={VENDOR_NAME}
          />
          <Modal
            open
            onClose={() => setPrintDO(null)}
            title={`Preview Surat Jalan ${printDO.doNo}`}
            wide
          >
            <div className="text-[11px] text-text-muted mb-3">
              Layout DO akan ikut tercetak ketika Anda membuka dialog print (Ctrl+P).
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setPrintDO(null)}>
                Tutup Preview
              </Btn>
              <Btn
                variant="blue"
                onClick={() => {
                  window.print();
                }}
              >
                <Ico d={IC.print} size={12} /> Buka Dialog Print
              </Btn>
            </div>
          </Modal>
        </>
      )}
      <div className="flex flex-col gap-1.5">
        {poDos.map((d) => {
          const driver = d.fieldValues?.driverName;
          const plate  = d.fieldValues?.vehiclePlate;
          return (
            <div key={d.id} className="bg-surface border border-border-default rounded-[7px] overflow-hidden">
              <div className="flex items-center gap-2.5 py-2 px-3 bg-brand-soft border-b border-brand-mid">
                <Ico d={IC.truck} size={13} color="var(--color-brand)" />
                <span className="font-mono font-bold text-xs text-brand">{d.doNo}</span>
                <span className="text-[10px] text-text-secondary">Dibuat: {fmtDate(d.createdAt)}</span>
                {d.deliveryDate && d.deliveryDate !== d.createdAt && (
                  <span className="text-[10px] text-text-secondary">· Kirim: {fmtDate(d.deliveryDate)}</span>
                )}
                {driver && (
                  <span className="text-[10px] text-text-muted">🚗 {driver}{plate ? ` · ${plate}` : ""}</span>
                )}
                <div className="ml-auto flex gap-1.5">
                  <Btn size="sm" variant="blue" onClick={() => setPrintDO(d)}>
                    <Ico d={IC.print} size={10} /> Cetak
                  </Btn>
                  {onDeleteDO && (
                    <Btn size="sm" variant="danger" onClick={() => onDeleteDO(d.id)}>
                      <Ico d={IC.trash} size={10} /> Hapus
                    </Btn>
                  )}
                </div>
              </div>
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-alt">
                    {["Item", "Qty Kirim", "HS Code", "Catatan"].map((h) => (
                      <th key={h} className={doThCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(d.lines || []).map((line) => {
                    const item = items.find((i) => i.id === line.itemId);
                    return (
                      <tr key={line.itemId} className="border-b border-border-default">
                        <td className="py-1.5 px-[10px] text-[11px] font-semibold truncate max-w-[180px] hover:overflow-visible hover:whitespace-normal" title={item?.itemName || line.itemId}>{item?.itemName || line.itemId}</td>
                        <td className="py-1.5 px-[10px] text-[11px] font-mono font-bold text-brand">{line.qtyDelivered} {item?.unit || ""}</td>
                        <td className="py-1.5 px-[10px] text-[10px] font-mono text-text-secondary">{line.hsCode || "–"}</td>
                        <td className="py-1.5 px-[10px] text-[10px] text-text-muted truncate max-w-[120px] hover:overflow-visible hover:whitespace-normal" title={line.notes || ""}>{line.notes || "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── ExpandedRow (internal) ── */
function ExpandedRow({ po, items, suppliers, dos, zoneTypes, settings, hsDB = [], onUpdateItem, onAddItem, onOpenDO, onAddSupplier, onConfirmDelete, onDeleteDO }) {
  const { toast } = usePOStore();
  const poItems = items.filter((i) => i.poId === po.id);
  const [showAdd,   setShowAdd]   = useState(false);
  const [showSupForm, setShowSupForm] = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [doTab,     setDoTab]     = useState(false);
  const tots    = calcPOTotals(po, items);
  const poDos   = (dos || []).filter((d) => d.poId === po.id);
  const [bulkItems, setBulkItems] = useState(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const toggleBulkItem = (id) => {
    const s = new Set(bulkItems);
    s.has(id) ? s.delete(id) : s.add(id);
    setBulkItems(s);
  };

  const handleBulkCopyItems = () => {
    const cols = (settings?.excelItemCols || DEFAULT_EXCEL_ITEM_COLS).filter(c => c.enabled);
    const headers = cols.map(c => c.label);
    const rows = [];
    bulkItems.forEach(id => {
      const i = items.find(x => x.id === id);
      if (!i) return;
      rows.push(cols.map(({ key }) => {
        switch (key) {
          case "itemName": return i.itemName || "";
          case "qty": return i.qty;
          case "unit": return i.unit || "";
          case "unitPrice": return i.unitPrice || 0;
          case "net": return itemNet(i);
          case "buy": return itemBuy(i);
          case "margin": { const m = itemMargin(i); return m ?? "-"; }
          case "status": return ITEM_STATUS[i.status]?.label || i.status || "";
          case "deliveryDate": return i.deliveryDate || "";
          case "invoiceNo": return i.invoiceNo || "";
          case "doNos": return (i.doNos || []).join(";");
          case "zoneType": return po.zoneType || i.zoneType || "";
          case "poNo": return po?.orderNo || "";
          case "company": return po?.company || "";
          case "hsCode": return i.hsCode || "";
          case "desc": return i.desc || "";
          default: return "";
        }
      }));
    });
    copyTSV(headers, rows, () => {
      toast(`✓ ${bulkItems.size} Item disalin!`);
      // Keeping items selected
    });
  };
  
  return (
    <div className="py-4 px-5 bg-[#fafcff] border-t border-border-default">
      {/* Summary bar */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="flex gap-3.5 text-[11px] text-text-secondary flex-wrap">
          <span>Ex PPN: <strong className="text-text-primary">{fmt(tots.exPPN)}</strong></span>
          <span>PPN: <strong className="text-text-primary">{fmt(tots.ppn)}</strong></span>
          <span>Total: <strong className="text-brand text-[13px]">{fmt(tots.total)}</strong></span>
          {po.folder && (
            <a href={po.folder} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[11px] text-brand bg-brand-soft border border-brand-mid rounded-[5px] px-2 py-px no-underline font-semibold">
              📁 Drive
            </a>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {bulkItems.size > 0 && (
            <>
              <select className="border border-border-default bg-surface rounded-[5px] text-xs px-2 py-1 font-semibold text-text-primary cursor-pointer hover:border-brand-mid transition-colors focus:outline-none" onChange={(e) => {
                 if(!e.target.value) return;
                 bulkItems.forEach(id => {
                   const i = items.find(x => x.id === id);
                   if (i) onUpdateItem({ ...i, status: e.target.value });
                 });
                 toast("✓ Status Item diupdate");
                 e.target.value = "";
              }}>
                <option value="">Ubah Status...</option>
                {Object.entries(ITEM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <Btn size="sm" variant="blue" onClick={handleBulkCopyItems}>
                <Ico d={IC.copy} size={10} /> Copy {bulkItems.size} Item
              </Btn>
              <Btn size="sm" variant="blue" className="!px-3" onClick={() => setShowBulkEdit(true)}>
                <Ico d={IC.edit} size={11} /> Edit
              </Btn>
              <Btn size="sm" variant="danger" onClick={() => { if (bulkItems.size > 0) { onConfirmDelete([...bulkItems], () => setBulkItems(new Set())); } }}>
                <Ico d={IC.trash} size={10} /> Hapus {bulkItems.size} Item
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setBulkItems(new Set())}><Ico d={IC.close} size={10} /></Btn>
            </>
          )}
          <Btn size="sm" variant={doTab ? "blue" : "ghost"} onClick={() => setDoTab((v) => !v)}>
            <Ico d={IC.truck} size={11} color={doTab ? "var(--color-brand)" : "var(--color-text-secondary)"} /> DO ({poDos.length})
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => onOpenDO(po, bulkItems)}><Ico d={IC.plus} size={11} /> Buat DO</Btn>
          <Btn size="sm" variant="blue" onClick={() => setShowAdd(true)}><Ico d={IC.plus} size={11} /> Item</Btn>
        </div>
      </div>

      {doTab && (
        <div className="mb-3.5">
          <DODetailPanel dos={dos} poId={po.id} po={po} items={items} onDeleteDO={onDeleteDO} />
        </div>
      )}

      {!poItems.length && (
        <div className="py-3.5 text-center text-text-muted text-xs bg-surface-alt rounded-md border border-dashed border-border-strong">Belum ada item.</div>
      )}

      {poItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className={`${thCls} w-8 ${stickyL} bg-surface-alt z-[2]`}>
                  <input type="checkbox"
                    checked={poItems.length > 0 && poItems.every((i) => bulkItems.has(i.id))}
                    onChange={(e) => {
                      const s = new Set(bulkItems);
                      poItems.forEach((i) => e.target.checked ? s.add(i.id) : s.delete(i.id));
                      setBulkItems(s);
                    }}
                  />
                </th>
                {["Item", "Qty", "Harga Jual", "Net", "Supplier Utama", "Margin", "Status", "Delivery", "Invoice", "Zone", "DO"].map((h) => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
                <th className={`${thCls} w-[60px] ${stickyR} bg-surface-alt z-[2]`} />
              </tr>
            </thead>
            <tbody>
              {poItems.map((item, i) => {
                const main    = (item.supplierAssignments || []).find((a) => a.role === "main");
                const mainSup = suppliers.find((s) => s.id === main?.supplierId);
                const mg      = itemMargin(item);
                const net     = itemNet(item);
                const qDel    = getQtyDel(item.id, dos);
                const itemDOs = (dos || []).filter((d) => (d.lines || []).some((l) => l.itemId === item.id));
                const rowBg   = bulkItems.has(item.id) ? "bg-[#eff6ff]" : i % 2 === 0 ? "bg-white" : "bg-surface-alt";
                const mgCls   = mg === null ? "text-text-muted" : mg >= 0 ? "text-green" : "text-red";
                const qDelCls = qDel >= item.qty ? "text-green" : "text-amber";
                return (
                  <tr key={item.id} className={`border-b border-border-default ${rowBg}`}>
                    <td className={`${tdCls} ${stickyL} ${rowBg}`} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={bulkItems.has(item.id)} onChange={() => toggleBulkItem(item.id)} />
                    </td>
                    <td className={tdCls} title={item.itemName}>
                      <div className="font-semibold line-clamp-3 min-w-[120px] max-w-[200px] break-words whitespace-normal leading-snug">
                        {item.itemName}
                        {(item.supplierAssignments || []).length > 1 && (
                          <span className="ml-1 text-[9px] text-text-muted inline-block">+{(item.supplierAssignments || []).length - 1}</span>
                        )}
                      </div>
                    </td>
                    <td className={`${tdCls} font-mono`}>
                      <div className="flex items-center gap-1">
                        <span>{item.qty}</span>
                        <span className="text-text-secondary text-[10px]">{item.unit}</span>
                      </div>
                    </td>
                    <td className={`${tdCls} font-mono whitespace-nowrap`}>{fmt(item.unitPrice)}</td>
                    <td className={`${tdCls} font-mono font-semibold text-brand whitespace-nowrap`}>{fmt(net)}</td>
                    <td className={`${tdCls} truncate max-w-[120px]`} title={mainSup?.name || ""}>
                      {mainSup
                        ? <span className="text-[11px] text-text-primary">{mainSup.name}</span>
                        : <span className="text-[11px] text-text-muted italic">Belum diset</span>
                      }
                    </td>
                    <td className={`${tdCls} font-mono font-semibold whitespace-nowrap ${mgCls}`}>
                      {mg === null ? "–" : fmt(mg)}
                    </td>
                    <td className={tdCls}>
                      <SPill value={item.status} onChange={(v) => onUpdateItem({ ...item, status: v })} cfg={ITEM_STATUS} mini />
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <InlineCell value={item.deliveryDate} onSave={(v) => onUpdateItem({ ...item, deliveryDate: v })} isDate placeholder="Pilih" />
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <div className="max-w-[120px] whitespace-normal break-words line-clamp-2">
                        <InlineCell value={item.invoiceNo} onSave={(v) => onUpdateItem({ ...item, invoiceNo: v })} mono placeholder="INV..." />
                      </div>
                    </td>
                    <td className={`${tdCls} truncate max-w-[110px]`} title={item.zoneType || po.zoneType || ""}>
                      <InlineCell 
                        value={item.zoneType || po.zoneType || ""} 
                        onSave={(v) => onUpdateItem({ ...item, zoneType: v })} 
                        select 
                        opts={(zoneTypes || []).map(z => ({ v: typeof z === 'object' ? z.name : z, l: typeof z === 'object' ? z.name : z }))} 
                        placeholder="Pilih Zona..." 
                      />
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-col gap-0.5">
                        {itemDOs.map((d) => {
                          const line = d.lines.find((l) => l.itemId === item.id);
                          return (
                            <div key={d.id} className="flex gap-1 items-center">
                              <span className="text-[9px] font-mono text-brand bg-brand-soft rounded-[3px] px-1 whitespace-nowrap">{d.doNo}</span>
                              <span className="text-[9px] text-text-muted">{line?.qtyDelivered}{item.unit ? ` ${item.unit}` : ""}</span>
                            </div>
                          );
                        })}
                        {!itemDOs.length && <span className="text-[9px] text-text-muted">–</span>}
                        {qDel > 0 && <span className={`text-[9px] font-bold ${qDelCls}`}>{qDel}/{item.qty}</span>}
                      </div>
                    </td>
                    <td className={`${tdCls} ${stickyR} ${rowBg}`}>
                      <div className="flex gap-[3px]">
                        <Btn size="sm" variant="ghost" className="!p-0 w-[24px] h-[24px] justify-center" onClick={() => setEditItem(item)}><Ico d={IC.edit} size={10} /></Btn>
                        <Btn size="sm" variant="danger" className="!p-0 w-[24px] h-[24px] justify-center" onClick={() => onConfirmDelete([item.id], () => {})}><Ico d={IC.trash} size={10} /></Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-brand-soft border-t border-brand-mid">
                <td colSpan={2} className={`${tdCls} font-bold text-[11px] text-text-secondary`}>TOTAL</td>
                <td className={`${tdCls} font-mono font-bold`}>{poItems.reduce((s, i) => s + (Number(i.qty) || 0), 0)}</td>
                <td className={tdCls} />
                <td className={`${tdCls} font-mono font-bold text-brand`}>{fmt(poItems.reduce((s, i) => s + itemNet(i), 0))}</td>
                <td className={tdCls} />
                <td className={`${tdCls} font-mono font-bold text-green`}>{fmt(poItems.reduce((s, i) => { const m = itemMargin(i); return s + (m || 0); }, 0))}</td>
                <td colSpan={6} className={tdCls} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal open onClose={() => setShowAdd(false)} title="Tambah Item" wide>
          <ItemForm poId={po.id} zoneTypes={zoneTypes} suppliers={suppliers} dos={dos} hsDB={hsDB}
            onAddSupplier={onAddSupplier}
            onSave={(item) => { onAddItem(item); setShowAdd(false); }}
            onClose={() => setShowAdd(false)}
          />
        </Modal>
      )}
      {editItem && (
        <Modal open onClose={() => setEditItem(null)} title="Edit Item" wide>
          <ItemForm initial={editItem} poId={po.id} zoneTypes={zoneTypes} suppliers={suppliers} dos={dos} hsDB={hsDB}
            onAddSupplier={onAddSupplier}
            onSave={(item) => { onUpdateItem(item); setEditItem(null); }}
            onClose={() => setEditItem(null)}
          />
        </Modal>
      )}

      {showSupForm && (
        <SupplierFormModal
          onSave={(s) => { onAddSupplier(s); setShowSupForm(false); toast("✓ Supplier ditambahkan"); }}
          onClose={() => setShowSupForm(false)}
        />
      )}

      {showBulkEdit && (
        <BulkEditModal
          items={[...bulkItems].map(id => items.find(i => i.id === id)).filter(Boolean)}
          suppliers={suppliers}
          onAddSupplier={onAddSupplier}
          zoneTypes={zoneTypes.map(z => typeof z === 'object' ? z.name : z)}
          onClose={() => setShowBulkEdit(false)}
          onSave={(payload) => {
            [...bulkItems].forEach((id) => {
              const item = items.find((i) => i.id === id);
              if (!item) return;
              const n = { ...item };
              if ("zoneType" in payload) n.zoneType = payload.zoneType;
              if ("deliveryDate" in payload) n.deliveryDate = payload.deliveryDate;
              if ("invoiceNo" in payload) n.invoiceNo = payload.invoiceNo;
              if ("doNo" in payload) n.doNos = [...new Set([...(n.doNos || []), payload.doNo])];
              if ("supplierAssignments" in payload) {
                let updatedAssigns = [...(n.supplierAssignments || [])];
                payload.supplierAssignments.forEach(newA => {
                  if (newA.role === "main") {
                    updatedAssigns = updatedAssigns.filter(a => a.role !== "main");
                  }
                  updatedAssigns = updatedAssigns.filter(a => a.supplierId !== newA.supplierId);
                  const itemPrices = newA.prices ? newA.prices[id] : { pricePerUnit: 0, shippingTotal: 0 };
                  updatedAssigns.push({ 
                    id: uid(), 
                    supplierId: newA.supplierId, 
                    role: newA.role, 
                    link: newA.link, 
                    notes: newA.notes,
                    pricePerUnit: itemPrices?.pricePerUnit || 0,
                    shippingTotal: itemPrices?.shippingTotal || 0
                  });
                });
                n.supplierAssignments = updatedAssigns;
              }
              onUpdateItem(n);
            });
            setShowBulkEdit(false);
            toast(`✓ Update massal diterapkan ke ${bulkItems.size} item`);
          }}
        />
      )}
    </div>
  );
}

/* ── POList (exported) ── */
export function POList() {
  const {
    pos, items, suppliers, dos, companies, zoneTypes, settings, hsDB,
    addPO, updatePO, deletePO, addItem, updateItem, deleteItem,
    addSupplier, addCompany, saveDO, deleteDO, toast,
    jumpTargetPOId, setJumpTargetPO,
  } = usePOStore();

  const {
    search, setSearch, page, setPage, perPage, setPerPage,
    colF, setColF, dateF, setDateF, numF, setNumF, textF, setTextF,
    sort, toggleSort, bulkSel, setBulkSel, clearBulk,
    hasFilters, resetFilters, getPaged
  } = useDataTable("orderDate", "desc", PAGE_SIZE);

  const [exp,        setExp]        = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [editPO,     setEditPO]     = useState(null);
  const [doTarget,   setDoTarget]   = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [importData, setImportData] = useState(null);
  const csvRef = useRef();
  const { ask, ConfirmModal } = useConfirm();

  const sortedFiltered = useMemo(() => {
    let r = pos.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!(p.orderNo?.toLowerCase().includes(q) || p.company?.toLowerCase().includes(q) || p.quoteRef?.toLowerCase().includes(q) || p.notes?.toLowerCase().includes(q))) return false;
      }
      for (const [col, s] of Object.entries(colF)) {
        if (!s || !s.size) continue;
        let v = "";
        if (col === "status")   v = p.status;
        else if (col === "company")  v = p.company;
        else if (col === "priority") v = p.priority;
        else if (col === "zone")     v = getPOZone(p.id, items);
        else if (col === "items") {
          const { n, del, inv, paid } = getPOProgress(p.id, items);
          if (!n)          v = "no_items";
          else if (paid === n) v = "all_paid";
          else if (inv  === n) v = "all_invoiced";
          else if (del  === n) v = "all_delivered";
          else if (del   > 0)  v = "partial_del";
          else                 v = "not_delivered";
        }
        if (!s.has(v)) return false;
      }
      if (dateF.orderDate && !applyDateFilter(p.orderDate, dateF.orderDate)) return false;
      if (numF.total      && !applyNumFilter(calcPOTotals(p, items).total, numF.total)) return false;
      if (textF.orderNo   && !applyTextFilter(p.orderNo, textF.orderNo)) return false;
      return true;
    });
    return [...r].sort((a, b) => {
      let av = a[sort.col] ?? "", bv = b[sort.col] ?? "";
      if (sort.col === "total") { av = calcPOTotals(a, items).total; bv = calcPOTotals(b, items).total; }
      if (sort.col === "items") { av = items.filter((i) => i.poId === a.id).length; bv = items.filter((i) => i.poId === b.id).length; }
      const d = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? d : -d;
    });
  }, [pos, items, search, sort, colF, dateF, numF, textF]);

  const paged = getPaged(sortedFiltered);

  // Handle cross-page jump-to-PO (from Dashboard/Items/Supplier pages)
  useEffect(() => {
    if (!jumpTargetPOId) return;
    const idx = sortedFiltered.findIndex((p) => p.id === jumpTargetPOId);
    if (idx === -1) {
      setJumpTargetPO(null);
      return;
    }
    const per =
      perPage === "All" ? (sortedFiltered.length || 1) : Number(perPage) || PAGE_SIZE;
    const targetPage = Math.floor(idx / per) + 1;
    setPage(targetPage);

    // After pagination applies, scroll to row and highlight
    setTimeout(() => {
      const el = document.getElementById("po-row-" + jumpTargetPOId);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.classList.add("row-hl");
        setTimeout(() => el.classList.remove("row-hl"), 1800);
      }
      setJumpTargetPO(null);
    }, 200);
  }, [jumpTargetPOId, sortedFiltered, perPage, setPage, setJumpTargetPO]);

  const POProgress = ({ poId }) => {
    const { n, del, inv, paid } = getPOProgress(poId, items);
    if (!n) return null;
    const delCls  = del  === n ? "text-green border-green-mid bg-green-soft" : del  > 0 ? "text-amber border-[#a7f3d0] bg-green-soft" : "text-text-muted border-border-default bg-bg-app";
    const invCls  = inv  >  0  ? "text-brand border-brand-mid bg-brand-soft" : "text-text-muted border-border-default bg-bg-app";
    const paidCls = paid === n ? "text-purple border-[#c4b5fd] bg-purple-soft" : paid > 0 ? "text-purple border-[#ddd6fe] bg-purple-soft" : "text-text-muted border-border-default bg-bg-app";
    return (
      <div className="flex gap-[3px] mt-[3px] flex-wrap">
        <span title={`Terkirim: ${del}/${n} item`} className={`text-[9px] font-semibold rounded-[3px] py-px px-[5px] border ${delCls}`}>🚚 {del}/{n}</span>
        <span title={`Invoice: ${inv}/${n} item`}  className={`text-[9px] font-semibold rounded-[3px] py-px px-[5px] border ${invCls}`}>📄 {inv}/{n}</span>
        <span title={`Paid: ${paid}/${n} item`}    className={`text-[9px] font-semibold rounded-[3px] py-px px-[5px] border ${paidCls}`}>✓ {paid}/{n}</span>
      </div>
    );
  };

  const handleCSV = (e) => {
    const file = e.target.files[0]; if (!file) return; setCsvLoading(true);
    const fileExt = file.name.endsWith('.tsv') ? 'tsv' : 'csv';
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportData({ rawText: ev.target.result, fileExt });
      setCsvLoading(false); 
      e.target.value = "";
    };
    reader.onerror = () => { toast("✗ Gagal membaca file"); setCsvLoading(false); e.target.value = ""; };
    reader.readAsText(file);
  };

  const processImportedData = (mappedRows) => {
    try {
      if (!mappedRows || !mappedRows.length) throw new Error("Tidak ada data valid yang dipilih");
      
      const newPOs = []; const newItems = [];
      const unknownComps = new Set();
      
      mappedRows.forEach((row) => {
        const orderNo = row.orderNo?.trim();
        const company = row.company?.trim();
        if (!orderNo || !company) return;

        if (!companies.some(c => (c.name || "").toLowerCase() === company.toLowerCase())) {
          unknownComps.add(company);
        }

        let po = newPOs.find((p) => p.orderNo === orderNo);
        if (!po) {
          po = { id: "po" + uid(), quoteRef: row.quoteRef || "", orderNo, company, orderDate: parseSmartDate(row.orderDate || "") || today(), prNo: "", notes: row.desc || "", folder: "", status: mapPOSt(row.poStatus), priority: "normal", totalLocked: false, manualExPPN: parseIDR(row.poExPPN || 0), manualPPN: parseIDR(row.poPPN || 0) };
          if (po.manualExPPN > 0) po.totalLocked = true;
          newPOs.push(po);
        }
        
        const iName = row.itemName?.trim();
        if (iName) {
          const up      = parseIDR(row.unitPrice || 0);
          const qty     = parseFloat(row.qty || 1) || 1;
          const disc    = parseIDR(row.discount || 0);
          const discPct = parseFloat(row.discountPct || 0);
          newItems.push(mkItem({ id: "item" + uid(), poId: po.id, itemName: iName, desc: row.desc || "", qty, unit: row.unit || "pcs", unitPrice: up, discount: discPct > 0 ? Math.round(up * qty * discPct / 100) : disc, discountPct: discPct, status: mapItemSt(row.itemStatus || ""), deliveryDate: parseSmartDate(row.deliveryDate || ""), invoiceNo: row.invoiceNo || "", zoneType: row.zoneType || "", hsCode: row.hsCode || "" }));
        }
      });

      const finalizeImport = () => {
        unknownComps.forEach(name => addCompany({ id: "comp" + uid(), name, address: "", phone: "", notes: "" }));
        newPOs.forEach((p) => addPO(p, newItems.filter((i) => i.poId === p.id)));
        toast(`✓ Import selesai: ${newPOs.length} PO, ${newItems.length} item`);
        setImportData(null);
      };

      if (unknownComps.size > 0) {
        ask(`Ada ${unknownComps.size} Perusahaan baru (${[...unknownComps].slice(0, 3).join(", ")}${unknownComps.size > 3 ? "..." : ""}) yang belum terdaftar. Tambahkan otomatis dan lanjutkan import?`, finalizeImport, { confirmLabel: "Ya, Proses Import" });
      } else {
        finalizeImport();
      }
    } catch (err) { toast("✗ Import gagal: " + err.message); setImportData(null); }
  };

  const bulkSetStatus = (st) => {
    bulkSel.forEach((id) => { const p = pos.find((x) => x.id === id); if (p) updatePO({ ...p, status: st }); });
    toast(`Status ${bulkSel.size} PO diubah`);
  };
  const bulkDelete = () => {
    ask(`Hapus ${bulkSel.size} PO beserta seluruh item dan DO-nya?`, () => {
      [...bulkSel].forEach((id) => deletePO(id));
      toast(`✓ ${bulkSel.size} PO dihapus`);
      setBulkSel(new Set());
    }, { danger: true, confirmLabel: "Ya, Hapus Semua" });
  };

  const handleExportCSV = () => {
    const h = ["No PO", "Quote Ref", "Perusahaan", "Tgl Order", "Status PO", "PR No", "Ex PPN", "PPN", "Total", "Item Terkirim", "Item Invoiced", "Item Paid", "Total Item"];
    const r = sortedFiltered.map((p) => {
      const t = calcPOTotals(p, items); const pr = getPOProgress(p.id, items);
      return [p.orderNo, p.quoteRef, p.company, p.orderDate, INIT_PO_STATUS[p.status]?.label || p.status, p.prNo, t.exPPN, t.ppn, t.total, `${pr.del}/${pr.n}`, `${pr.inv}/${pr.n}`, `${pr.paid}/${pr.n}`, pr.n];
    });
    exportCSV(h, r, `PO_export_${today()}.csv`);
  };

  const getCopyTSVData = () => {
    const h = ["No PO", "Quote Ref", "Perusahaan", "Tgl Order", "Status PO", "Total", "Terkirim", "Invoiced", "Paid"];
    const r = sortedFiltered.map((p) => {
      const t = calcPOTotals(p, items); const pr = getPOProgress(p.id, items);
      return [p.orderNo, p.quoteRef, p.company, p.orderDate, INIT_PO_STATUS[p.status]?.label || p.status, t.total, `${pr.del}/${pr.n}`, `${pr.inv}/${pr.n}`, `${pr.paid}/${pr.n}`];
    });
    return { headers: h, rows: r };
  };

  const handleBulkCopyPOs = () => {
    const cols = (settings?.excelPOCols || DEFAULT_EXCEL_PO_COLS).filter(c => c.enabled);
    const headers = cols.map(c => c.label);
    const rows = [];
    bulkSel.forEach(id => {
      const po = pos.find(p => p.id === id);
      if (!po) return;
      const t = calcPOTotals(po, items);
      const pr = getPOProgress(po.id, items);
      rows.push(cols.map(({ key }) => {
        switch(key) {
          case "orderNo": return po.orderNo || "";
          case "quoteRef": return po.quoteRef || "";
          case "company": return po.company || "";
          case "orderDate": return po.orderDate || "";
          case "status": return INIT_PO_STATUS[po.status]?.label || po.status || "";
          case "total": return t.total;
          case "totalItems": return pr.n;
          case "delivered": return `${pr.del}/${pr.n}`;
          case "invoiced": return `${pr.inv}/${pr.n}`;
          case "paid": return `${pr.paid}/${pr.n}`;
          case "priority": return po.priority || "";
          case "zoneType": return getPOZone(po.id, items);
          default: return "";
        }
      }));
    });
    copyTSV(headers, rows, () => {
      toast(`✓ ${bulkSel.size} PO disalin!`);
    });
  };

  const COLS = [
    { col: "orderNo",  label: "No PO/Order",    ft: "text", fk: "orderNo" },
    { col: "company",  label: "Perusahaan",      ft: "col" },
    { col: "orderDate",label: "Tgl Order",       ft: "date", fk: "orderDate" },
    { col: "status",   label: "Status",          ft: "col" },
    { col: "priority", label: "Prior.",          ft: "col" },
    { col: "items",    label: "Items/Progress",  ft: "col" },
    { col: "total",    label: "Total",           ft: "num",  fk: "total" },
    { col: "zone",     label: "Zone",            ft: "col",  keyFn: (p) => getPOZone(p.id, items), labelFn: (p) => getPOZone(p.id, items) },
    { col: "aging",    label: "Aging",           ft: null,   noSort: true },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <ConfirmModal />

      <DataTableToolbar
        search={search} setSearch={setSearch} setPage={setPage}
        hasFilters={hasFilters} resetFilters={resetFilters}
        bulkSelCount={bulkSel.size}
        searchPlaceholder="Cari PO, perusahaan, ref..."
        totalCount={sortedFiltered.length}
        labelPostfix="PO"
        primaryAction={
          <Btn id="btn-new-po" size="sm" variant="primary" onClick={() => { setEditPO(null); setShowForm(true); }}>
            <Ico d={IC.plus} size={11} /> PO Baru
          </Btn>
        }
        bulkActions={
          <>
            <FSel value="" onChange={(v) => { if (v) bulkSetStatus(v); }} placeholder="Set Status..."
              options={Object.entries(INIT_PO_STATUS).map(([k, v]) => ({ v: k, l: v.label }))}
              className="!py-0.5 !px-1.5 w-[130px]"
            />
            <Btn size="sm" variant="danger" onClick={bulkDelete}><Ico d={IC.trash} size={10} /> Hapus</Btn>
            <Btn size="sm" variant="blue" className="!px-3" onClick={handleBulkCopyPOs}>
              <Ico d={IC.copy} size={11} /> Copy {bulkSel.size} Terpilih
            </Btn>
            <Btn size="sm" variant="ghost" onClick={clearBulk}><Ico d={IC.close} size={10} /></Btn>
          </>
        }
        exportActions={
          <>
            <Btn size="sm" variant="secondary" onClick={handleExportCSV}><Ico d={IC.dl} size={11} /> CSV</Btn>
            <CopyTSVButton filename={`PO_export_${today()}.tsv`} data={getCopyTSVData} size="sm" variant="ghost" />
            <Btn size="sm" variant="secondary" disabled={csvLoading} onClick={() => csvRef.current?.click()}>
              <Ico d={IC.plus} size={11} />{csvLoading ? " Loading..." : " Import CSV / TSV"}
            </Btn>
            <input ref={csvRef} type="file" accept=".csv,.tsv" onChange={handleCSV} className="hidden" />
          </>
        }
      />

      {/* ── Table ── */}
      <div className="overflow-x-auto flex-1 w-full">
        <table className="w-full border-collapse min-w-[1100px]">
          <DataTableHeader
            thCls={thCls}
            cols={COLS} rows={pos}
            paged={paged} bulkSel={bulkSel} setBulkSel={setBulkSel}
            sort={sort} toggleSort={toggleSort}
            colF={colF} setColF={setColF} dateF={dateF} setDateF={setDateF}
            numF={numF} setNumF={setNumF} textF={textF} setTextF={setTextF}
          />
          <tbody>
            {!paged.length && (
              <tr><td colSpan={10} className="py-10 text-center text-text-muted text-[13px]">Tidak ada PO.</td></tr>
            )}
            {paged.map((po, i) => {
              const tots       = calcPOTotals(po, items);
              const over       = isOverdue(po, settings.overdueDays);
              const isExp      = exp === po.id;
              const poDosCount = dos.filter((d) => d.poId === po.id).length;
              const cellBg     = bulkSel.has(po.id) ? "bg-[#eff6ff]" : i % 2 === 0 ? "bg-white" : "bg-surface-alt";
              const rowBg      = bulkSel.has(po.id) ? "bg-[#eff6ff]" : i % 2 === 0 ? "bg-white" : "bg-surface-alt";
              const agingDays  = po.status !== "paid" && po.status !== "cancelled" ? diffDays(po.orderDate) : -1;
              const priBg      = po.priority === "urgent" ? "text-red" : "text-text-primary";
              return (
                <Fragment key={po.id}>
                  <tr
                    id={"po-row-" + po.id}
                    key={po.id}
                    className={`cursor-pointer ${rowBg}`}
                    onClick={() => setExp((v) => v === po.id ? null : po.id)}
                  >
                    <td className={`${tdCls} ${stickyL} ${cellBg}`} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={bulkSel.has(po.id)} onChange={(e) => {
                        const s = new Set(bulkSel);
                        e.target.checked ? s.add(po.id) : s.delete(po.id);
                        setBulkSel(s);
                      }} />
                    </td>
                    <td className={`${tdCls} font-bold`}>
                      <div className="flex items-center gap-1.5">
                        <Ico d={isExp ? IC.chevD : IC.chevR} size={12} color="var(--color-text-muted)" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-text-primary truncate max-w-[160px] hover:overflow-visible hover:whitespace-normal" title={po.orderNo}>{po.orderNo}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(po.orderNo || "").then(() => toast("✓ No. PO disalin")); }}
                              className="bg-transparent border-none cursor-pointer p-[1px_3px] text-text-muted inline-flex"
                            >
                              <Ico d={IC.copy} size={10} color="var(--color-text-muted)" />
                            </button>
                          </div>
                          {po.quoteRef    && <div className="text-[9px] text-text-muted truncate max-w-[180px] hover:overflow-visible hover:whitespace-normal" title={po.quoteRef}>{po.quoteRef}</div>}
                          {poDosCount > 0 && <div className="text-[9px] text-brand mt-px">📋 {poDosCount} DO</div>}
                        </div>
                        {over               && <Ico d={IC.warn} size={12} color="var(--color-amber)" title="Overdue" />}
                        {po.priority === "urgent" && <Ico d={IC.fire} size={12} color="var(--color-red)" title="Urgent" />}
                        {isIncompletePO(po) && <span className="inline-flex items-center gap-0.5 px-[5px] py-px rounded bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] text-[9px] font-bold" title="PO tidak lengkap">⚠ Incomplete</span>}
                      </div>
                    </td>
                    <td className={`${tdCls} truncate max-w-[170px] hover:overflow-visible hover:whitespace-normal cursor-help`} title={po.company}>{po.company}</td>
                    <td className={`${tdCls} whitespace-nowrap font-mono text-[11px]`}>{fmtDate(po.orderDate)}</td>
                    <td className={tdCls} onClick={(e) => e.stopPropagation()}>
                      <SPill value={po.status} onChange={(v) => {
                        if (v === "delivered" && items.some(i => i.poId === po.id && i.status !== "delivered")) {
                          ask(`Ubah semua item di PO ini menjadi Delivered?`, () => {
                            updatePO({ ...po, status: v });
                            items.filter(i => i.poId === po.id).forEach(i => updateItem({ ...i, status: "delivered" }));
                            toast("✓ PO dan semua Item diubah ke Delivered");
                          }, { confirmLabel: "Ya, Ubah Semua" });
                        } else {
                          updatePO({ ...po, status: v });
                        }
                      }} cfg={INIT_PO_STATUS} />
                    </td>
                    <td className={tdCls}>
                      <span className={`text-[10px] font-semibold capitalize ${priBg}`}>
                        {po.priority === "urgent" ? "🔥 " : ""}{po.priority}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <div className="text-xs font-bold text-brand">{items.filter((i) => i.poId === po.id).length} item</div>
                      <POProgress poId={po.id} />
                    </td>
                    <td className={`${tdCls} font-mono font-bold whitespace-nowrap`}>{fmtShort(tots.total)}</td>
                    <td className={`${tdCls} text-[11px] text-text-secondary`}>{getPOZone(po.id, items)}</td>
                    <td className={tdCls} onClick={(e) => e.stopPropagation()}>
                      {agingDays >= 0
                        ? <span className="text-[11px] font-bold px-[7px] py-0.5 rounded-[5px] whitespace-nowrap" style={{ color: agingColor(agingDays), background: agingBg(agingDays) }}>{agingDays}h</span>
                        : <span className="text-[10px] text-text-muted">–</span>}
                    </td>
                    <td className={`${tdCls} ${stickyR} ${cellBg} !p-[4px_6px]`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-[3px] flex-wrap justify-end">
                        <Btn size="sm" variant="ghost" title="Edit PO" className="!p-0 w-[24px] h-[24px] justify-center" onClick={() => { setEditPO(po); setShowForm(true); }}>
                          <Ico d={IC.edit} size={11} />
                        </Btn>
                        <Btn size="sm" variant="ghost" title="Buat DO" className="!p-0 w-[24px] h-[24px] justify-center" onClick={() => setDoTarget({ po, preSelect: new Set() })}>
                          <Ico d={IC.truck} size={11} color="var(--color-brand)" />
                        </Btn>
                        <Btn size="sm" variant="ghost" title="Duplikat PO" className="!p-0 w-[24px] h-[24px] justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nid   = uid();
                            const nPO   = { ...po, id: nid, orderNo: "Order", orderDate: today(), status: "draft", createdAt: today() };
                            const nItms = items.filter((i) => i.poId === po.id).map((i) => ({ ...i, id: uid(), poId: nid, status: "ordered", doNos: [], deliveryDate: "", invoiceNo: "" }));
                            addPO(nPO, nItms);
                            toast("✓ PO diduplikat");
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
                  {isExp && (
                    <tr key={po.id + "_exp"}>
                      <td colSpan={11} className="p-0">
                        <ExpandedRow
                          po={po} items={items} suppliers={suppliers} dos={dos}
                          zoneTypes={zoneTypes} settings={settings} hsDB={hsDB}
                          onUpdateItem={updateItem}
                          onAddItem={addItem}
                          onConfirmDelete={(ids, cb) => ask(`Hapus ${ids.length} item?`, () => { ids.forEach((id) => deleteItem(id)); cb(); }, { danger: true, confirmLabel: "Ya, Hapus" })}
                          onOpenDO={(p, sel) => setDoTarget({ po: p, preSelect: sel })}
                          onAddSupplier={addSupplier}
                          onDeleteDO={deleteDO}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination 
        total={sortedFiltered.length} 
        page={page} 
        perPage={perPage} 
        onChange={setPage} 
        perPageOptions={[50, 100, 500, "All"]}
        onPerPageChange={setPerPage}
      />

      {importData && (
        <ImportWizard 
          rawText={importData.rawText} 
          fileExt={importData.fileExt} 
          onConfirm={processImportedData} 
          onCancel={() => setImportData(null)} 
        />
      )}

      {showForm && (
        <POForm
          initial={editPO} companies={companies} items={items} suppliers={suppliers}
          dos={dos} zoneTypes={zoneTypes} settings={settings} hsDB={hsDB}
          onAddSupplier={addSupplier}
          onSave={(po, draftItems) => { addPO(po, draftItems); setShowForm(false); toast(`✓ PO ${po.orderNo} disimpan`); }}
          onClose={() => setShowForm(false)}
        />
      )}
      {doTarget && (
        <DOGeneratorModal
          po={doTarget.po} preSelect={doTarget.preSelect} items={items} dos={dos} settings={settings}
          onClose={() => setDoTarget(null)}
          onSaveDO={(doObj) => { saveDO(doObj); toast(`✓ DO ${doObj.doNo} disimpan`); }}
        />
      )}
    </div>
  );
}
