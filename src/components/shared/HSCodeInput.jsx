import { useState, useEffect, useRef, useMemo } from "react";
import { Ico, IC } from "../ui";

const inputCls =
  "w-full bg-surface border border-border-strong rounded-[7px] px-2 py-1 text-[11px] text-text-primary outline-none focus:border-brand font-[JetBrains_Mono,monospace]";
const dropBase =
  "fixed z-[9999] bg-surface border border-border-strong rounded-[7px] shadow-[0_6px_20px_rgba(15,23,42,.15)] max-h-[260px] overflow-y-auto";

/**
 * HSCodeInput — autocomplete dropdown for HS tariff codes.
 * `hsDB` is an array of { code, desc }.
 */
export function HSCodeInput({ value, onChange, placeholder, className, hsDB = [] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef();
  const inputRef = useRef();
  const dropRef = useRef();
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 360 });

  const filtered = useMemo(() => {
    const s = (q || value || "").toLowerCase().trim();
    if (!s) return hsDB.slice(0, 12);
    return hsDB.filter((h) => h.code.includes(s) || h.desc.toLowerCase().includes(s)).slice(0, 15);
  }, [q, value, hsDB]);

  const openDrop = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) {
      setDropPos({
        top: r.bottom + 3,
        left: Math.min(r.left, window.innerWidth - Math.max(r.width, 400)),
        width: Math.max(r.width, 400),
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!dropRef.current?.contains(e.target) && !wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const matchedDesc = useMemo(
    () => (!focused && value ? hsDB.find((h) => h.code === value)?.desc || null : null),
    [focused, value, hsDB]
  );

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-0">
        <input
          ref={inputRef}
          value={focused ? q : value || ""}
          onChange={(e) => {
            setQ(e.target.value);
            onChange(e.target.value);
            if (!open) openDrop();
          }}
          onFocus={() => {
            setFocused(true);
            setQ(value || "");
            openDrop();
          }}
          onBlur={() => {
            setTimeout(() => {
              setFocused(false);
              setOpen(false);
            }, 150);
          }}
          placeholder={placeholder || "8481.20.00 – ketik untuk cari"}
          className={`${inputCls} pr-7 ${className || ""}`}
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (open) setOpen(false);
            else openDrop();
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted flex p-0.5"
        >
          <Ico d={IC.chevD} size={12} color={open ? "var(--color-brand)" : "var(--color-text-muted)"} />
        </button>
      </div>

      {matchedDesc && (
        <div className="text-[10px] text-text-secondary mt-0.5 pl-0.5 truncate max-w-full" title={matchedDesc}>
          ↳ {matchedDesc}
        </div>
      )}

      {open && filtered.length > 0 && (
        <div ref={dropRef} className={dropBase} style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}>
          {filtered.map((h) => (
            <div
              key={h.code}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(h.code);
                setQ(h.code);
                setOpen(false);
              }}
              className="flex gap-2.5 py-[7px] px-3 cursor-pointer items-center hover:bg-brand-soft"
            >
              <span className="font-[JetBrains_Mono,monospace] text-[11px] font-bold text-brand whitespace-nowrap">
                {h.code}
              </span>
              <span className="text-[11px] text-text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
                {h.desc}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
