import { useState, useMemo, Fragment } from "react";
import { Btn, Ico, IC, Modal, SPill, FIn, FSel } from "../components/ui";
import { Pagination, DateRangeFilter, NumberRangeFilter, TextFilter, ColFilter, InlineCell, CopyTSVButton, DataTableToolbar, DataTableHeader } from "../components/shared";
import { ItemForm, BulkEditModal } from "../components/forms";
import { useConfirm, useDataTable } from "../hooks";
import { usePOStore } from "../store/usePOStore";
import {
  itemNet, itemMargin, itemBuy, getQtyDel, fmtDate, fmtShort, fmt, today, uid,
  exportCSV, copyTSV, applyDateFilter, applyNumFilter, applyTextFilter,
} from "../lib/helpers";
import { ITEM_STATUS, INIT_PO_STATUS, PAGE_SIZE, DEFAULT_EXCEL_ITEM_COLS } from "../lib/constants";

/* ── Class constants ── */
const thCls  = "py-[7px] px-2 text-[10px] font-bold text-text-secondary text-left whitespace-nowrap border-b border-border-default uppercase tracking-[.02em] bg-surface-alt cursor-pointer select-none";
const tdCls  = "py-1.5 px-2 border-b border-border-default text-[11px] align-middle";
const stickyL = "sticky left-0 z-[1] shadow-[3px_0_6px_rgba(0,0,0,0.05)]";
const stickyR = "sticky right-0 z-[1] shadow-[-3px_0_6px_rgba(0,0,0,0.05)]";

export function AllItems({ onJump }) {
  const { items, pos, suppliers, dos, zoneTypes, settings, hsDB, updateItem, deleteItem, addSupplier, toast } = usePOStore();

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

  const filtered = useMemo(() => {
    let r = items.filter((i) => {
      if (search) {
        const q = search.toLowerCase();
        const po = poById[i.poId];
        const mainSupplier = (i.supplierAssignments || []).find(a => a.role === "main");
        const mainSupplierName = mainSupplier ? suppliers?.find(s => s.id === mainSupplier.supplierId)?.name : "";
        const zone = (i.zoneType || po?.zoneType || "");
        const haystack = [
          i.itemName,
          i.desc,
          i.invoiceNo,
          ...(i.doNos || []),
          po?.orderNo,
          po?.company,
          zone,
          i.hsCode,
          mainSupplierName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
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
    { col: "itemName",    label: "Item",              ft: "text", fk: "itemName"     },
    { col: "qty",         label: "Qty",               ft: "num",  fk: "qty"          },
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
    {
      col: "company",
      label: "PO / Perusahaan",
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
            {!paged.length && <tr><td colSpan={15} className="py-10 text-center text-text-muted">Tidak ada item.</td></tr>}
            {paged.map((rowItem, idx) => {
              /* ── renderItemRow defined first so group rows can call it ── */
              const renderItemRow = (item, subIdx, isSub = false) => {
                const po = pos.find((p) => p.id === item.poId);
                const mg = itemMargin(item);
                const qDel = getQtyDel(item.id, dos);
                const itemDOs = (dos || []).filter((d) => (d.lines || []).some((l) => l.itemId === item.id));
                const isSel = bulkSel.has(item.id);
                const rowBg = isSel ? "bg-[#eff6ff]" : isSub ? "bg-[#f8fafc] hover:bg-white" : (subIdx % 2 === 0 ? "bg-white hover:bg-surface-alt" : "bg-surface-alt hover:bg-white");
                const mgCls = mg === null ? "text-text-muted" : mg >= 0 ? "text-green" : "text-red";
                const mainSupplier = (item.supplierAssignments || []).find(a => a.role === "main");
                const mainSupplierName = mainSupplier ? suppliers?.find(s => s.id === mainSupplier.supplierId)?.name : null;
                return (
                  <tr key={item.id} className={`${rowBg} transition-colors ${isSub ? "border-l-[3px] border-l-brand" : "border-b border-border-default"}`}>
                    <td className={`${tdCls} ${stickyL} ${rowBg}`}>
                      <input type="checkbox" checked={isSel} onChange={() => { const s = new Set(bulkSel); s.has(item.id) ? s.delete(item.id) : s.add(item.id); setBulkSel(s); }} />
                    </td>
                    <td className={tdCls} title={item.itemName}>
                      <div className={`font-semibold line-clamp-3 min-w-[120px] max-w-[200px] break-words whitespace-normal leading-snug ${isSub ? "text-[10px] text-text-secondary pl-2" : ""}`}>{item.itemName}</div>
                    </td>
                    <td className={`${tdCls} font-mono`}>
                      <div className="flex items-center gap-1">
                        <span>{item.qty}</span>
                        <span className="text-text-secondary text-[10px]">{item.unit}</span>
                        {qDel > 0 && <span className="text-[9px] text-green ml-0.5">({qDel}↑)</span>}
                      </div>
                    </td>
                    <td className={`${tdCls} font-mono whitespace-nowrap`}>{fmt(item.unitPrice)}</td>
                    <td className={`${tdCls} font-mono font-bold text-brand whitespace-nowrap`}>{fmt(itemNet(item))}</td>
                    <td className={tdCls} title={mainSupplierName || "–"}>
                      <div className="max-w-[120px] truncate">{mainSupplierName || "–"}</div>
                    </td>
                    <td className={`${tdCls} font-mono font-bold whitespace-nowrap ${mgCls}`}>{mg === null ? "–" : fmtShort(mg)}</td>
                    <td className={tdCls} onClick={(e) => e.stopPropagation()}><SPill value={item.status} onChange={(v) => updateItem({ ...item, status: v })} cfg={ITEM_STATUS} mini /></td>
                    <td className={`${tdCls} whitespace-nowrap`}><InlineCell value={item.deliveryDate} onSave={(v) => updateItem({ ...item, deliveryDate: v })} isDate placeholder="–" /></td>
                    <td className={tdCls} title={item.invoiceNo}>
                      <div className="max-w-[120px] whitespace-normal break-words line-clamp-2">
                        <InlineCell value={item.invoiceNo} onSave={(v) => updateItem({ ...item, invoiceNo: v })} mono placeholder="INV..." />
                      </div>
                    </td>
                    <td className={`${tdCls} truncate max-w-[110px]`} title={item.zoneType || po?.zoneType || ""}>
                      <InlineCell
                        value={item.zoneType || po?.zoneType || ""}
                        onSave={(v) => updateItem({ ...item, zoneType: v })}
                        select
                        opts={(zoneTypes || []).map(z => ({ v: typeof z === "object" ? z.name : z, l: typeof z === "object" ? z.name : z }))}
                        placeholder="Pilih Zona..."
                      />
                    </td>
                    <td className={tdCls} title={po?.orderNo || po?.company}>
                      <div className="max-w-[150px] line-clamp-2 break-words whitespace-normal leading-tight">
                        {po?.orderNo && (
                          <span
                            className="font-mono text-brand cursor-pointer hover:underline"
                            onClick={e => { e.stopPropagation(); onJump?.("po", po.id); }}
                          >{po.orderNo}</span>
                        )}
                        {po?.orderNo && po?.company && <br />}
                        {po?.company || "–"}
                      </div>
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-col gap-0.5">
                        {itemDOs.map((d) => {
                          const line = d.lines.find((l) => l.itemId === item.id);
                          return (
                            <div key={d.id} className="flex flex-col">
                              <span className="text-[9px] font-mono text-brand bg-brand-soft rounded-[3px] px-1 whitespace-nowrap">{d.doNo}</span>
                              <span className="text-[8px] text-text-muted">{fmtDate(d.deliveryDate)} · {line?.qtyDelivered} {item.unit}</span>
                            </div>
                          );
                        })}
                        {!itemDOs.length && <span className="text-[9px] text-text-muted">–</span>}
                      </div>
                    </td>
                    <td className={`${tdCls} ${stickyR} ${rowBg} !p-[4px_6px]`}>
                      <div className="flex gap-[3px] flex-wrap justify-end">
                        <Btn size="sm" variant="ghost" title="Edit Item" className="!p-0 w-[24px] h-[24px] justify-center" onClick={() => setEditItem(item)}>
                          <Ico d={IC.edit} size={10} />
                        </Btn>
                        <Btn size="sm" variant="danger" title="Hapus Item" className="!p-0 w-[24px] h-[24px] justify-center" onClick={() => ask(`Hapus item "${item.itemName}"?`, () => deleteItem(item.id), { danger: true, confirmLabel: "Ya, Hapus" })}>
                          <Ico d={IC.trash} size={10} />
                        </Btn>
                      </div>
                    </td>
                  </tr>
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
                      <td className={`${tdCls} font-mono font-bold`}>{g.qty}</td>
                      <td className={`${tdCls} font-mono font-bold text-brand`}>{fmt(g.net)}</td>
                      <td className={tdCls} colSpan={6}><span className="text-[10px] text-text-muted italic">Bervariasi</span></td>
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
