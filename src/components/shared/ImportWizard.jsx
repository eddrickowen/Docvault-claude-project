import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import { Btn, Ico, IC, Modal, FSel } from "../ui";

// Required mappings that the App needs to pull from the CSV.
// These replace the old hard-coded `get("no po")` lookups.
const REQUIRED_MAPPINGS = [
  { key: "orderNo",    label: "No PO / Order" },
  { key: "company",    label: "Perusahaan / Company" },
  { key: "itemName",   label: "Nama Item" },
  { key: "qty",        label: "Qty / Jumlah" },
  { key: "unitPrice",  label: "Harga / Unit Price" }
];

const OPTIONAL_MAPPINGS = [
  { key: "quoteRef",   label: "[Opt] Quote Ref" },
  { key: "orderDate",  label: "[Opt] Tgl Order" },
  { key: "poStatus",   label: "[Opt] Status PO" },
  { key: "unit",       label: "[Opt] Satuan (Unit)" },
  { key: "discount",   label: "[Opt] Diskon Nilai" },
  { key: "discountPct",label: "[Opt] Diskon %" },
  { key: "itemStatus", label: "[Opt] Status Item" },
  { key: "deliveryDate",label: "[Opt] Tgl Delivery" },
  { key: "invoiceNo",  label: "[Opt] No Invoice" },
  { key: "zoneType",   label: "[Opt] Zone" },
  { key: "hsCode",     label: "[Opt] HS Code" },
  { key: "desc",       label: "[Opt] Deskripsi (Notes)" },
  { key: "poExPPN",    label: "[Opt] Total PO Ex PPN" },
  { key: "poPPN",      label: "[Opt] Nilai PPN PO" }
];

export function ImportWizard({ rawText, fileExt, onConfirm, onCancel }) {
  const [parsing, setParsing] = useState(true);
  const [dataRows, setDataRows] = useState([]);
  const [headers, setHeaders] = useState([]);

  // Mapping state: { [mappingKey]: csvHeaderName }
  const [mappings, setMappings] = useState({});
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [excludeText, setExcludeText] = useState("total");

  useEffect(() => {
    Papa.parse(rawText, {
      delimiter: fileExt === "tsv" ? "\t" : ",",
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        setParsing(false);
        const pulledHeaders = results.meta.fields || [];
        setHeaders(pulledHeaders);
        setDataRows(results.data || []);
        
        // Auto-select everything initially
        setSelectedRows(new Set((results.data || []).map((_, i) => i)));
        
        // Auto-guess mappings based on typical names
        const guessMap = {};
        const lowHeaders = pulledHeaders.map(h => h.toLowerCase().trim());
        
        const tryMatch = (appKey, possNames) => {
          for (const name of possNames) {
            const exactIdx = lowHeaders.indexOf(name);
            if (exactIdx >= 0) { guessMap[appKey] = pulledHeaders[exactIdx]; return; }
          }
          for (const name of possNames) {
            const partIdx = lowHeaders.findIndex(h => h.includes(name));
            if (partIdx >= 0) { guessMap[appKey] = pulledHeaders[partIdx]; return; }
          }
        };

        tryMatch("orderNo",   ["no po", "order no", "po number", "order"]);
        tryMatch("company",   ["company", "perusahaan", "customer"]);
        tryMatch("itemName",  ["item", "nama item", "description", "desc"]);
        tryMatch("qty",       ["qty", "quantity", "jumlah"]);
        tryMatch("unitPrice", ["unit price", "price", "harga"]);
        tryMatch("quoteRef",  ["quote ref", "no quotation"]);
        tryMatch("orderDate", ["order date", "tanggal"]);
        tryMatch("poStatus",  ["status"]);
        tryMatch("unit",      ["unit", "satuan"]);
        tryMatch("discount",  ["discount", "disc"]);
        tryMatch("discountPct",["disc%"]);
        tryMatch("itemStatus",["item status", "status item"]);
        tryMatch("deliveryDate",["delivery date", "tgl delivery"]);
        tryMatch("invoiceNo", ["invoice no", "no invoice", "inv"]);
        tryMatch("zoneType",  ["zone type", "zone"]);
        tryMatch("hsCode",    ["hs code"]);
        tryMatch("desc",      ["notes", "catatan", "keterangan"]);
        tryMatch("poExPPN",   ["ex ppn", "subtotal"]);
        tryMatch("poPPN",     ["ppn"]);

        setMappings(guessMap);
      },
      error: (err) => {
        alert("Gagal membaca file: " + err.message);
        onCancel();
      }
    });
  }, [rawText, fileExt, onCancel]);

  const toggleRow = (i) => {
    const next = new Set(selectedRows);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelectedRows(next);
  };

  const toggleAll = (e) => {
    if (e.target.checked) setSelectedRows(new Set(dataRows.map((_, i) => i)));
    else setSelectedRows(new Set());
  };

  const handleConfirm = () => {
    // Reconstruct the data array using ONLY the mapped keys for the selected rows.
    const finalData = [];
    dataRows.forEach((row, i) => {
      if (!selectedRows.has(i)) return; // Skipped by user

      // Map the user's headers to our strict mapping keys
      const mappedRow = {};
      Object.keys(mappings).forEach(mapKey => {
        const csvHeaderKey = mappings[mapKey];
        mappedRow[mapKey] = row[csvHeaderKey] || "";
      });

      // Simple validation for required fields on rows that are selected
      if (!mappedRow.orderNo || !mappedRow.company || !mappedRow.itemName) return; 
      
      finalData.push(mappedRow);
    });

    onConfirm(finalData);
  };

  const handleExclude = () => {
    if (!excludeText.trim()) return;
    const kw = excludeText.toLowerCase();
    const next = new Set(selectedRows);
    let count = 0;
    dataRows.forEach((row, i) => {
      if (!next.has(i)) return; // Already unchecked
      let hasWord = false;
      for (const key of Object.keys(row)) {
        if (String(row[key] || "").toLowerCase().includes(kw)) { hasWord = true; break; }
      }
      if (hasWord) {
        next.delete(i);
        count++;
      }
    });
    setSelectedRows(next);
    alert(`Dikecualikan ${count} baris yang mengandung "${excludeText}"`);
  };

  const csvOptions = [{ v: "", l: "-- Pilih Kolom --" }].concat(headers.map(h => ({ v: h, l: h })));

  return (
    <Modal open onClose={onCancel} title="Import Preview Wizard" wide>
      <div className="flex flex-col h-[70vh] min-w-[700px] w-full bg-[#fafcff]">
        {parsing ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">Loading & Membaca CSV/TSV...</div>
        ) : (
          <>
            <div className="flex gap-4 p-4 items-start border-b border-border-default overflow-x-auto bg-surface shrink-0">
              <div className="flex flex-col gap-2 p-3 border border-brand bg-brand-soft rounded-md min-w-[280px]">
                <div className="text-xs font-bold text-brand mb-1">Kolom Wajib (Required)</div>
                {REQUIRED_MAPPINGS.map(m => (
                  <div key={m.key} className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold w-[120px] text-text-secondary">{m.label}</span>
                    <FSel 
                      value={mappings[m.key] || ""} 
                      onChange={(v) => setMappings(p => ({ ...p, [m.key]: v }))} 
                      options={csvOptions} 
                      className="!py-1 !px-2 flex-1 text-[11px]" 
                      placeholder="--"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 p-3 border border-border-strong bg-surface-alt rounded-md min-w-[320px] max-h-[170px] overflow-y-auto">
                <div className="text-xs font-bold text-text-primary mb-1">Kolom Opsional</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {OPTIONAL_MAPPINGS.map(m => (
                    <div key={m.key} className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-text-secondary pl-1">{m.label}</span>
                      <FSel 
                        value={mappings[m.key] || ""} 
                        onChange={(v) => setMappings(p => ({ ...p, [m.key]: v }))} 
                        options={csvOptions} 
                        className="!py-1 !px-2 text-[11px]" 
                        placeholder="--"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1"></div>
              
              <div className="flex flex-col gap-2 p-3 bg-white border border-border-default rounded-md shadow-sm">
                 <div className="text-xs font-bold text-text-primary">Filter Pengecualian</div>
                 <div className="flex items-center gap-1">
                   <input type="text" value={excludeText} onChange={(e) => setExcludeText(e.target.value)} placeholder="Kata (mis: total)" className="border border-border-strong rounded px-2 py-1 text-[11px] w-[110px]" />
                   <Btn size="sm" variant="secondary" onClick={handleExclude}>Abaikan Baris</Btn>
                 </div>
              </div>

              <div className="flex flex-col gap-2 px-3 py-2 bg-white border border-border-default rounded-md shadow-sm items-center text-center max-w-[150px]">
                <span className="text-sm font-bold text-brand">{selectedRows.size} / {dataRows.length}</span>
                <span className="text-[10px] text-text-muted leading-tight">Baris dipilih untuk di-import</span>
                <Btn onClick={handleConfirm} disabled={selectedRows.size === 0}><Ico d={IC.check} size={12} /> Proses Import</Btn>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-alt z-10 shadow-sm border-b-2 border-border-strong">
                  <tr>
                    <th className="py-2 px-3 w-10">
                      <input type="checkbox" checked={selectedRows.size === dataRows.length && dataRows.length > 0} onChange={toggleAll} />
                    </th>
                    <th className="py-2 px-3 text-[10px] font-bold text-text-secondary w-12 border-r border-border-default">#</th>
                    {headers.map((h, idx) => (
                      <th key={idx} className="py-2 px-3 text-[10px] font-bold text-text-primary whitespace-nowrap border-r border-border-default truncate max-w-[150px]" title={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, i) => {
                    const sel = selectedRows.has(i);
                    return (
                      <tr key={i} className={`border-b border-border-default ${sel ? "" : "bg-[#f5f5f5] opacity-60"} hover:bg-surface-alt`}>
                        <td className="py-1 px-3">
                          <input type="checkbox" checked={sel} onChange={() => toggleRow(i)} />
                        </td>
                        <td className="py-1 px-3 text-[10px] text-text-muted border-r border-border-default">{i+1}</td>
                        {headers.map((h, idx) => {
                          const val = String(row[h] ?? "");
                          return (
                            <td key={idx} className="py-1 px-3 text-[11px] border-r border-border-default truncate max-w-[200px]" title={val}>
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {dataRows.length === 0 && (
                    <tr>
                      <td colSpan={headers.length + 2} className="py-10 text-center text-text-muted text-sm">File kosong atau struktur header tidak valid.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
