import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { Btn, Ico, IC, Modal, SPill, FIn, FSel } from "../components/ui";
import { Pagination, DateRangeFilter, NumberRangeFilter, TextFilter, ColFilter, InlineCell, CopyTSVButton, ImportWizard, DataTableToolbar, DataTableHeader } from "../components/shared";
import { POForm, DOGeneratorModal, SupplierFormModal } from "../components/forms";
import { POExpandedRow } from "../components/po";
import { useConfirm, useDataTable } from "../hooks";
import { usePOStore } from "../store/usePOStore";
import {
  uid, today, diffDays, fmtDate, fmtShort, calcPOTotals, getPOProgress, getPOZone,
  isOverdue, isIncompletePO, agingColor, agingBg, getAgingBucket,
  parseSmartDate, parseIDR, mapPOSt, mapItemSt,
  exportCSV, copyTSV, applyDateFilter, applyNumFilter, applyTextFilter
} from "../lib/helpers";
import { fuzzySearchPOs } from "../lib/fuzzySearch";
import { INIT_PO_STATUS, PAGE_SIZE, mkItem, DEFAULT_EXCEL_PO_COLS } from "../lib/constants";
import { stickyL as tableStickyL, stickyR as tableStickyR } from "../lib/tableStyles";
import * as XLSX from 'xlsx';

/* ── Class constants (page-specific overrides) ── */
const thCls   = "py-2 px-2 text-[11px] font-extrabold text-text-secondary text-left whitespace-nowrap border-b border-border-strong uppercase tracking-[.05em] bg-surface-alt cursor-pointer select-none sticky top-0 z-[10]";
const tdCls   = "py-2 px-2 border-b border-border-default text-[12px] align-middle";
const stickyL = tableStickyL;
const stickyR = tableStickyR;

/* ── POList (exported) ── */
export function POList() {
  const {
    pos, items, suppliers, dos, companies, zoneTypes, settings, hsDB,
    addPO, updatePO, deletePO, bulkDeletePOs, bulkImportPOs, addItem, updateItem, deleteItem,
    addSupplier, addCompany, saveDO, deleteDO, toast,
    jumpTargetPOId, setJumpTargetPO,
  } = usePOStore();

  const {
    search, setSearch, page, setPage, perPage, setPerPage,
    colF, setColF, dateF, setDateF, numF, setNumF, textF, setTextF,
    sort, toggleSort, bulkSel, setBulkSel, clearBulk,
    hasFilters, resetFilters, getPaged
  } = useDataTable("orderDate", "desc", PAGE_SIZE, "po-list");

  const [exp,        setExp]        = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [editPO,     setEditPO]     = useState(null);
  const [doTarget,   setDoTarget]   = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [importData, setImportData] = useState(null);
  const csvRef = useRef();
  const { ask, ConfirmModal } = useConfirm();

  // Pre-compute itemsByPoId Map for O(1) lookups - major performance boost
  const itemsByPoId = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      if (!map.has(i.poId)) map.set(i.poId, []);
      map.get(i.poId).push(i);
    });
    return map;
  }, [items]);

  const sortedFiltered = useMemo(() => {
    // Use fuzzy search if query provided, otherwise use all POs
    let r = search ? fuzzySearchPOs(pos, search, settings.fuzzyThreshold) : pos;

    // Apply other filters
    r = r.filter((p) => {
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
        else if (col === "aging") {
          const days = p.status !== "paid" && p.status !== "cancelled" ? diffDays(p.orderDate) : -1;
          const bucket = getAgingBucket(days);
          v = bucket?.label || "(Kosong)";
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
      if (sort.col === "items") {
        // Use pre-computed Map for O(1) lookup instead of O(n) filter
        av = (itemsByPoId.get(a.id) || []).length;
        bv = (itemsByPoId.get(b.id) || []).length;
      }
      const d = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? d : -d;
    });
  }, [pos, items, search, sort, colF, dateF, numF, textF, itemsByPoId]);

  const paged = getPaged(sortedFiltered);

  // Optimize "Select All" check for header
  const isAllSelected = useMemo(() => {
    if (!paged.length) return false;
    for (const p of paged) {
      if (!bulkSel.has(p.id)) return false;
    }
    return true;
  }, [paged, bulkSel]);

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
        setTimeout(() => el.classList.remove("row-hl"), 2500);
      }
      setJumpTargetPO(null);
    }, 400);
  }, [jumpTargetPOId, sortedFiltered, perPage, setPage, setJumpTargetPO]);

  const triggerNewPO = usePOStore(s => s.triggerNewPO);
  const setTriggerNewPO = usePOStore(s => s.setTriggerNewPO);

  useEffect(() => {
    if (triggerNewPO) {
      setEditPO(null);
      setShowForm(true);
      setTriggerNewPO(false);
    }
  }, [pos, triggerNewPO, setTriggerNewPO]); 

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

  const processImportedData = async (mappedRows) => {
    try {
      if (!mappedRows || !mappedRows.length) throw new Error("Tidak ada data valid yang dipilih");

      const unknownComps = new Set();
      const hsCodesToSync = new Map();
      const zonesToSync = new Set();
      
      let lastOrderNo = "";
      let lastCompany = "";

      // 1. Group items by PO (based on orderNo)
      const poMap = new Map(); // orderNo -> poData

      mappedRows.forEach((row) => {
        let orderNo = row.orderNo?.trim();
        let company = row.company?.trim();
        const itemName = row.itemName?.trim();

        if (itemName?.toUpperCase() === "TOTAL") return;

        if (orderNo) lastOrderNo = orderNo;
        if (company) lastCompany = company;
        if (!orderNo) orderNo = lastOrderNo;
        if (!company) company = lastCompany;
        if (!orderNo || !company) return;

        const lowerOrderNo = orderNo.toLowerCase();
        
        // Metadata tracking
        const companyExists = companies.some(c => (typeof c === 'string' ? c : c.name || "").toLowerCase() === company.toLowerCase());
        if (!companyExists) unknownComps.add(company);
        
        if (row.hsCode) hsCodesToSync.set(row.hsCode, row.hsCodeDesc || "");
        if (row.zoneType) zonesToSync.add(row.zoneType);

        if (!itemName) return;

        // Build PO structure
        if (!poMap.has(lowerOrderNo)) {
          const existing = pos.find(p => p.orderNo.toLowerCase() === lowerOrderNo);
          poMap.set(lowerOrderNo, {
            id: existing?.id || uid(), // CRITICAL: Keep ID for updating existing records
            orderNo,
            company,
            orderDate: parseSmartDate(row.orderDate || "") || today(),
            prNo: row.prNo || "",
            notes: row.desc || "",
            status: mapPOSt(row.poStatus),
            priority: "normal",
            totalLocked: parseIDR(row.poExPPN || 0) > 0,
            manualExPPN: parseIDR(row.poExPPN || 0),
            manualPPN: parseIDR(row.poPPN || 0),
            items: []
          });
        }

        // Add item to PO
        const up = parseIDR(row.unitPrice || 0);
        const qty = parseFloat(row.qty || 1) || 1;
        const disc = parseIDR(row.discount || 0);
        const discPct = parseFloat(row.discountPct || 0);

        poMap.get(lowerOrderNo).items.push({
          id: uid(),
          itemName,
          desc: row.desc || "",
          qty,
          unit: row.unit || "pcs",
          unitPrice: up,
          discount: discPct > 0 ? Math.round(up * qty * discPct / 100) : disc,
          discountPct: discPct,
          status: mapItemSt(row.itemStatus || ""),
          deliveryDate: parseSmartDate(row.deliveryDate || ""),
          invoiceNo: row.invoiceNo || "",
          zoneType: row.zoneType || "",
          hsCode: row.hsCode || ""
        });
      });

      const finalizeImport = async () => {
        try {
          const payload = {
            pos: Array.from(poMap.values()),
            metadata: {
              companies: Array.from(unknownComps),
              hsCodes: Array.from(hsCodesToSync.entries()).map(([code, desc]) => ({ code, desc })),
              zones: Array.from(zonesToSync)
            }
          };
          
          console.log(`[Import] Sending bulk payload: ${payload.pos.length} POs, ${payload.metadata.companies.length} comps...`);
          await bulkImportPOs(payload);
          
          resetFilters();
          setImportData(null);
        } catch (err) {
          toast("✗ Error saat menyimpan: " + err.message);
        }
      };

      if (poMap.size === 0) {
        toast("⚠️ Tidak ada data PO valid untuk diimpor.");
        setImportData(null);
        return;
      }

      const existingCount = Array.from(poMap.keys()).filter(k => pos.some(p => p.orderNo.toLowerCase() === k)).length;
      const msg = existingCount > 0 
        ? `Akan mengimpor ${poMap.size} PO (${existingCount} update, ${poMap.size - existingCount} baru). Lanjutkan?`
        : `Akan mengimpor ${poMap.size} PO baru. Lanjutkan?`;

      ask(msg, finalizeImport, { confirmLabel: "Ya, Proses Import" });

    } catch (err) {
      toast("✗ Import gagal: " + err.message);
      setImportData(null);
    }
  };

  const bulkSetStatus = (st) => {
    bulkSel.forEach((id) => { const p = pos.find((x) => x.id === id); if (p) updatePO({ ...p, status: st }); });
    toast(`Status ${bulkSel.size} PO diubah`);
  };
  const bulkDelete = () => {
    ask(`Hapus ${bulkSel.size} PO beserta seluruh item dan DO-nya?`, async () => {
      const ids = [...bulkSel];
      await bulkDeletePOs(ids);
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

  const handleExportExcel = () => {
    const h = ["No PO", "Quote Ref", "Perusahaan", "Tgl Order", "Status PO", "PR No", "Ex PPN", "PPN", "Total", "Item Terkirim", "Item Invoiced", "Item Paid", "Total Item"];
    const r = sortedFiltered.map((p) => {
      const t = calcPOTotals(p, items); const pr = getPOProgress(p.id, items);
      return [p.orderNo, p.quoteRef, p.company, fmtDate(p.orderDate), INIT_PO_STATUS[p.status]?.label || p.status, p.prNo, t.exPPN, t.ppn, t.total, `${pr.del}/${pr.n}`, `${pr.inv}/${pr.n}`, `${pr.paid}/${pr.n}`, pr.n];
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([h, ...r]);

    // Set column widths
    ws['!cols'] = [
      {wch: 20}, // No PO
      {wch: 18}, // Quote Ref
      {wch: 25}, // Company
      {wch: 12}, // Date
      {wch: 12}, // Status
      {wch: 15}, // PR No
      {wch: 15}, // Ex PPN
      {wch: 12}, // PPN
      {wch: 15}, // Total
      {wch: 12}, // Delivered
      {wch: 12}, // Invoiced
      {wch: 12}, // Paid
      {wch: 10}, // Total Items
    ];

    // Style header row (bold)
    const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "E3F2FD" } } };
    h.forEach((_, idx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    });

    XLSX.utils.book_append_sheet(wb, ws, "Purchase Orders");
    XLSX.writeFile(wb, `PO_export_${today()}.xlsx`);
    toast("✓ Excel file exported");
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
    { col: "orderNo",  label: settings?.labelNoPO || "PO Number",    ft: "text", fk: "orderNo" },
    { col: "company",  label: "Company",             ft: "col" },
    { col: "orderDate",label: "Date",                ft: "date", fk: "orderDate" },
    { col: "status",   label: "Status",               ft: "col" },
    { col: "priority", label: "Priority",            ft: "col" },
    { col: "items",    label: "Items",               ft: "col" },
    { col: "total",    label: "Total",                ft: "num",  fk: "total" },
    { col: "zone",     label: "Zone",                 ft: "col",  keyFn: (p) => getPOZone(p.id, items), labelFn: (p) => getPOZone(p.id, items) },
    { col: "aging",    label: "Aging",                ft: "col",  keyFn: (p) => {
        const d = p.status !== "paid" && p.status !== "cancelled" ? diffDays(p.orderDate) : -1;
        return getAgingBucket(d)?.label || "(Kosong)";
      }},
    { col: "notes",    label: "Note",                 ft: "text", fk: "notes" },
  ];

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") setBulkSel(new Set()); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

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
          <div className="flex items-center gap-2">
            <Btn 
              size="sm" 
              variant="secondary" 
              className="!px-3 !py-1.5 opacity-70 hover:opacity-100" 
              onClick={() => { usePOStore.getState().init(); }}
              title="Reload Data dari Server"
            >
              <Ico d={IC.refresh} size={13} />
            </Btn>
            <Btn id="btn-new-po" size="sm" variant="primary" className="!px-4 !py-1.5 shadow-sm hover:translate-y-[-1px] transition-all" onClick={() => { setEditPO(null); setShowForm(true); }}>
              <Ico d={IC.plus} size={13} /> New PO
            </Btn>
          </div>
        }
        bulkActions={
          <>
            <FSel value="" onChange={(v) => { if (v) bulkSetStatus(v); }} placeholder="Set Status..."
              options={Object.entries(INIT_PO_STATUS).map(([k, v]) => ({ v: k, l: v.label }))}
              className="!py-1 !px-2 w-[140px] text-[11px] font-semibold"
            />
            <Btn size="sm" variant="danger" className="!py-1 !px-2.5 font-semibold" onClick={bulkDelete}><Ico d={IC.trash} size={11} /> Hapus</Btn>
            <Btn size="sm" variant="blue" className="!px-4 !py-1" onClick={handleBulkCopyPOs}>
              <Ico d={IC.copy} size={12} /> Copy {bulkSel.size}
            </Btn>
            <Btn size="sm" variant="ghost" className="!px-3 !py-1 text-text-muted hover:text-brand" onClick={clearBulk}>
              <Ico d={IC.close} size={10} /> Bersihkan Pilihan
            </Btn>
          </>
        }
        exportActions={
          <>
            <Btn size="sm" variant="success" onClick={handleExportExcel}><Ico d={IC.dl} size={11} /> Excel</Btn>
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
            isAllSelected={isAllSelected}
            sort={sort} toggleSort={toggleSort}
            colF={colF} setColF={setColF} dateF={dateF} setDateF={setDateF}
            numF={numF} setNumF={setNumF} textF={textF} setTextF={setTextF}
          />
          <tbody>
            {!paged.length && (
              <tr><td colSpan={10} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-brand-soft border border-brand-mid flex items-center justify-center mb-1">
                    <Ico d={IC.po} size={22} color="var(--color-brand)" />
                  </div>
                  <div className="text-sm font-bold text-text-secondary">Belum Ada PO</div>
                  <div className="text-xs text-text-muted max-w-[240px]">Tekan <kbd className="px-1.5 py-0.5 bg-bg-app border border-border-strong rounded text-[10px] font-mono font-bold">N</kbd> untuk membuat PO baru</div>
                </div>
              </td></tr>
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
                    <td className={`${tdCls} w-[60px] text-right`}>
                      {agingDays >= 0
                        ? <span className="text-[11px] font-bold px-[7px] py-0.5 rounded-[5px] whitespace-nowrap" style={{ color: agingColor(agingDays), background: agingBg(agingDays) }}>{agingDays}h</span>
                        : <span className="text-[10px] text-text-muted">–</span>}
                    </td>
                    <td className={`${tdCls} truncate max-w-[250px] text-[10px] text-text-muted`} title={po.notes}>{po.notes || "–"}</td>
                    <td className={`${tdCls} ${stickyR} ${cellBg} !p-[4px_12px] w-[120px]`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-[6px] justify-end items-center">
                        <Btn size="sm" variant="ghost" title="Edit PO" className="!p-0 w-[24px] h-[24px] justify-center" onClick={() => { setEditPO(po); setShowForm(true); }}>
                          <Ico d={IC.edit} size={11} />
                        </Btn>
                        <Btn size="sm" variant="ghost" title="Buat DO" className="!p-0 w-[24px] h-[24px] justify-center" onClick={() => setDoTarget({ po, preSelect: new Set() })}>
                          <Ico d={IC.truck} size={11} color="var(--color-brand)" />
                        </Btn>
                        <Btn size="sm" variant="ghost" title="Duplikat PO" className="!p-0 w-[24px] h-[24px] justify-center"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const nPOId = uid();
                              const nPO = {
                                ...po,
                                id: nPOId,
                                orderNo: `COPY-${po.orderNo}`,
                                orderDate: today(),
                                status: "draft",
                                createdAt: today()
                              };
                              const nItms = items
                                .filter((i) => i.poId === po.id)
                                .map((i) => ({
                                  ...i,
                                  id: uid(), // Unique ID for each item
                                  poId: nPOId,
                                  status: "ordered",
                                  doNos: [],
                                  deliveryDate: "",
                                  invoiceNo: ""
                                }));
                              await addPO(nPO, nItms);
                              toast("✓ PO diduplikat");
                            } catch (error) {
                              toast("✗ Gagal menduplikat PO");
                              console.error(error);
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
                  {isExp && (
                    <tr key={po.id + "_exp"}>
                      <td colSpan={12} className="p-0 border-b border-border-default bg-surface-alt/30">
                        <POExpandedRow
                          po={po}
                          items={items}
                          suppliers={suppliers}
                          dos={dos}
                          zoneTypes={zoneTypes}
                          settings={settings}
                          hsDB={hsDB}
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
