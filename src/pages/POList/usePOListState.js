/**
 * usePOListState — Logic hook for the POList page.
 *
 * Encapsulates all non-render logic so index.jsx stays focused on layout:
 *   - Data filtering + sorting  (sortedFiltered, itemsByPoId)
 *   - Column definitions        (COLS)
 *   - CSV/TSV import            (handleCSV, processImportedData)
 *   - Export handlers           (handleExportCSV, handleExportExcel, getCopyTSVData)
 *   - Bulk copy                 (handleBulkCopyPOs)
 *   - Bulk actions              (bulkSetStatus, bulkDelete)
 *
 * @param {object} params
 * @param {Array}    params.pos           All PO records
 * @param {Array}    params.items         All line-item records
 * @param {Array}    params.companies     Company master list (for import validation)
 * @param {object}   params.settings      App settings (fuzzyThreshold, labelNoPO, excelPOCols…)
 * @param {string}   params.search        Current search query
 * @param {object}   params.sort          { col, dir }
 * @param {object}   params.colF          Column filter state
 * @param {object}   params.dateF         Date filter state
 * @param {object}   params.numF          Numeric filter state
 * @param {object}   params.textF         Text filter state
 * @param {Set}      params.bulkSel       Selected PO IDs
 * @param {Function} params.setBulkSel    Setter for bulkSel
 * @param {Function} params.ask           Confirmation dialog from useConfirm()
 * @param {Function} params.resetFilters  Clears all active filters
 */

import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { usePOStore } from "../../store/usePOStore";
import {
  uid, today, diffDays, fmtDate, calcPOTotals, getPOProgress, getPOZone,
  getAgingBucket, parseSmartDate, parseIDR, mapPOSt, mapItemSt,
  exportCSV, copyTSV, applyDateFilter, applyNumFilter, applyTextFilter,
} from "../../lib/helpers";
import { fuzzySearchPOs } from "../../lib/fuzzySearch";
import { INIT_PO_STATUS, DEFAULT_EXCEL_PO_COLS } from "../../lib/constants";

export function usePOListState({
  pos, items, companies, settings,
  search, sort, colF, dateF, numF, textF,
  bulkSel, setBulkSel, ask, resetFilters,
}) {
  const { updatePO, bulkDeletePOs, bulkImportPOs, toast } = usePOStore();

  const [csvLoading, setCsvLoading] = useState(false);
  const [importData, setImportData] = useState(null);
  const csvRef = useRef();

  // ── Derived data ─────────────────────────────────────────────────────────

  // Build a Map from poId → items[] once, shared by filters + sort
  const itemsByPoId = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      if (!map.has(i.poId)) map.set(i.poId, []);
      map.get(i.poId).push(i);
    });
    return map;
  }, [items]);

  const sortedFiltered = useMemo(() => {
    let r = search ? fuzzySearchPOs(pos, search, settings.fuzzyThreshold) : pos;

    r = r.filter((p) => {
      for (const [col, s] of Object.entries(colF)) {
        if (!s || !s.size) continue;
        let v = "";
        if      (col === "status")   v = p.status;
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
          v = getAgingBucket(days)?.label || "(Kosong)";
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
        av = (itemsByPoId.get(a.id) || []).length;
        bv = (itemsByPoId.get(b.id) || []).length;
      }
      const d = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? d : -d;
    });
  }, [pos, items, search, sort, colF, dateF, numF, textF, itemsByPoId]);

  // ── Column definitions ───────────────────────────────────────────────────
  // ft = filter type: "col" | "date" | "num" | "text"
  // fk = field key used by the filter (if different from col)
  const COLS = [
    { col: "orderNo",   label: settings?.labelNoPO || "PO Number", ft: "text", fk: "orderNo" },
    { col: "company",   label: "Company",   ft: "col" },
    { col: "orderDate", label: "Date",      ft: "date", fk: "orderDate" },
    { col: "status",    label: "Status",    ft: "col" },
    { col: "priority",  label: "Priority",  ft: "col" },
    { col: "items",     label: "Items",     ft: "col" },
    { col: "total",     label: "Total",     ft: "num",  fk: "total" },
    { col: "zone",      label: "Zone",      ft: "col",
      keyFn: (p) => getPOZone(p.id, items),
      labelFn: (p) => getPOZone(p.id, items),
    },
    { col: "aging",     label: "Aging",     ft: "col",
      keyFn: (p) => {
        const d = p.status !== "paid" && p.status !== "cancelled" ? diffDays(p.orderDate) : -1;
        return getAgingBucket(d)?.label || "(Kosong)";
      },
    },
    { col: "notes",     label: "Note",      ft: "text", fk: "notes" },
  ];

  // ── CSV / TSV import ─────────────────────────────────────────────────────

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvLoading(true);
    const fileExt = file.name.endsWith(".tsv") ? "tsv" : "csv";
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportData({ rawText: ev.target.result, fileExt });
      setCsvLoading(false);
      e.target.value = "";
    };
    reader.onerror = () => {
      toast("✗ Gagal membaca file");
      setCsvLoading(false);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const processImportedData = async (mappedRows) => {
    try {
      if (!mappedRows?.length) throw new Error("Tidak ada data valid yang dipilih");

      const unknownComps  = new Set();
      const hsCodesToSync = new Map();
      const zonesToSync   = new Set();
      let lastOrderNo = "";
      let lastCompany = "";

      // Group items by PO using the order number as key
      const poMap = new Map();

      mappedRows.forEach((row) => {
        let orderNo = row.orderNo?.trim();
        let company = row.company?.trim();
        const itemName = row.itemName?.trim();

        // Skip TOTAL summary rows that some spreadsheets include
        if (itemName?.toUpperCase() === "TOTAL") return;

        // Carry-forward: blank orderNo/company inherits from previous row
        if (orderNo) lastOrderNo = orderNo;
        if (company) lastCompany = company;
        if (!orderNo) orderNo = lastOrderNo;
        if (!company) company = lastCompany;
        if (!orderNo || !company) return;

        const lowerOrderNo = orderNo.toLowerCase();

        const companyExists = companies.some(
          (c) => (typeof c === "string" ? c : c.name || "").toLowerCase() === company.toLowerCase()
        );
        if (!companyExists) unknownComps.add(company);
        if (row.hsCode)  hsCodesToSync.set(row.hsCode, row.hsCodeDesc || "");
        if (row.zoneType) zonesToSync.add(row.zoneType);

        if (!itemName) return;

        if (!poMap.has(lowerOrderNo)) {
          // Preserve ID if this PO already exists so it becomes an update, not a duplicate
          const existing = pos.find((p) => p.orderNo.toLowerCase() === lowerOrderNo);
          poMap.set(lowerOrderNo, {
            id: existing?.id || uid(),
            orderNo,
            company,
            orderDate:    parseSmartDate(row.orderDate || "") || today(),
            prNo:         row.prNo || "",
            notes:        row.desc || "",
            status:       mapPOSt(row.poStatus),
            priority:     "normal",
            totalLocked:  parseIDR(row.poExPPN || 0) > 0,
            manualExPPN:  parseIDR(row.poExPPN || 0),
            manualPPN:    parseIDR(row.poPPN || 0),
            items: [],
          });
        }

        const up      = parseIDR(row.unitPrice || 0);
        const qty     = parseFloat(row.qty || 1) || 1;
        const disc    = parseIDR(row.discount || 0);
        const discPct = parseFloat(row.discountPct || 0);

        poMap.get(lowerOrderNo).items.push({
          id:           uid(),
          itemName,
          desc:         row.desc || "",
          qty,
          unit:         row.unit || "pcs",
          unitPrice:    up,
          discount:     discPct > 0 ? Math.round(up * qty * discPct / 100) : disc,
          discountPct:  discPct,
          status:       mapItemSt(row.itemStatus || ""),
          deliveryDate: parseSmartDate(row.deliveryDate || ""),
          invoiceNo:    row.invoiceNo || "",
          zoneType:     row.zoneType || "",
          hsCode:       row.hsCode || "",
        });
      });

      if (poMap.size === 0) {
        toast("⚠️ Tidak ada data PO valid untuk diimpor.");
        setImportData(null);
        return;
      }

      const existingCount = Array.from(poMap.keys()).filter(
        (k) => pos.some((p) => p.orderNo.toLowerCase() === k)
      ).length;
      const msg =
        existingCount > 0
          ? `Akan mengimpor ${poMap.size} PO (${existingCount} update, ${poMap.size - existingCount} baru). Lanjutkan?`
          : `Akan mengimpor ${poMap.size} PO baru. Lanjutkan?`;

      ask(msg, async () => {
        try {
          const payload = {
            pos: Array.from(poMap.values()),
            metadata: {
              companies: Array.from(unknownComps),
              hsCodes:   Array.from(hsCodesToSync.entries()).map(([code, desc]) => ({ code, desc })),
              zones:     Array.from(zonesToSync),
            },
          };
          console.log(`[Import] Sending bulk payload: ${payload.pos.length} POs, ${payload.metadata.companies.length} comps...`);
          await bulkImportPOs(payload);
          resetFilters();
          setImportData(null);
        } catch (err) {
          toast("✗ Error saat menyimpan: " + err.message);
        }
      }, { confirmLabel: "Ya, Proses Import" });

    } catch (err) {
      toast("✗ Import gagal: " + err.message);
      setImportData(null);
    }
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────

  const bulkSetStatus = (st) => {
    bulkSel.forEach((id) => {
      const p = pos.find((x) => x.id === id);
      if (p) updatePO({ ...p, status: st });
    });
    toast(`Status ${bulkSel.size} PO diubah`);
  };

  const bulkDelete = () => {
    ask(
      `Hapus ${bulkSel.size} PO beserta seluruh item dan DO-nya?`,
      async () => {
        await bulkDeletePOs([...bulkSel]);
        setBulkSel(new Set());
      },
      { danger: true, confirmLabel: "Ya, Hapus Semua" }
    );
  };

  // ── Export handlers ───────────────────────────────────────────────────────

  const EXPORT_HEADERS = [
    "No PO", "Quote Ref", "Perusahaan", "Tgl Order", "Status PO", "PR No",
    "Ex PPN", "PPN", "Total", "Item Terkirim", "Item Invoiced", "Item Paid", "Total Item",
  ];

  // withFormattedDate: CSV uses raw ISO date; Excel uses human-readable fmtDate
  const buildExportRows = (withFormattedDate) =>
    sortedFiltered.map((p) => {
      const t  = calcPOTotals(p, items);
      const pr = getPOProgress(p.id, items);
      return [
        p.orderNo, p.quoteRef, p.company,
        withFormattedDate ? fmtDate(p.orderDate) : p.orderDate,
        INIT_PO_STATUS[p.status]?.label || p.status,
        p.prNo, t.exPPN, t.ppn, t.total,
        `${pr.del}/${pr.n}`, `${pr.inv}/${pr.n}`, `${pr.paid}/${pr.n}`, pr.n,
      ];
    });

  const handleExportCSV = () => {
    exportCSV(EXPORT_HEADERS, buildExportRows(false), `PO_export_${today()}.csv`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...buildExportRows(true)]);
    ws["!cols"] = [20, 18, 25, 12, 12, 15, 15, 12, 15, 12, 12, 12, 10].map((wch) => ({ wch }));
    const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "E3F2FD" } } };
    EXPORT_HEADERS.forEach((_, idx) => {
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
      const t  = calcPOTotals(p, items);
      const pr = getPOProgress(p.id, items);
      return [
        p.orderNo, p.quoteRef, p.company, p.orderDate,
        INIT_PO_STATUS[p.status]?.label || p.status,
        t.total, `${pr.del}/${pr.n}`, `${pr.inv}/${pr.n}`, `${pr.paid}/${pr.n}`,
      ];
    });
    return { headers: h, rows: r };
  };

  const handleBulkCopyPOs = () => {
    const cols    = (settings?.excelPOCols || DEFAULT_EXCEL_PO_COLS).filter((c) => c.enabled);
    const headers = cols.map((c) => c.label);
    const rows    = [];
    bulkSel.forEach((id) => {
      const po = pos.find((p) => p.id === id);
      if (!po) return;
      const t  = calcPOTotals(po, items);
      const pr = getPOProgress(po.id, items);
      rows.push(cols.map(({ key }) => {
        switch (key) {
          case "orderNo":    return po.orderNo    || "";
          case "quoteRef":   return po.quoteRef   || "";
          case "company":    return po.company    || "";
          case "orderDate":  return po.orderDate  || "";
          case "status":     return INIT_PO_STATUS[po.status]?.label || po.status || "";
          case "total":      return t.total;
          case "totalItems": return pr.n;
          case "delivered":  return `${pr.del}/${pr.n}`;
          case "invoiced":   return `${pr.inv}/${pr.n}`;
          case "paid":       return `${pr.paid}/${pr.n}`;
          case "priority":   return po.priority   || "";
          case "zoneType":   return getPOZone(po.id, items);
          default:           return "";
        }
      }));
    });
    copyTSV(headers, rows, () => toast(`✓ ${bulkSel.size} PO disalin!`));
  };

  return {
    sortedFiltered,
    itemsByPoId,
    COLS,
    csvLoading,
    csvRef,
    importData,
    setImportData,
    handleCSV,
    processImportedData,
    bulkSetStatus,
    bulkDelete,
    handleExportCSV,
    handleExportExcel,
    getCopyTSVData,
    handleBulkCopyPOs,
  };
}
