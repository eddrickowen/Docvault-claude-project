import { useState, useEffect, useRef } from "react";
import { SmartDate } from "./SmartDate";
import { fmtDate } from "../../lib/helpers";

/**
 * InlineCell — click-to-edit cell for tables.
 * Edit state renders as a fixed-position popup so table column widths stay stable.
 */
export function InlineCell({ value, onSave, type = "text", mono, width, placeholder, readOnly, isDate, select, opts }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value ?? "");
  const spanRef = useRef();
  const popRef = useRef();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!editing) setV(value ?? "");
  }, [value, editing]);

  const commit = (val) => { onSave(val ?? v); setEditing(false); };
  const cancel = () => { setV(value ?? ""); setEditing(false); };

  useEffect(() => {
    if (!editing) return;
    const h = (e) => {
      if (!popRef.current?.contains(e.target) && !spanRef.current?.contains(e.target)) cancel();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [editing]);

  const openEdit = () => {
    const r = spanRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 3, left: Math.max(8, Math.min(r.left, window.innerWidth - 230)) });
    setEditing(true);
  };

  const disp = isDate ? fmtDate(value) : value || "";

  if (readOnly) return <span className="text-xs text-text-muted truncate">{disp || "–"}</span>;

  return (
    <>
      <span
        ref={spanRef}
        onClick={openEdit}
        title={String(value || placeholder || "")}
        className={`cursor-text inline-block text-xs truncate max-w-full pb-px border-b border-dashed border-border-strong hover:border-brand ${
          mono ? "font-[JetBrains_Mono,monospace]" : ""
        } ${value ? "text-text-primary" : "text-text-muted"}`}
        style={{ minWidth: width || 36 }}
      >
        {disp || <span className="italic">{placeholder || "–"}</span>}
      </span>

      {editing && (
        <div
          ref={popRef}
          className="fixed z-[9999] bg-surface border border-border-strong rounded-lg shadow-[0_6px_20px_rgba(15,23,42,.15)] p-2 flex items-center gap-1.5"
          style={{ top: pos.top, left: pos.left, minWidth: isDate ? 180 : 190 }}
        >
          {isDate ? (
            <SmartDate value={value || ""} onChange={(val) => { onSave(val); setEditing(false); }} />
          ) : select ? (
            <select
              autoFocus
              value={v}
              onChange={(e) => setV(e.target.value)}
              onBlur={() => commit(v)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(v); if (e.key === "Escape") cancel(); }}
              className="text-[11px] border border-border-strong rounded bg-surface text-text-primary outline-none px-1.5 py-1 flex-1"
            >
              {opts?.map((o) => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
            </select>
          ) : (
            <>
              <input
                autoFocus
                type={type}
                value={v}
                onChange={(e) => setV(e.target.value)}
                onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                onKeyDown={(e) => { if (e.key === "Enter") commit(v); if (e.key === "Escape") cancel(); }}
                className={`text-xs border border-border-strong rounded-md bg-surface outline-none focus:border-brand px-2 py-1 flex-1 ${mono ? "font-mono" : ""}`}
                style={{ minWidth: 120 }}
              />
              <button
                onClick={() => commit(v)}
                className="shrink-0 bg-brand text-white border-none rounded-md text-[10px] px-2 py-1 cursor-pointer font-semibold"
              >
                OK
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
