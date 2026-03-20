import { useState, useMemo, useEffect, Fragment } from "react";
import { Btn, Ico, IC, Modal, SPill, FIn, FSel } from "../components/ui";
import { Pagination, DateRangeFilter, NumberRangeFilter, TextFilter, ColFilter, InlineCell, CopyTSVButton, DataTableToolbar, DataTableHeader, ItemTableRow } from "../components/shared";
import { ItemForm, BulkEditModal } from "../components/forms";
import { useConfirm, useDataTable } from "../hooks";
import { usePOStore } from "../store/usePOStore";
import {
  itemNet, itemMargin, itemBuy, getQtyDel, fmtDate, fmtShort, fmt, today, uid,
  exportCSV, copyTSV, applyDateFilter, applyNumFilter, applyTextFilter,
} from "../lib/helpers";
import { fuzzySearchItems } from "../lib/fuzzySearch";
import { ITEM_STATUS, INIT_PO_STATUS, PAGE_SIZE, DEFAULT_EXCEL_ITEM_COLS } from "../lib/constants";

/* ── Class constants ── */
const thCls  = "py-1 px-1.5 text-[10px] font-bold text-text-secondary text-left whitespace-nowrap border-b border-border-default uppercase tracking-[.02em] bg-surface-alt cursor-pointer select-none";
const tdCls  = "py-0.5 px-1.5 border-b border-border-default text-[11px] align-middle";
const stickyL = "sticky left-0 z-[1] shadow-[3px_0_6px_rgba(0,0,0,0.05)]";
const stickyR = "sticky right-0 z-[1] shadow-[-3px_0_6px_rgba(0,0,0,0.05)]";

export function AllItems({ onJump }) {
  const { items, pos, suppliers, dos, zoneTypes, settings, hsDB, updateItem, deleteItem, addSupplier, toast } = usePOStore();

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") setBulkSel(new Set()); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const poById = useMemo(() => {
    const map = {};
    (pos || []).forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [pos]);

  const {
    search, setSearch, page, setPage, perPage, setPerPage,
    colF, setColF, dateF, setDateF, numF, setNumF, textF, setTextF,
    sort, toggleSort, bulkSel, setBulkSel, clearBulk,
    hasFilters, resetFilters, getPaged
  } = useDataTable("itemName", "asc", PAGE_SIZE);

  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [isGrouped,   setIsGrouped]   = useState(true);
  const [expGrp,      setExpGrp]      = useState(new Set());
  const { ask, ConfirmModal }   = useConfirm();

  // Auto-ungroup if filters are active
  useEffect(() => {
    if (hasFilters) setIsGrouped(false);
  }, [hasFilters]);

  const filtered = useMemo(() => {
    let r = items;
    if (search) {
      const cfg = settings?.itemSearchConfig || {};
      const keys = [];
      if (cfg.includeItemName !== false)    keys.push({ name: 'itemName', weight: 3 });
      if (cfg.includeDescription !== false) keys.push({ name: 'desc', weight: 1.5 });
      if (cfg.includeInvoice !== false)     keys.push({ name: 'invoiceNo', weight: 1 });
      if (cfg.includeDOs !== false)         keys.push({ name: 'doNos', weight: 1 });
      if (cfg.includeHSCode !== false)      keys.push({ name: 'hsCode', weight: 0.8 });
      if (cfg.includeZone !== false)        keys.push({ name: 'zoneType', weight: 0.5 });
      
      // For cross-referenced fields, we can use dot notation if Fuse supports it with a pre-mapped object,
      // but here we have a flat array of items. Fuse 6+ supports keys with 'getFn'.
      // However, to keep it simple and compatible, we'll just allow the library to handle the main fields.
      // If we need more, we'd need to passing a custom getFn to Fuse.
      
      r = fuzzySearchItems(items, search, settings.fuzzyThreshold, keys.length ? keys : undefined);
    }

    r = r.filter((i) => {
      for (const [col, s] of Object.entries(colF)) {
        if (!s || !s.size) continue;
        let v = "";
        if (col === "status")        v = i.status;
        else if (col === "zoneType") v = i.zoneType || "";
        else if (col === "unit")     v = i.unit;
        else if (col === "company")  v = poById[i.poId]?.company || "";
        if (!s.has(v)) return false;
      }
      if (dateF.deliveryDate && !applyDateFilter(i.deliveryDate, dateF.deliveryDate)) return false;
      if (numF.qty    && !applyNumFilter(Number(i.qty), numF.qty))    return false;
      if (numF.net    && !applyNumFilter(itemNet(i),    numF.net))     return false;
      if (numF.margin && !applyNumFilter(itemMargin(i), numF.margin))  return false;
      if (textF.itemName  && !applyTextFilter(i.itemName,  textF.itemName))  return false;
      if (textF.invoiceNo && !applyTextFilter(i.invoiceNo, textF.invoiceNo)) return false;
      if (textF.poNo      && !applyTextFilter(poById[i.poId]?.orderNo, textF.poNo)) return false;
      return true;
    });
    return [...r].sort((a, b) => {
      let av = a[sort.col] ?? "", bv = b[sort.col] ?? "";
      if (sort.col === "net")    { av = itemNet(a);    bv = itemNet(b); }
      if (sort.col === "margin") { av = itemMargin(a) ?? -Infinity; bv = itemMargin(b) ?? -Infinity; }
      const d = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? d : -d;
    });
  }, [items, pos, search, colF, dateF, numF, textF, sort]);

  const groupedList = useMemo(() => {
    if (!isGrouped) return filtered;

    // Group by itemName, tracking unique PO IDs
    const map = {};
    filtered.forEach(i => {
      const k = (i.itemName || "(Tanpa Nama)").trim().toUpperCase();
      if (!map[k]) {
        map[k] = { id: "GRP_" + k, itemName: i.itemName, items: [], poIds: new Set(), qty: 0, net: 0, margin: 0 };
      }
      map[k].items.push(i);
      map[k].poIds.add(i.poId);
      map[k].qty += Number(i.qty) || 0;
      map[k].net += itemNet(i);
      const m = itemMargin(i);
      if (m != null) map[k].margin += m;
    });

    // Only use group row when name appears in 2+ different POs; else render flat
    const result = [];
    Object.values(map).forEach(g => {
      if (g.poIds.size <= 1) {
        g.items.forEach(i => result.push(i));
      } else {
        result.push({ ...g, isGroupRow: true });
      }
    });

    if (sort.col) {
      result.sort((a, b) => {
        let vA = a[sort.col], vB = b[sort.col];
        if (vA == null) vA = ""; if (vB == null) vB = "";
        if (typeof vA === "string") return sort.dir === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
        return sort.dir === "asc" ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
      });
    }
    return result;
  }, [filtered, isGrouped, sort]);

  const paged = getPaged(groupedList);

  const handleBulkDelete = () => ask(`Hapus ${bulkSel.size} item terpilih?`, () => { [...bulkSel].forEach((id) => deleteItem(id)); setBulkSel(new Set()); }, { danger: true, confirmLabel: "Ya, Hapus" });
  const handleBulkStatus = (st) => { [...bulkSel].forEach((id) => { const item = items.find((i) => i.id === id); if (item) updateItem({ ...item, status: st }); }); toast("✓ Status Item diupdate"); };

  const getCols = () => (settings?.excelItemCols || DEFAULT_EXCEL_ITEM_COLS).filter((c) => c.enabled);
  const itemRow = (i, cols) => {
    const po = poById[i.poId];
    return cols.map(({ key }) => {
      switch (key) {
        case "itemName":     return i.itemName || "";
        case "qty":          return i.qty;
        case "unit":         return i.unit || "";
        case "unitPrice":    return i.unitPrice || 0;
        case "net":          return itemNet(i);
        case "buy":          return itemBuy(i);
        case "margin":       { const m = itemMargin(i); return m ?? "-"; }
        case "status":       return ITEM_STATUS[i.status]?.label || i.status || "";
        case "deliveryDate": return i.deliveryDate || "";
        case "invoiceNo":    return i.invoiceNo || "";
        case "doNos":        return (i.doNos || []).join(";");
        case "zoneType":     return i.zoneType || "";
        case "poNo":         return po?.orderNo || "";
        case "company":      return po?.company || "";
        case "hsCode":       return i.hsCode || "";
        case "desc":         return i.desc || "";
        default:             return "";
      }
    });
  };

  const handleBulkCopyItems = () => {
    const cols = (settings?.excelItemCols || DEFAULT_EXCEL_ITEM_COLS).filter(c => c.enabled);
    const headers = cols.map(c => c.label);
    const rows = [];
    bulkSel.forEach(id => {
      const i = items.find(x => x.id === id);
      if (!i) return;
      const po = poById[i.poId];
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
          case "zoneType": return po?.zoneType || i.zoneType || ""; // Assuming zoneType might come from PO if not on item
          case "poNo": return po?.orderNo || "";
          case "company": return po?.company || "";
          case "hsCode": return i.hsCode || "";
          case "desc": return i.desc || "";
          default: return "";
        }
      }));
    });
    copyTSV(headers, rows, () => {
      toast(`✓ ${bulkSel.size} Item disalin!`);
    });
  };

  const getCopyPerItem     = () => { const cols = getCols(); return { headers: cols.map((c) => c.label), rows: filtered.map((i) => itemRow(i, cols)) }; };
  const getCopyPerPO       = () => {
    const h = ["No PO","Perusahaan","Status","Total Item","Net Total","Margin Total"];
    const poMap = {};
    filtered.forEach((i) => { const po = pos.find((p) => p.id === i.poId); const k = po?.orderNo || i.poId; if (!poMap[k]) poMap[k] = { po, net: 0, margin: 0, count: 0 }; poMap[k].net += itemNet(i); const m = itemMargin(i); if (m != null) poMap[k].margin += m; poMap[k].count++; });
    return { headers: h, rows: Object.values(poMap).map(({ po, net, margin, count }) => [po?.orderNo||"–",po?.company||"–",INIT_PO_STATUS[po?.status]?.label||po?.status||"–",count,net,margin]) };
  };
  const getCopyPerSupplier = () => {
    const h = ["Supplier","Role","Item","Qty","Harga Beli/unit","Total Beli","PO","Perusahaan"];
    const rows = [];
    filtered.forEach((i) => { (i.supplierAssignments||[]).forEach((a) => { const sup = suppliers?.find((s) => s.id === a.supplierId); const po = pos.find((p) => p.id === i.poId); rows.push([sup?.name||"–",a.role,i.itemName,i.qty,a.pricePerUnit||0,(a.pricePerUnit||0)*(i.qty||0)+(a.shippingTotal||0),po?.orderNo||"–",po?.company||"–"]); }); });
    return { headers: h, rows };
  };

  const COLS = [
    { col: "itemName",    label: settings?.labelItemName || "Item",  ft: "text", fk: "itemName"     },
    { col: "qty",         label: "Qty",               ft: "num",  fk: "qty"          },
    { col: "delivered",   label: "Del.",              ft: null,   labelFn: (i) => {
        const d = getQtyDel(i.id, dos);
        return <span className={`font-bold ${d >= i.qty ? "text-green" : "text-amber"}`}>{d}</span>;
      }
    },
    { 
      col: "buyPriceEach", 
      label: "Harga Beli", 
      ft: null,
      labelFn: (i) => {
        const main = (i.supplierAssignments || []).find(a => a.role === "main");
        return main ? fmt(main.pricePerUnit) : "–";
      }
    },
    { col: "unitPrice",   label: "Harga Jual",        ft: null                       },
    { col: "net",         label: "Net",               ft: "num",  fk: "net"          },
    {
      col: "supplier",
      label: "Supplier Utama",
      ft: null,
      keyFn: (i) => {
        const mainSupplier = (i.supplierAssignments || []).find(a => a.role === "main");
        return mainSupplier ? suppliers?.find(s => s.id === mainSupplier.supplierId)?.name || "" : "";
      },
      labelFn: (i) => {
        const mainSupplier = (i.supplierAssignments || []).find(a => a.role === "main");
        const name = mainSupplier ? suppliers?.find(s => s.id === mainSupplier.supplierId)?.name : null;
        return name || "–";
      },
    },
    { col: "margin",      label: "Margin",            ft: "num",  fk: "margin"       },
    { col: "status",      label: "Status",            ft: "col",  labelFn: (i) => ITEM_STATUS[i.status]?.label||i.status },
    { col: "deliveryDate",label: "Delivery",          ft: "date", fk: "deliveryDate" },
    { col: "invoiceNo",   label: "Invoice",           ft: "text", fk: "invoiceNo"    },
    { col: "zoneType",    label: "Zone",              ft: "col"                      },
    { col: "notes",       label: "Note",              ft: "text", fk: "notes"        },
    {
      col: "poNo",
      label: "No PO",
      ft: "text",
      fk: "poNo",
      keyFn: (i) => poById[i.poId]?.orderNo || "",
      labelFn: (i) => poById[i.poId]?.orderNo || "–",
    },
    {
      col: "company",
      label: "Perusahaan",
      ft: "col",
      keyFn: (i) => poById[i.poId]?.company || "",
      labelFn: (i) => poById[i.poId]?.company || "–",
    },
    { col: "doNos",       label: "DO",                ft: null                       },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <ConfirmModal />

      <DataTableToolbar
        search={search} setSearch={setSearch} setPage={setPage}
        hasFilters={hasFilters} resetFilters={resetFilters}
        bulkSelCount={bulkSel.size}
        searchPlaceholder="Cari item, invoice, DO..."
        totalCount={filtered.length}
        labelPostfix="item"
        bulkActions={
          <>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary select-none cursor-pointer mr-2 py-1 px-2 hover:bg-surface-alt rounded border border-border-default">
              <input type="checkbox" checked={isGrouped} onChange={(e) => setIsGrouped(e.target.checked)} />
              Kelompokkan Item
            </label>
            <FSel value="" onChange={(v) => { if (v) handleBulkStatus(v); }} placeholder="Set Status..." options={Object.entries(ITEM_STATUS).map(([k, v]) => ({ v: k, l: v.label }))} className="!py-0.5 !px-1.5 w-[130px]" />
            <Btn size="sm" variant="danger" onClick={handleBulkDelete}><Ico d={IC.trash} size={10} /> Hapus</Btn>
            <Btn size="sm" variant="blue" className="!px-3" onClick={() => setShowBulkEdit(true)}><Ico d={IC.edit} size={11} /> Edit</Btn>
            <Btn size="sm" variant="blue" className="!px-3" onClick={handleBulkCopyItems}><Ico d={IC.copy} size={11} /> Copy {bulkSel.size} Terpilih</Btn>
            <Btn size="sm" variant="ghost" onClick={clearBulk}><Ico d={IC.close} size={10} /></Btn>
          </>
        }
        exportActions={
          <>
            <CopyTSVButton label="Copy" menuItems={[ { label: "Per Item (kolom terpilih)", getData: getCopyPerItem }, { label: "Per PO (ringkasan)", getData: getCopyPerPO }, { label: "Per Supplier", getData: getCopyPerSupplier } ]} />
            <Btn size="sm" variant="secondary" onClick={() => exportCSV(["Item","Qty","Unit","Harga","Net","Status","Delivery","Invoice","DO","Zone","PO"], filtered.map((i) => { const po = pos.find((p) => p.id === i.poId); return [i.itemName,i.qty,i.unit,i.unitPrice,itemNet(i),ITEM_STATUS[i.status]?.label||i.status,i.deliveryDate,i.invoiceNo,(i.doNos||[]).join(";"),i.zoneType,po?.orderNo||""]; }), `Items_${today()}.csv`)}><Ico d={IC.export} size={11} /> CSV</Btn>
          </>
        }
      />

      {/* Table */}
      <div className="overflow-x-auto flex-1 w-full">
        <table className="w-full border-collapse min-w-[1100px]">
          <DataTableHeader
            thCls={thCls}
            stickyL={stickyL}
            stickyR={stickyR}
            cols={COLS}
            rows={items}
            paged={paged}
            bulkSel={bulkSel}
            setBulkSel={setBulkSel}
            sort={sort}
            toggleSort={toggleSort}
            colF={colF}
            setColF={setColF}
            dateF={dateF}
            setDateF={setDateF}
            numF={numF}
            setNumF={setNumF}
            textF={textF}
            setTextF={setTextF}
            getRowIds={(row) => row.isGroupRow ? row.items.map((it) => it.id) : [row.id]}
          />
          <tbody>
            {!paged.length && <tr><td colSpan={15} className="py-16 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-soft border border-[#c4b5fd] flex items-center justify-center mb-1">
                  <Ico d={IC.box} size={22} color="var(--color-purple)" />
                </div>
                <div className="text-sm font-bold text-text-secondary">Tidak Ada Item</div>
                <div className="text-xs text-text-muted">Coba ubah filter atau kata kunci pencarian</div>
              </div>
            </td></tr>}
            {paged.map((rowItem, idx) => {
              /* ── renderItemRow defined first so group rows can call it ── */
              const renderItemRow = (item, subIdx, isSub = false) => {
                const po = poById[item.poId];
                return (
                  <ItemTableRow
                    key={item.id}
                    item={item}
                    po={po}
                    subIdx={subIdx}
                    isSub={isSub}
                    isSel={bulkSel.has(item.id)}
                    onToggleSel={() => { const s = new Set(bulkSel); s.has(item.id) ? s.delete(item.id) : s.add(item.id); setBulkSel(s); }}
                    onUpdate={updateItem}
                    onEdit={setEditItem}
                    onDelete={(it) => ask(`Hapus item "${it.itemName}"?`, () => deleteItem(it.id), { danger: true, confirmLabel: "Ya, Hapus" })}
                    onJumpPO={(id) => onJump?.("po", id)}
                    suppliers={suppliers}
                    dos={dos}
                    zoneTypes={zoneTypes}
                    stickyL={stickyL}
                    stickyR={stickyR}
                    showBuyPrice={true}
                  />
                );
              };

              /* ── Group row (same name, multiple POs) ── */
              if (rowItem.isGroupRow) {
                const g = rowItem;
                const isGExp = expGrp.has(g.id);
                const toggleGExp = () => { const ns = new Set(expGrp); isGExp ? ns.delete(g.id) : ns.add(g.id); setExpGrp(ns); };
                const allSel = g.items.every(it => bulkSel.has(it.id));
                const someSel = g.items.some(it => bulkSel.has(it.id));
                const grpBg = someSel ? "bg-[#e0f2fe]" : "bg-[#f0f4f8]";
                return (
                  <Fragment key={g.id}>
                    <tr className={`${grpBg} cursor-pointer border-b border-border-default hover:bg-brand-soft transition-colors`} onClick={toggleGExp}>
                      <td className={`${tdCls} ${stickyL} ${grpBg}`} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={allSel}
                          ref={el => { if (el) el.indeterminate = someSel && !allSel; }}
                          onChange={e => {
                            const ns = new Set(bulkSel);
                            g.items.forEach(it => e.target.checked ? ns.add(it.id) : ns.delete(it.id));
                            setBulkSel(ns);
                          }}
                        />
                      </td>
                      <td className={tdCls} colSpan={2}>
                        <div className="flex items-center gap-1.5 font-bold">
                          <Ico d={isGExp ? IC.chevD : IC.chevR} size={12} color="var(--color-brand)" />
                          <span className="line-clamp-2 max-w-[260px]">{g.itemName}</span>
                          <span className="text-[10px] font-normal text-text-muted bg-white border border-border-strong px-1.5 py-0.5 rounded ml-1">{g.items.length} PO</span>
                        </div>
                      </td>
                      <td className={`${tdCls} font-mono font-bold text-center`}>{g.qty}</td>
                      <td className={tdCls} colSpan={3}><span className="text-[10px] text-text-muted italic">Terbagi di {g.poIds.size} PO...</span></td>
                      <td className={`${tdCls} font-mono font-bold text-brand`}>{fmt(g.net)}</td>
                      <td className={tdCls} colSpan={6} />
                      <td className={`${tdCls} font-mono font-bold whitespace-nowrap ${Number(g.margin) >= 0 ? "text-green" : "text-red"}`}>{fmtShort(g.margin)}</td>
                      <td className={`${tdCls} ${stickyR} ${grpBg}`} />
                    </tr>
                    {isGExp && g.items.map((item, subIdx) => renderItemRow(item, subIdx, true))}
                  </Fragment>
                );
              }

              /* ── Normal flat row ── */
              return renderItemRow(rowItem, idx, false);
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        total={filtered.length}
        page={page}
        perPage={perPage}
        onChange={setPage}
        perPageOptions={[50, 100, 500, "All"]}
        onPerPageChange={setPerPage}
      />

      {editItem && (
        <Modal open onClose={() => setEditItem(null)} title="Edit Item" wide>
          <ItemForm
            initial={editItem} poId={editItem.poId} zoneTypes={zoneTypes}
            suppliers={suppliers} dos={dos} hsDB={hsDB}
            onAddSupplier={addSupplier}
            onSave={(item) => { updateItem(item); setEditItem(null); }}
            onClose={() => setEditItem(null)}
          />
        </Modal>
      )}

      {showBulkEdit && (
        <BulkEditModal
          items={[...bulkSel].map(id => items.find(i => i.id === id)).filter(Boolean)}
          suppliers={suppliers}
          onAddSupplier={addSupplier}
          zoneTypes={zoneTypes.map(z => typeof z === 'object' ? z.name : z)}
          onClose={() => setShowBulkEdit(false)}
          onSave={(payload) => {
            [...bulkSel].forEach((id) => {
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
              updateItem(n);
            });
            setShowBulkEdit(false);
            toast(`✓ Update massal diterapkan ke ${bulkSel.size} item`);
          }}
        />
      )}
    </div>
  );
}
