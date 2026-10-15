/**
 * POList — Purchase Order list page.
 *
 * This file is intentionally thin: it wires state together and renders layout.
 * Business logic lives in usePOListState.js; row rendering lives in POTableRow.jsx.
 *
 * Data flow:
 *   usePOStore  →  usePOListState (filter/sort/export/import)
 *                →  DataTableToolbar  (search + bulk actions)
 *                →  DataTableHeader   (sortable/filterable column headers)
 *                →  POTableRow[]      (one row per PO on current page)
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Btn, Ico, IC, FSel } from "../../components/ui";
import { Pagination, CopyTSVButton, ImportWizard, DataTableToolbar, DataTableHeader } from "../../components/shared";
import { POForm, DOGeneratorModal } from "../../components/forms";
import { useConfirm, useDataTable, useScrollRestore } from "../../hooks";
import { usePOStore } from "../../store/usePOStore";
import { today, exportCSV } from "../../lib/helpers";
import { INIT_PO_STATUS, PAGE_SIZE } from "../../lib/constants";
import { usePOListState } from "./usePOListState";
import { POTableRow } from "./POTableRow";

const thCls = "py-1 px-1.5 text-[10px] font-bold text-text-secondary text-left whitespace-nowrap border-b border-border-default uppercase tracking-[.02em] bg-surface-alt cursor-pointer select-none sticky top-0 z-[10]";

const CSV_TEMPLATE_HEADERS = ["No PO","Perusahaan","Nama Item","Tgl Order","Qty","Satuan","Harga Satuan","Status Item","Tgl Kirim","No Invoice","HS Code","Zona"];
const CSV_TEMPLATE_SAMPLE  = ["PO-2025-001","PT. Contoh Jaya","Kabel NYY 3x2.5mm","2025-01-15","100","meter","45000","ordered","","","8544.42","Zona A"];

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
    hasFilters, resetFilters, getPaged,
  } = useDataTable("orderDate", "desc", PAGE_SIZE, "po-list");

  const [exp,      setExp]      = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editPO,   setEditPO]   = useState(null);
  const [doTarget, setDoTarget] = useState(null);
  const tableRef = useRef(null);
  const { ask, ConfirmModal } = useConfirm();

  useScrollRestore("po-list", tableRef);

  // All filtering, sorting, import/export logic
  const {
    sortedFiltered, COLS,
    csvLoading, csvRef, importData, setImportData,
    handleCSV, processImportedData,
    bulkSetStatus, bulkDelete,
    handleExportCSV, handleExportExcel, getCopyTSVData, handleBulkCopyPOs,
  } = usePOListState({
    pos, items, companies, settings,
    search, sort, colF, dateF, numF, textF,
    bulkSel, setBulkSel, ask, resetFilters,
  });

  const paged = getPaged(sortedFiltered);

  const isAllSelected = useMemo(() => {
    if (!paged.length) return false;
    for (const p of paged) {
      if (!bulkSel.has(p.id)) return false;
    }
    return true;
  }, [paged, bulkSel]);

  // ── Side effects ─────────────────────────────────────────────────────────

  // Cross-page jump: Dashboard/AllItems can push a jumpTargetPOId to navigate here
  useEffect(() => {
    if (!jumpTargetPOId) return;
    const idx = sortedFiltered.findIndex((p) => p.id === jumpTargetPOId);
    if (idx === -1) { setJumpTargetPO(null); return; }
    const per = perPage === "All" ? (sortedFiltered.length || 1) : Number(perPage) || PAGE_SIZE;
    setPage(Math.floor(idx / per) + 1);
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

  // Cross-page signal: Dashboard "New PO" button sets triggerNewPO to open form
  const triggerNewPO    = usePOStore((s) => s.triggerNewPO);
  const setTriggerNewPO = usePOStore((s) => s.setTriggerNewPO);
  useEffect(() => {
    if (!triggerNewPO) return;
    setEditPO(null);
    setShowForm(true);
    setTriggerNewPO(false);
  }, [triggerNewPO, setTriggerNewPO]);

  // Escape clears bulk selection
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") setBulkSel(new Set()); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [setBulkSel]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full">
      <ConfirmModal />

      {/* ── Toolbar: search, bulk actions, export/import ── */}
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
              size="sm" variant="secondary"
              className="!px-3 !py-1.5 opacity-70 hover:opacity-100"
              onClick={() => usePOStore.getState().init()}
              title="Reload Data dari Server"
            >
              <Ico d={IC.refresh} size={13} />
            </Btn>
            <Btn
              id="btn-new-po" size="sm" variant="primary"
              className="!px-4 !py-1.5 shadow-sm hover:translate-y-[-1px] transition-all"
              onClick={() => { setEditPO(null); setShowForm(true); }}
            >
              <Ico d={IC.plus} size={13} /> New PO
            </Btn>
          </div>
        }
        bulkActions={
          <>
            <FSel
              value="" onChange={(v) => { if (v) bulkSetStatus(v); }}
              placeholder="Set Status..."
              options={Object.entries(INIT_PO_STATUS).map(([k, v]) => ({ v: k, l: v.label }))}
              className="!py-1 !px-2 w-[140px] text-[11px] font-semibold"
            />
            <Btn size="sm" variant="danger" className="!py-1 !px-2.5 font-semibold" onClick={bulkDelete}>
              <Ico d={IC.trash} size={11} /> Hapus
            </Btn>
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
            <Btn size="sm" variant="success"   onClick={handleExportExcel}><Ico d={IC.dl} size={11} /> Excel</Btn>
            <Btn size="sm" variant="secondary" onClick={handleExportCSV}><Ico d={IC.dl} size={11} /> CSV</Btn>
            <CopyTSVButton filename={`PO_export_${today()}.tsv`} data={getCopyTSVData} size="sm" variant="ghost" />
            <Btn size="sm" variant="secondary" disabled={csvLoading} onClick={() => csvRef.current?.click()}>
              <Ico d={IC.plus} size={11} />{csvLoading ? " Loading..." : " Import CSV / TSV"}
            </Btn>
            <Btn
              size="sm" variant="ghost"
              title="Download template CSV untuk import"
              onClick={() => exportCSV(CSV_TEMPLATE_HEADERS, [CSV_TEMPLATE_SAMPLE], "Template_Import_PO.csv")}
              className="!text-text-muted hover:!text-brand"
            >
              <Ico d={IC.dl} size={11} /> Template
            </Btn>
            <input ref={csvRef} type="file" accept=".csv,.tsv" onChange={handleCSV} className="hidden" />
          </>
        }
      />

      {/* ── Table ── */}
      <div className="overflow-x-auto flex-1 w-full" ref={tableRef}>
        <table className="w-full border-collapse table-fixed min-w-[1100px]">
          {/* Column widths — checkbox | PO# | Company | Date | Status | Priority | Items | Total | Zone | Aging | Notes | Actions */}
          <colgroup>
            <col className="w-8" />
            <col className="w-[200px]" />
            <col className="w-[160px]" />
            <col className="w-[88px]" />
            <col className="w-[110px]" />
            <col className="w-[72px]" />
            <col className="w-[100px]" />
            <col className="w-[110px]" />
            <col className="w-[100px]" />
            <col className="w-[64px]" />
            <col />
            <col className="w-[116px]" />
          </colgroup>
          <DataTableHeader
            thCls={thCls}
            cols={COLS} rows={pos}
            paged={paged} bulkSel={bulkSel} setBulkSel={setBulkSel}
            isAllSelected={isAllSelected}
            sort={sort} toggleSort={toggleSort}
            colF={colF} setColF={setColF}
            dateF={dateF} setDateF={setDateF}
            numF={numF} setNumF={setNumF}
            textF={textF} setTextF={setTextF}
          />
          <tbody>
            {!paged.length && (
              <tr>
                <td colSpan={COLS.length + 2} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-brand-soft border border-brand-mid flex items-center justify-center mb-1">
                      <Ico d={IC.po} size={22} color="var(--color-brand)" />
                    </div>
                    <div className="text-sm font-bold text-text-secondary">Belum Ada PO</div>
                    <div className="text-xs text-text-muted max-w-[240px]">
                      Tekan <kbd className="px-1.5 py-0.5 bg-bg-app border border-border-strong rounded text-[10px] font-mono font-bold">N</kbd> untuk membuat PO baru
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {paged.map((po, i) => (
              <POTableRow
                key={po.id}
                po={po} idx={i}
                items={items} dos={dos} suppliers={suppliers}
                zoneTypes={zoneTypes} settings={settings} hsDB={hsDB}
                bulkSel={bulkSel} setBulkSel={setBulkSel}
                exp={exp} setExp={setExp}
                updatePO={updatePO} updateItem={updateItem}
                addItem={addItem} deleteItem={deleteItem}
                addPO={addPO} deletePO={deletePO}
                addSupplier={addSupplier} saveDO={saveDO} deleteDO={deleteDO}
                toast={toast} ask={ask}
                setEditPO={setEditPO} setShowForm={setShowForm} setDoTarget={setDoTarget}
              />
            ))}
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

      {/* ── Modals ── */}
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
          onSave={(po, draftItems) => {
            addPO(po, draftItems);
            setShowForm(false);
            toast(`✓ PO ${po.orderNo} disimpan`);
          }}
          onClose={() => setShowForm(false)}
        />
      )}
      {doTarget && (
        <DOGeneratorModal
          po={doTarget.po} preSelect={doTarget.preSelect}
          items={items} dos={dos} settings={settings}
          onClose={() => setDoTarget(null)}
          onSaveDO={(doObj) => { saveDO(doObj); toast(`✓ DO ${doObj.doNo} disimpan`); }}
        />
      )}
    </div>
  );
}
