import { useState, useEffect, useRef, useMemo } from "react";
import { Ico, IC } from "../ui";

/**
 * Searchable dropdown with position:fixed — replaces FSel for key fields.
 */
export function SearchSelect({ value, onChange, options, placeholder, className = "" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef();
  const dropRef = useRef();
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });

  const sel = options.find((o) => (o.v ?? o) === value);
  const filtered = q
    ? options.filter((o) => (o.l ?? o).toLowerCase().includes(q.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!dropRef.current?.contains(e.target) && !btnRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const doOpen = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r)
      setPos({
        top: r.bottom + 2,
        left: Math.min(r.left, window.innerWidth - Math.max(r.width, 220)),
        width: Math.max(r.width, 220),
      });
    setOpen((v) => !v);
    setQ("");
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={btnRef}
        onClick={doOpen}
        className="w-full bg-surface border border-border-strong rounded-[7px] px-2.5 py-[7px] text-xs text-text-primary cursor-pointer flex items-center gap-1.5"
      >
        <span className={`flex-1 truncate text-xs ${sel ? "text-text-primary" : "text-text-muted"}`}>
          {sel ? (sel.l ?? sel) : placeholder || "— Pilih —"}
        </span>
        <Ico d={IC.chevD} size={11} color="var(--color-text-muted)" />
      </div>

      {open && (
        <div
          ref={dropRef}
          className="fixed z-[9999] bg-surface border border-border-strong rounded-lg shadow-[0_8px_24px_rgba(15,23,42,.15)] max-h-[260px] flex flex-col"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className="p-1.5 border-b border-border-default shrink-0">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari..."
              className="w-full bg-surface border border-border-strong rounded-[7px] px-2 py-1 text-[11px] text-text-primary outline-none focus:border-brand"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <div
              onClick={() => { onChange(""); setOpen(false); }}
              className="px-3 py-[7px] cursor-pointer text-xs text-text-muted italic border-b border-border-default hover:bg-bg-app"
            >
              {placeholder || "— Pilih —"}
            </div>
            {filtered.map((o) => {
              const v = o.v ?? o;
              const l = o.l ?? o;
              return (
                <div
                  key={v}
                  onClick={() => { onChange(v); setOpen(false); }}
                  className={`px-3 py-[7px] cursor-pointer text-xs flex items-center gap-2 hover:bg-brand-soft ${v === value ? "bg-brand-soft" : ""}`}
                >
                  <span className="flex-1">{l}</span>
                  {v === value && <Ico d={IC.check} size={11} color="var(--color-brand)" />}
                </div>
              );
            })}
            {!filtered.length && (
              <div className="p-3 text-[11px] text-text-muted text-center">Tidak ada</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
