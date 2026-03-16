import { useState, useEffect, useRef, useMemo } from "react";
import { Ico, IC, Btn } from "../ui";
import { today } from "../../lib/helpers";
import { SmartDate } from "./SmartDate";

const dropBase =
  "fixed z-[9999] bg-surface border border-border-strong rounded-lg shadow-[0_8px_28px_rgba(15,23,42,.18)]";
const filterBtn = (active) =>
  `bg-transparent border-none cursor-pointer p-[1px_3px] inline-flex align-middle ${active ? "text-brand" : "text-border-strong"}`;
const quickBtn =
  "text-[10px] px-2 py-[3px] rounded border border-border-strong bg-bg-app cursor-pointer text-text-secondary font-[Inter,sans-serif]";
const inputCls =
  "w-full bg-surface border border-border-strong rounded-[7px] px-2 py-1 text-[11px] text-text-primary outline-none focus:border-brand";

/**
 * DateRangeFilter — for date columns (Tgl Order, Delivery, etc.)
 */
export function DateRangeFilter({ active, onApply, label }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const btnRef = useRef();
  const dropRef = useRef();
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const now = new Date();

  const applyQuick = (k) => {
    let f = "", t = today();
    if (k === "bulan_ini") f = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    else if (k === "bulan_lalu") { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); f = d.toISOString().slice(0, 10); t = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10); }
    else if (k === "3_bulan") { const d = new Date(); d.setMonth(d.getMonth() - 3); f = d.toISOString().slice(0, 10); }
    else if (k === "tahun_ini") f = `${now.getFullYear()}-01-01`;
    onApply({ from: f, to: t }); setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!dropRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          const r = btnRef.current?.getBoundingClientRect();
          if (r) setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 280) });
          setFrom(active?.from || ""); setTo(active?.to || ""); setOpen((v) => !v);
        }}
        title={`Filter tanggal ${label || ""}`}
        className={filterBtn(active)}
      >
        <Ico d={IC.cal} size={10} color={active ? "var(--color-brand)" : "var(--color-border-strong)"} />
      </button>
      {open && (
        <div ref={dropRef} className={`${dropBase} w-[270px] p-3`} style={{ top: pos.top, left: pos.left }}>
          <div className="text-[10px] font-bold text-text-secondary mb-2 uppercase tracking-wide">
            Filter Tanggal{label ? " · " + label : ""}
          </div>
          <div className="flex flex-wrap gap-1 mb-2.5">
            {[["bulan_ini", "Bulan Ini"], ["bulan_lalu", "Bulan Lalu"], ["3_bulan", "3 Bulan"], ["tahun_ini", "Tahun Ini"]].map(([k, l]) => (
              <button key={k} onClick={() => applyQuick(k)} className={quickBtn}>{l}</button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <div>
              <div className="text-[10px] text-text-secondary mb-1">Dari</div>
              <SmartDate value={from} onChange={setFrom} />
            </div>
            <div>
              <div className="text-[10px] text-text-secondary mb-1">Sampai</div>
              <SmartDate value={to} onChange={(v) => { setTo(v); if (v && (from || v)) { onApply({ from, to: v }); setOpen(false); } }} />
            </div>
          </div>
          <div className="flex gap-1.5 mt-2.5">
            <Btn size="sm" variant="ghost" onClick={() => { onApply(null); setOpen(false); }} className="flex-1">Clear</Btn>
            <Btn size="sm" onClick={() => { if (from || to) onApply({ from, to }); setOpen(false); }} className="flex-1">OK</Btn>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * NumberRangeFilter — for numeric columns (Total, Net, Margin, Qty)
 */
export function NumberRangeFilter({ active, onApply, label }) {
  const [open, setOpen] = useState(false);
  const [mn, setMn] = useState("");
  const [mx, setMx] = useState("");
  const btnRef = useRef();
  const dropRef = useRef();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!dropRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          const r = btnRef.current?.getBoundingClientRect();
          if (r) setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 240) });
          setMn(active?.min != null ? String(active.min) : "");
          setMx(active?.max != null ? String(active.max) : "");
          setOpen((v) => !v);
        }}
        title={`Filter angka ${label || ""}`}
        className={filterBtn(active)}
      >
        <Ico d={IC.percent} size={10} color={active ? "var(--color-brand)" : "var(--color-border-strong)"} />
      </button>
      {open && (
        <div ref={dropRef} className={`${dropBase} w-[230px] p-3`} style={{ top: pos.top, left: pos.left }}>
          <div className="text-[10px] font-bold text-text-secondary mb-2 uppercase tracking-wide">
            Filter Angka{label ? " · " + label : ""}
          </div>
          <div className="flex flex-wrap gap-1 mb-2.5">
            {[[">0", { min: 1, max: null }], ["Ada Nilai", { min: 0.01, max: null }], ["Kosong", { empty: true }]].map(([l, v]) => (
              <button key={l} onClick={() => { onApply(v); setOpen(false); }} className={quickBtn}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-[10px] text-text-secondary mb-1">Min</div><input type="number" value={mn} onChange={(e) => setMn(e.target.value)} placeholder="0" className={inputCls} onKeyDown={(e) => { if (e.key === "Enter") { const a = mn !== "" ? Number(mn) : null; const b = mx !== "" ? Number(mx) : null; if (a !== null || b !== null) onApply({ min: a, max: b }); setOpen(false); } }} /></div>
            <div><div className="text-[10px] text-text-secondary mb-1">Max</div><input type="number" value={mx} onChange={(e) => setMx(e.target.value)} placeholder="∞" className={inputCls} onKeyDown={(e) => { if (e.key === "Enter") { const a = mn !== "" ? Number(mn) : null; const b = mx !== "" ? Number(mx) : null; if (a !== null || b !== null) onApply({ min: a, max: b }); setOpen(false); } }} /></div>
          </div>
          <div className="flex gap-1.5 mt-2.5">
            <Btn size="sm" variant="ghost" onClick={() => { onApply(null); setOpen(false); }} className="flex-1">Clear</Btn>
            <Btn size="sm" onClick={() => { const a = mn !== "" ? Number(mn) : null; const b = mx !== "" ? Number(mx) : null; if (a !== null && b !== null && a > b) return; if (a !== null || b !== null) onApply({ min: a, max: b }); setOpen(false); }} className="flex-1">OK</Btn>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * TextFilter — per column text filter
 */
export function TextFilter({ active, onApply, label }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(active || "");
  useEffect(() => { if (!open) setVal(active || ""); }, [active, open]);
  const btnRef = useRef();
  const dropRef = useRef();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!dropRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          const r = btnRef.current?.getBoundingClientRect();
          if (r) setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 220) });
          setVal(active || ""); setOpen((v) => !v);
        }}
        title={`Filter teks ${label || ""}`}
        className={filterBtn(active)}
      >
        <Ico d={IC.search} size={10} color={active ? "var(--color-brand)" : "var(--color-border-strong)"} />
      </button>
      {open && (
        <div ref={dropRef} className={`${dropBase} w-[220px] p-3`} style={{ top: pos.top, left: pos.left }}>
          <div className="text-[10px] font-bold text-text-secondary mb-2">Filter Teks{label ? " · " + label : ""}</div>
          <input
            autoFocus value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { onApply(val || null); setOpen(false); } }}
            placeholder="Ketik untuk filter..." className={inputCls}
          />
          <div className="flex gap-1.5 mt-2">
            <Btn size="sm" variant="ghost" onClick={() => { setVal(""); onApply(null); setOpen(false); }} className="flex-1">Clear</Btn>
            <Btn size="sm" onClick={() => { onApply(val || null); setOpen(false); }} className="flex-1">OK</Btn>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * ColFilter — checkbox filter for column unique values
 */
export function ColFilter({ col, rows, keyFn, labelFn, active, onApply }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const btnRef = useRef();
  const dropRef = useRef();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const vals = useMemo(() => {
    const m = new Map();
    (rows || []).forEach((r) => {
      const k = String(keyFn ? keyFn(r) : (r[col] ?? ""));
      const l = labelFn ? labelFn(r) : k;
      if (!m.has(k)) m.set(k, l);
    });
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows, col, keyFn, labelFn]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!dropRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const doOpen = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 230) });
    setSel(active ? new Set(active) : null);
    setOpen(true);
  };

  const filtered = vals.filter(([, l]) => !q || l.toLowerCase().includes(q.toLowerCase()));
  const allSel = !sel || sel.size === 0;
  const isChk = (k) => allSel || sel.has(k);
  const toggle = (k) => {
    const base = allSel ? new Set(vals.map(([k2]) => k2)) : new Set(sel);
    base.has(k) ? base.delete(k) : base.add(k);
    setSel(base.size === vals.length ? null : base);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); doOpen(); }}
        title="Filter kolom"
        className={filterBtn(active && active.size > 0)}
      >
        <Ico d={IC.filter} size={10} color={active && active.size > 0 ? "var(--color-brand)" : "var(--color-border-strong)"} />
      </button>
      {open && (
        <div ref={dropRef} className={`${dropBase} w-[220px] max-h-[300px] flex flex-col`} style={{ top: pos.top, left: pos.left }}>
          <div className="p-[7px_9px] border-b border-border-default">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." className={`${inputCls} py-[5px]`} />
          </div>
          <div className="overflow-y-auto flex-1">
            <label className="flex items-center gap-2 px-3 py-[7px] cursor-pointer border-b border-border-default text-[11px] font-semibold">
              <input type="checkbox" checked={allSel} onChange={() => setSel(null)} />(Semua)
            </label>
            {filtered.map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[11px] hover:bg-bg-app">
                <input type="checkbox" checked={isChk(k)} onChange={() => toggle(k)} />
                <span className="flex-1 truncate" title={l}>{l || "(Kosong)"}</span>
              </label>
            ))}
            {!filtered.length && <div className="p-3 text-[11px] text-text-muted text-center">Tidak ada</div>}
          </div>
          <div className="flex gap-1.5 p-2 border-t border-border-default">
            <Btn size="sm" variant="ghost" onClick={() => { onApply(null); setOpen(false); }} className="flex-1">Clear</Btn>
            <Btn size="sm" onClick={() => { onApply(sel && sel.size < vals.length ? sel : null); setOpen(false); }} className="flex-1">OK</Btn>
          </div>
        </div>
      )}
    </>
  );
}
