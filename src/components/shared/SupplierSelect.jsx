import { useState, useEffect, useRef } from "react";
import { Ico, IC } from "../ui";

const inputCls =
  "w-full bg-surface border border-border-strong rounded-[7px] px-2 py-[5px] text-[11px] text-text-primary outline-none focus:border-brand";
const dropBase =
  "fixed z-[9999] bg-surface border border-border-strong rounded-lg shadow-[0_8px_24px_rgba(15,23,42,.15)] max-h-[220px] flex flex-col";

/**
 * SupplierSelect — searchable supplier dropdown with tags and add-new option.
 */
export function SupplierSelect({ value, onChange, suppliers, onAddNew, placeholder = "Pilih supplier..." }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef();
  const dropRef = useRef();
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 300 });

  const active = suppliers.find((s) => s.id === value);
  const list = suppliers.filter(
    (s) =>
      !s.deletedAt &&
      (!q || s.name.toLowerCase().includes(q.toLowerCase()) || s.tags?.some((t) => t.includes(q.toLowerCase())))
  );

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!dropRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const doOpen = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setDropPos({ top: r.bottom + 3, left: r.left, width: r.width });
    setOpen((v) => !v);
    setQ("");
  };

  return (
    <div ref={btnRef} className="relative flex-1 min-w-0">
      {/* Trigger */}
      <div
        onClick={doOpen}
        className={`w-full border rounded-[7px] cursor-pointer flex items-center gap-2 py-[7px] px-2.5 ${
          open ? "bg-brand-soft border-brand" : "bg-surface border-border-strong"
        }`}
      >
        {active ? (
          <div className="flex items-center gap-[7px] flex-1 min-w-0">
            <span className="w-[7px] h-[7px] rounded-full bg-green shrink-0" />
            <span className="text-xs font-semibold text-text-primary truncate flex-1">{active.name}</span>
            {active.tags?.slice(0, 2).map((t) => (
              <span key={t} className="text-[9px] text-brand bg-brand-soft rounded-[3px] px-1 shrink-0">{t}</span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-text-muted flex-1">{placeholder}</span>
        )}
        {value && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="bg-transparent border-none cursor-pointer text-text-muted flex p-0 shrink-0"
          >
            <Ico d={IC.close} size={11} />
          </button>
        )}
        <Ico d={IC.chevD} size={12} color="var(--color-text-muted)" />
      </div>

      {/* Dropdown */}
      {open && (
        <div ref={dropRef} className={dropBase} style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}>
          <div className="p-[7px_9px] border-b border-border-default shrink-0">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama atau tag..."
              className={inputCls}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {!list.length && (
              <div className="p-3 text-[11px] text-text-muted text-center">Tidak ditemukan</div>
            )}
            {list.map((s) => (
              <div
                key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); setQ(""); }}
                className="py-2 px-3 cursor-pointer flex items-center gap-2 border-b border-border-default hover:bg-bg-app"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-text-primary truncate">{s.name}</div>
                  {s.tags?.length > 0 && (
                    <div className="flex gap-[3px] mt-0.5 flex-wrap">
                      {s.tags.slice(0, 4).map((t) => (
                        <span key={t} className="text-[9px] text-brand bg-brand-soft rounded-[3px] px-1">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                {s.id === value && <Ico d={IC.check} size={12} color="var(--color-green)" />}
              </div>
            ))}
          </div>
          {onAddNew && (
            <div
              onClick={() => { setOpen(false); setQ(""); onAddNew(); }}
              className="py-2 px-3 border-t border-border-default cursor-pointer flex items-center gap-[7px] bg-surface-alt hover:bg-bg-app"
            >
              <Ico d={IC.plus} size={13} color="var(--color-brand)" />
              <span className="text-xs font-semibold text-brand">+ Tambah Supplier Baru</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
