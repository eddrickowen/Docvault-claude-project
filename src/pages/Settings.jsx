import { useState, useEffect } from "react";
import { Btn, Ico, IC, FGrid, FF, FIn, NumInput, FSel } from "../components/ui";
import { usePOStore } from "../store/usePOStore";
import { formatDO } from "../lib/helpers";
import { DEFAULT_DO_FIELDS, DEFAULT_EXCEL_ITEM_COLS, DEFAULT_EXCEL_PO_COLS } from "../lib/constants";

/* ── Class constants ── */
const cardCls    = "bg-surface border border-border-default rounded-[10px] p-5 shadow-sm mb-5";
const listRowCls = "flex items-center gap-3 py-2 px-3 bg-surface-alt rounded-md border border-border-default group hover:border-brand-mid transition-colors";

const Toggle = ({ checked, onChange, label, hint }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div className="relative shrink-0">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className={`block w-8 h-[18px] rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-surface-alt border border-border-strong'}`}></div>
      <div className={`absolute left-0.5 top-0.5 bg-white w-[14px] h-[14px] rounded-full transition-transform ${checked ? 'translate-x-3.5 shadow-sm' : ''}`}></div>
    </div>
    <div className="flex flex-col justify-center">
      <span className="text-[13px] font-semibold text-text-primary leading-tight">{label}</span>
      {hint && <span className="text-[11px] text-text-muted mt-0.5">{hint}</span>}
    </div>
  </label>
);

export function Settings() {
  const { settings, companies, zoneTypes, hsDB, saveSettings, saveCompanies, saveZoneTypes, saveHsDB, toast } = usePOStore();

  const [activeTab, setActiveTab] = useState("general");

  const [s,         setS]         = useState(settings);
  const [cos,       setCos]       = useState(companies);
  const [zones,     setZones]     = useState(zoneTypes);
  const [newCo,     setNewCo]     = useState("");
  const [newZone,   setNewZone]   = useState("");
  const [localHsDB, setLocalHsDB] = useState(hsDB);
  const [newHsCode, setNewHsCode] = useState("");
  const [newHsDesc, setNewHsDesc] = useState("");
  const [newUom,    setNewUom]    = useState("");
  const [coSearch,   setCoSearch]   = useState("");
  const [hsSearch,   setHsSearch]   = useState("");
  const [uomSearch,  setUomSearch]  = useState("");
  const [doFields,  setDoFields]  = useState(settings?.doFields || DEFAULT_DO_FIELDS);
  const [itemSearch, setItemSearch] = useState(settings?.itemSearchConfig || {
    includeItemName: true,
    includeDescription: true,
    includeInvoice: true,
    includeDOs: true,
    includePONumber: true,
    includeCompany: true,
    includeZone: true,
    includeHSCode: true,
    includeMainSupplier: true,
  });
  const [excelCols, setExcelCols] = useState(() => {
    const saved = settings?.excelItemCols || [];
    const keys  = saved.map((c) => c.key);
    return [...saved, ...DEFAULT_EXCEL_ITEM_COLS.filter((c) => !keys.includes(c.key))];
  });
  const [excelPOCols, setExcelPOCols] = useState(() => {
    const saved = settings?.excelPOCols || [];
    const keys  = saved.map((c) => c.key);
    return [...saved, ...DEFAULT_EXCEL_PO_COLS.filter((c) => !keys.includes(c.key))];
  });

  useEffect(() => { setLocalHsDB(hsDB); }, [hsDB]);

  const saveSets = () => {
    saveSettings({ ...s, doFields, excelItemCols: excelCols, excelPOCols, itemSearchConfig: itemSearch });
    toast("✓ Settings disimpan");
  };

  const handleExport = () => {
    const data = { settings: { ...s, doFields, excelItemCols: excelCols, excelPOCols }, companies: cos, zoneTypes: zones, hsDB: localHsDB };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `po-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("✓ Settings diekspor");
  };

  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.settings) { setS(data.settings); setDoFields(data.settings.doFields || DEFAULT_DO_FIELDS); setExcelCols(data.settings.excelItemCols || []); setExcelPOCols(data.settings.excelPOCols || []); saveSettings(data.settings); }
        if (data.companies) { setCos(data.companies); saveCompanies(data.companies); }
        if (data.zoneTypes) { setZones(data.zoneTypes); saveZoneTypes(data.zoneTypes); }
        if (data.hsDB)      { setLocalHsDB(data.hsDB); saveHsDB(data.hsDB); }
        toast("✓ Settings berhasil diimpor");
      } catch { toast("✗ File tidak valid"); }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const tglField = (key) => setDoFields((p) => p.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f));
  const preview  = typeof formatDO === "function" ? formatDO(s.doFormat || "DO/{YYYY}/{NNN}", 42) : "";

  const addCo   = () => { if (newCo.trim())   { const n = [...cos,   newCo.trim()];   setCos(n);   saveCompanies(n); setNewCo(""); } };
  const addZone = () => { if (newZone.trim())  { const n = [...zones, newZone.trim()]; setZones(n); saveZoneTypes(n); setNewZone(""); } };
  const addHs   = () => {
    if (newHsCode.trim()) {
      const n = [...localHsDB, { code: newHsCode.trim(), desc: newHsDesc.trim() }];
      setLocalHsDB(n); saveHsDB(n); setNewHsCode(""); setNewHsDesc("");
    }
  };
  const addUom = () => {
    if (newUom.trim()) {
      const { uom, saveUom } = usePOStore.getState();
      const n = [...uom, { v: newUom.toLowerCase().trim(), l: newUom.trim() }];
      saveUom(n); setNewUom("");
    }
  };

  const tabs = [
    { id: "general", label: "Umum & Organisasi", icon: IC.cog },
    { id: "lists", label: "Daftar Referensi", icon: IC.tag },
    { id: "templates", label: "Templates & Export", icon: IC.export },
    { id: "hscode", label: "HS Code Database", icon: IC.box },
    { id: "headers", label: "Label Kustom", icon: IC.tag },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-bg-app">
      {/* Header & Tabs */}
      <div className="flex flex-col border-b border-border-default bg-surface px-6 pt-5 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">System Settings</h1>
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" onClick={handleExport}><Ico d={IC.export} size={11} /> Export JSON</Btn>
            <label className="inline-flex items-center gap-1.5 rounded-md font-semibold cursor-pointer whitespace-nowrap select-none px-3.5 py-1.5 text-xs bg-white text-text-secondary border border-border-strong hover:bg-surface-alt hover:shadow-sm transition-all">
              <Ico d={IC.import} size={11} /> Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <Btn size="sm" variant="blue" className="ml-2" onClick={saveSets}><Ico d={IC.save} size={11} /> Simpan Semua</Btn>
          </div>
        </div>
        <div className="flex gap-6 mt-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 pb-3 px-1 border-b-2 font-semibold text-[13px] transition-colors ${activeTab === t.id ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              <Ico d={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[800px] mx-auto animate-fade-in">
          
          {/* TAB 1: GENERAL & ORGANIZATION */}
          {activeTab === "general" && (
            <div className="flex flex-col gap-5">
              <div className={cardCls}>
                <div className="text-[14px] font-bold text-text-primary mb-4 pb-2 border-b border-border-default">Identitas Organisasi</div>
                <div className="flex flex-col gap-4">
                  <FF label="Nama Perusahaan Utama">
                    <FIn value={s.vendorName || ""} onChange={(v) => setS((p) => ({ ...p, vendorName: v }))} placeholder="Atur nama vendor utama..." />
                  </FF>
                  <FF label="Alamat / Kontak">
                    <FIn value={s.vendorAddr || ""} onChange={(v) => setS((p) => ({ ...p, vendorAddr: v }))} placeholder="Jl. Raya..." />
                  </FF>
                  <FF label="Informasi Tambahan (Telepon / Email)">
                    <FIn value={s.vendorContact || ""} onChange={(v) => setS((p) => ({ ...p, vendorContact: v }))} placeholder="Tel: +62..." />
                  </FF>
                </div>
              </div>

              <div className={cardCls}>
                <div className="text-[14px] font-bold text-text-primary mb-4 pb-2 border-b border-border-default">Sistem Umum & Tampilan</div>
                <FGrid cols={2} className="gap-x-8 gap-y-5">
                  <FF label="Batas Hari Overdue" hint="Untuk PO Status Pending">
                    <NumInput value={s.overdueDays} onChange={(v) => setS((p) => ({ ...p, overdueDays: Math.max(1, v) }))} min={1} />
                  </FF>
                  <FF label="Default Rows (Pagination)" hint="Data per halaman">
                    <FSel value={s.paginationSize || 50} onChange={(v) => setS((p) => ({ ...p, paginationSize: v }))} options={[ {v: 50, l: "50 baris"}, {v: 100, l: "100 baris"}, {v: 500, l: "500 baris"}, {v: "All", l: "Semua (Tanpa batas)"} ]} />
                  </FF>
                  <FF label="Prefix Mata Uang" hint="Contoh: Rp. atau IDR">
                    <FIn value={s.currencySymbol || ""} onChange={(v) => setS((p) => ({ ...p, currencySymbol: v }))} placeholder="Rp." className="font-mono text-sm" />
                  </FF>
                  <div className="flex gap-4">
                    <FF label="Pemisah Ribuan" className="flex-1">
                      <FSel value={s.thousandSeparator || "."} onChange={(v) => setS((p) => ({ ...p, thousandSeparator: v }))} options={[ {v: ".", l: 'Titik ( . )'}, {v: ",", l: 'Koma ( , )'} ]} className="font-mono text-sm" />
                    </FF>
                    <FF label="Pemisah Desimal" className="flex-1">
                      <FSel value={s.decimalSeparator || ","} onChange={(v) => setS((p) => ({ ...p, decimalSeparator: v }))} options={[ {v: ",", l: 'Koma ( , )'}, {v: ".", l: 'Titik ( . )'} ]} className="font-mono text-sm" />
                    </FF>
                  </div>
                  <div className="col-span-2 mt-4">
                    <div className="text-[13px] font-bold text-text-primary mb-2">Pencarian Global di Halaman All Items</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Toggle
                        checked={itemSearch.includeItemName}
                        onChange={(v) => setItemSearch((p) => ({ ...p, includeItemName: v }))}
                        label="Nama Item"
                        hint="Termasuk nama item dalam pencarian"
                      />
                      <Toggle
                        checked={itemSearch.includeDescription}
                        onChange={(v) => setItemSearch((p) => ({ ...p, includeDescription: v }))}
                        label="Deskripsi Item"
                        hint="Termasuk kolom deskripsi"
                      />
                      <Toggle
                        checked={itemSearch.includeInvoice}
                        onChange={(v) => setItemSearch((p) => ({ ...p, includeInvoice: v }))}
                        label="Nomor Invoice"
                        hint="Cari berdasarkan invoice"
                      />
                      <Toggle
                        checked={itemSearch.includeDOs}
                        onChange={(v) => setItemSearch((p) => ({ ...p, includeDOs: v }))}
                        label="Nomor DO"
                        hint="Termasuk semua DO terkait item"
                      />
                      <Toggle
                        checked={itemSearch.includePONumber}
                        onChange={(v) => setItemSearch((p) => ({ ...p, includePONumber: v }))}
                        label="Nomor PO"
                        hint="Cari berdasarkan nomor PO induk"
                      />
                      <Toggle
                        checked={itemSearch.includeCompany}
                        onChange={(v) => setItemSearch((p) => ({ ...p, includeCompany: v }))}
                        label="Nama Perusahaan"
                        hint="Client / perusahaan PO"
                      />
                      <Toggle
                        checked={itemSearch.includeZone}
                        onChange={(v) => setItemSearch((p) => ({ ...p, includeZone: v }))}
                        label="Zone Type"
                        hint="Termasuk zona pengiriman (item / PO)"
                      />
                      <Toggle
                        checked={itemSearch.includeHSCode}
                        onChange={(v) => setItemSearch((p) => ({ ...p, includeHSCode: v }))}
                        label="HS Code"
                        hint="Cari berdasarkan HS Code item"
                      />
                      <Toggle
                        checked={itemSearch.includeMainSupplier}
                        onChange={(v) => setItemSearch((p) => ({ ...p, includeMainSupplier: v }))}
                        label="Supplier Utama"
                        hint="Termasuk nama supplier utama"
                      />
                    </div>
                  </div>
                </FGrid>
              </div>
            </div>
          )}

          {/* TAB 2: LIST REFERENCES */}
          {activeTab === "lists" && (
            <div className="flex flex-col gap-5">
              <div className={cardCls}>
                <div className="flex flex-col gap-2 mb-4 max-h-[250px] overflow-y-auto pr-1">
                  <div className="mb-2">
                    <FIn value={coSearch} onChange={setCoSearch} placeholder="Cari perusahaan..." className="!py-1 !px-2 !text-xs" />
                  </div>
                  {(cos || []).filter(c => String(c.name || c).toLowerCase().includes(coSearch.toLowerCase())).map((c, i) => (
                    <div key={i} className={listRowCls}>
                      <Ico d={IC.users} size={14} color="var(--color-text-muted)" className="opacity-50" />
                      <span className="flex-1 text-[13px] font-semibold text-text-primary">{typeof c === 'object' ? c.name : c}</span>
                      <Btn size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 hover:text-red transition-opacity" onClick={() => { const n = cos.filter((_, j) => j !== i); setCos(n); saveCompanies(n); }}>
                        <Ico d={IC.trash} size={12} />
                      </Btn>
                    </div>
                  ))}
                  {(cos || []).length === 0 && <span className="text-sm text-text-muted py-2">Belum ada data perusahaan.</span>}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Ico d={IC.plus} size={12} color="var(--color-text-muted)" className="absolute left-3 top-1/2 -translate-y-1/2" />
                    <FIn value={newCo} onChange={setNewCo} placeholder="Tambahkan perusahaan baru..." className="pl-8 !py-1.5" onKeyDown={(e) => e.key === "Enter" && addCo()} />
                  </div>
                  <Btn onClick={addCo} variant="secondary" size="sm">Tambah</Btn>
                </div>
              </div>

              <div className={cardCls}>
                <div className="text-[14px] font-bold text-text-primary mb-3">Unit of Measure (UOM)</div>
                <div className="flex flex-col gap-2 mb-4 max-h-[200px] overflow-y-auto pr-1">
                  <div className="mb-2">
                    <FIn value={uomSearch} onChange={setUomSearch} placeholder="Cari UOM..." className="!py-1 !px-2 !text-xs" />
                  </div>
                  {(usePOStore.getState().uom || []).filter(u => u.l.toLowerCase().includes(uomSearch.toLowerCase())).map((u, i) => (
                    <div key={i} className={listRowCls}>
                      <span className="flex-1 text-[13px] font-semibold text-text-primary">{u.l} ({u.v})</span>
                      <Btn size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 hover:text-red transition-opacity" onClick={() => { 
                        const old = usePOStore.getState().uom;
                        const n = old.filter((_, j) => j !== i); 
                        usePOStore.getState().saveUom(n);
                      }}>
                        <Ico d={IC.trash} size={12} />
                      </Btn>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <FIn value={newUom} onChange={setNewUom} placeholder="UOM Baru (Pcs, Box...)" className="!py-1.5" onKeyDown={(e) => e.key === "Enter" && addUom()} />
                  <Btn onClick={addUom} variant="secondary" size="sm">Tambah</Btn>
                </div>
              </div>

              <div className={cardCls}>
                <div className="text-[14px] font-bold text-text-primary mb-3">Zona Pengiriman (Zone Types)</div>
                <div className="flex flex-col gap-2 mb-4">
                  {(zones || []).map((z, i) => (
                    <div key={i} className={listRowCls}>
                      <Ico d={IC.pin} size={14} color="var(--color-text-muted)" className="opacity-50" />
                      <span className="flex-1 text-[13px] font-semibold text-text-primary">{typeof z === 'object' ? z.name : z}</span>
                      <Btn size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 hover:text-red transition-opacity" onClick={() => { const n = zones.filter((_, j) => j !== i); setZones(n); saveZoneTypes(n); }}>
                        <Ico d={IC.trash} size={12} />
                      </Btn>
                    </div>
                  ))}
                  {(zones || []).length === 0 && <span className="text-sm text-text-muted py-2">Belum ada daftar zone.</span>}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Ico d={IC.plus} size={12} color="var(--color-text-muted)" className="absolute left-3 top-1/2 -translate-y-1/2" />
                    <FIn value={newZone} onChange={setNewZone} placeholder="Tambahkan zona baru..." className="pl-8" onKeyDown={(e) => e.key === "Enter" && addZone()} />
                  </div>
                  <Btn onClick={addZone} variant="secondary">Tambah</Btn>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEMPLATES & REPORT EXPORT */}
          {activeTab === "templates" && (
            <div className="flex flex-col gap-5">
              <div className={cardCls}>
                <div className="text-[14px] font-bold text-text-primary mb-4 pb-2 border-b border-border-default">Surat Jalan (DO) Generator Template</div>
                <div className="flex flex-col gap-5">
                  <FF label="Format Auto-Nomor Surat Jalan" hint="Token yang tersedia: {YYYY} {YY} {MM} {NNN} {NN} {N}">
                    <div className="flex gap-2 items-center w-full max-w-[500px]">
                      <div className="flex-1">
                        <FIn value={s.doFormat || ""} onChange={(v) => setS((p) => ({ ...p, doFormat: v }))} placeholder="DO/{YYYY}/{NNN}" className="font-mono" />
                      </div>
                      <div className="px-3 py-[7px] bg-brand-soft border border-brand-mid rounded-md text-xs font-mono font-bold text-brand whitespace-nowrap">
                        {preview}
                      </div>
                    </div>
                  </FF>
                  
                  <div>
                    <div className="text-[12px] font-semibold text-text-primary mb-3">Field Meta Surat Jalan Aktif</div>
                    <div className="grid grid-cols-2 gap-4">
                      {(doFields || []).map((f) => (
                        <div key={f.key} className="bg-surface-alt border border-border-default rounded-md p-3">
                          <Toggle checked={f.enabled} onChange={() => tglField(f.key)} label={f.label} hint={`Type: ${f.type}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={cardCls}>
                <div className="flex items-center justify-between mb-4 border-b border-border-default pb-2">
                  <div className="text-[14px] font-bold text-text-primary">Struktur Copy ke Excel TSV (All Items)</div>
                  <div className="text-[11px] text-text-muted italic">Geser menggunakan panah untuk re-order</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {excelCols.map((c, i) => (
                    <div key={c.key} className={`flex items-center gap-3 py-2 px-3 rounded-md border transition-all ${c.enabled ? "border-brand-mid bg-brand-soft shadow-sm" : "border-border-default bg-surface-alt opacity-75"}`}>
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-surface text-[10px] font-bold text-text-muted border border-border-strong shrink-0">{i + 1}</div>
                      <Toggle checked={c.enabled} onChange={() => setExcelCols((p) => p.map((x) => x.key === c.key ? { ...x, enabled: !x.enabled } : x))} label={c.label} />
                      <div className="flex flex-col gap-0.5 ml-auto border-l border-border-strong pl-2 shrink-0">
                        <button type="button" disabled={i === 0} onClick={() => setExcelCols((p) => { const a = [...p]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; })} className="text-[14px] leading-none hover:text-brand disabled:opacity-30 disabled:hover:text-text-secondary transition-colors pb-0.5">▴</button>
                        <button type="button" disabled={i === excelCols.length-1} onClick={() => setExcelCols((p) => { const a = [...p]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; })} className="text-[14px] leading-none hover:text-brand disabled:opacity-30 disabled:hover:text-text-secondary transition-colors pt-0.5">▾</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardCls}>
                <div className="flex items-center justify-between mb-4 border-b border-border-default pb-2">
                  <div className="text-[14px] font-bold text-text-primary">Struktur Copy ke Excel TSV (PO Summary)</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {excelPOCols.map((c, i) => (
                    <div key={c.key} className={`flex items-center gap-3 py-2 px-3 rounded-md border transition-all ${c.enabled ? "border-brand-mid bg-brand-soft shadow-sm" : "border-border-default bg-surface-alt opacity-75"}`}>
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-surface text-[10px] font-bold text-text-muted border border-border-strong shrink-0">{i + 1}</div>
                      <Toggle checked={c.enabled} onChange={() => setExcelPOCols((p) => p.map((x) => x.key === c.key ? { ...x, enabled: !x.enabled } : x))} label={c.label} />
                      <div className="flex flex-col gap-0.5 ml-auto border-l border-border-strong pl-2 shrink-0">
                        <button type="button" disabled={i === 0} onClick={() => setExcelPOCols((p) => { const a = [...p]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; })} className="text-[14px] leading-none hover:text-brand disabled:opacity-30 border-none bg-transparent">▴</button>
                        <button type="button" disabled={i === excelPOCols.length-1} onClick={() => setExcelPOCols((p) => { const a = [...p]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; })} className="text-[14px] leading-none hover:text-brand disabled:opacity-30 border-none bg-transparent">▾</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HS CODE DB */}
          {activeTab === "hscode" && (
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-default">
                <div className="flex flex-col">
                  <div className="text-[14px] font-bold text-text-primary">HS Code Master Database</div>
                  <div className="text-[11px] text-text-muted mt-0.5">Database referensi validasi kode perpajakan ({localHsDB.length} kode tercatat)</div>
                </div>
                <Btn size="sm" variant="blue" onClick={() => { saveHsDB(localHsDB); toast("✓ HS Code disimpan"); }}><Ico d={IC.save} size={11} /> Update DB</Btn>
              </div>
              
              <div className="flex flex-col gap-3 mb-4 bg-surface-alt p-3 rounded-lg border border-border-default">
                <div className="flex gap-2 items-center">
                  <Ico d={IC.search} size={14} color="var(--color-text-muted)" />
                  <FIn value={hsSearch} onChange={setHsSearch} placeholder="Cari HS Code atau Deskripsi..." className="flex-1 !py-1 text-xs" />
                </div>
                <div className="flex gap-2 items-center">
                  <FIn value={newHsCode} onChange={setNewHsCode} placeholder="Ketik Kode (Mis: 8481.20)" className="w-[180px] font-mono text-sm" />
                  <FIn value={newHsDesc} onChange={setNewHsDesc} placeholder="Deskripsi/Nama Barang Singkat..." className="flex-1" onKeyDown={(e) => e.key === "Enter" && addHs()} />
                  <Btn onClick={addHs} size="sm"><Ico d={IC.plus} size={11} /> Tambah Code</Btn>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto border border-border-default rounded-md bg-white">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-alt border-b border-border-strong sticky top-0">
                    <tr>
                      <th className="py-2 px-4 text-xs font-bold text-text-secondary w-[180px]">HS Code</th>
                      <th className="py-2 px-4 text-xs font-bold text-text-secondary">Deskripsi Klasifikasi</th>
                      <th className="py-2 px-4 w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {!(localHsDB || []).length && (
                      <tr><td colSpan={3} className="py-8 text-center text-sm text-text-muted italic">Database HS Code masih kosong.</td></tr>
                    )}
                    {(localHsDB || []).filter(h => h.code.includes(hsSearch) || h.desc.toLowerCase().includes(hsSearch.toLowerCase())).map((h, i) => (
                      <tr key={i} className="border-b border-border-default hover:bg-surface-alt group">
                        <td className="py-2 px-4">
                          <input 
                            className="font-mono text-[12px] font-bold text-brand bg-brand-soft px-2 py-0.5 rounded outline-none w-full border border-transparent focus:border-brand-mid"
                            value={h.code}
                            onChange={(e) => {
                              const n = [...localHsDB];
                              n[i] = { ...n[i], code: e.target.value };
                              setLocalHsDB(n);
                            }}
                          />
                        </td>
                        <td className="py-2 px-4 text-[13px] text-text-primary">
                          <input 
                            className="w-full bg-transparent outline-none border border-transparent focus:border-brand-mid px-1 py-0.5 rounded"
                            value={h.desc}
                            onChange={(e) => {
                              const n = [...localHsDB];
                              n[i] = { ...n[i], desc: e.target.value };
                              setLocalHsDB(n);
                            }}
                          />
                        </td>
                        <td className="py-2 px-4 text-right">
                          <Btn size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 hover:text-red transition-all !p-1 w-6 h-6 justify-center" onClick={() => { const n = localHsDB.filter((_, j) => j !== i); setLocalHsDB(n); saveHsDB(n); }}>
                            <Ico d={IC.trash} size={12} />
                          </Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOM LABELS */}
          {activeTab === "headers" && (
            <div className={cardCls}>
              <div className="text-[14px] font-bold text-text-primary mb-4 pb-2 border-b border-border-default">Konfigurasi Label Header Kontainer</div>
              <div className="flex flex-col gap-4">
                <FF label="Label PO (Aplikasi)" hint="Default: Purchase Orders">
                  <FIn value={s.labelPO || "Purchase Orders"} onChange={(v) => setS(p => ({ ...p, labelPO: v }))} />
                </FF>
                <FF label="Label Item (Aplikasi)" hint="Default: Semua Item">
                  <FIn value={s.labelItem || "Semua Item"} onChange={(v) => setS(p => ({ ...p, labelItem: v }))} />
                </FF>
                <FF label="Label NO PO pada Tabel" hint="Default: NO PO/ORDER">
                  <FIn value={s.labelNoPO || "NO PO/ORDER"} onChange={(v) => setS(p => ({ ...p, labelNoPO: v }))} />
                </FF>
                <FF label="Label Nama Barang pada Tabel" hint="Default: NAMA ITEM">
                  <FIn value={s.labelItemName || "NAMA ITEM"} onChange={(v) => setS(p => ({ ...p, labelItemName: v }))} />
                </FF>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
