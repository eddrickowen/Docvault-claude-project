import { useState } from "react";

/**
 * Shared input base classes — maps the old `iB` constant to Tailwind.
 */
const inputBase =
  "w-full bg-surface border border-border-strong rounded-[7px] px-2.5 py-[7px] text-sm text-text-primary outline-none font-[Inter,sans-serif] transition-[border-color] duration-150 focus:border-brand";

const readOnlyExtra = "bg-surface-alt";

/**
 * Form Grid — simple CSS grid wrapper.
 */
export function FGrid({ children, cols = 2, gap = 12 }) {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}
    >
      {children}
    </div>
  );
}

/**
 * Form Field — label + input wrapper used inside FGrid.
 */
export function FF({ label, span = 1, children, hint, required }) {
  return (
    <div className="flex flex-col gap-1" style={{ gridColumn: `span ${span}` }}>
      <label className="text-[13px] font-semibold text-text-secondary flex items-center gap-1">
        {label}
        {required && <span className="text-red text-xs">*</span>}
        {hint && (
          <span className="font-normal text-text-muted text-xs">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

/**
 * Text Input
 */
export function FIn({
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  readOnly,
  disabled,
  min,
  max,
  className = "",
  onKeyDown,
  style,
  autoFocus,
  id,
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") e.target.blur();
    onKeyDown?.(e);
  };

  return (
    <input
      id={id}
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      min={min}
      max={max}
      onKeyDown={handleKeyDown}
      autoFocus={autoFocus}
      style={style}
      className={`${inputBase} ${readOnly || disabled ? readOnlyExtra : ""} ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    />
  );
}

/**
 * Select
 */
export function FSel({ value, onChange, onBlur, options, placeholder, disabled, className = "" }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      className={`${inputBase} cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    >
      <option value="">{placeholder || "— Pilih —"}</option>
      {options.map((o) => (
        <option key={o.v ?? o} value={o.v ?? o}>
          {o.l ?? o}
        </option>
      ))}
    </select>
  );
}

/**
 * Textarea
 */
export function FTa({ value, onChange, onBlur, rows = 2, placeholder }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      rows={rows}
      placeholder={placeholder}
      className={`${inputBase} resize-y`}
    />
  );
}

/**
 * Numeric Input — no leading zero, select-on-focus.
 */
export function NumInput({
  value,
  onChange,
  min,
  max,
  readOnly,
  className = "",
  placeholder,
  onKeyDown,
}) {
  const [raw, setRaw] = useState("");
  const [focused, setFocused] = useState(false);
  const display = focused
    ? raw
    : value === 0 || value === "" || value == null
      ? ""
      : String(value);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") e.target.blur();
    onKeyDown?.(e);
  };

  return (
    <input
      inputMode="numeric"
      value={display}
      placeholder={focused ? "" : placeholder || "0"}
      readOnly={readOnly}
      onFocus={(e) => {
        setFocused(true);
        setRaw(value === 0 ? "" : String(value || ""));
        setTimeout(() => e.target.select(), 0);
      }}
      onBlur={() => {
        setFocused(false);
        const n = parseFloat(raw.replace(/,/g, ""));
        if (!isNaN(n)) {
          const clamped =
            min != null ? Math.max(min, max != null ? Math.min(max, n) : n) : n;
          onChange(clamped);
        } else {
          onChange(0);
        }
        setRaw("");
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (/^-?\d*\.?\d*$/.test(v) || v === "") setRaw(v);
      }}
      onKeyDown={handleKeyDown}
      className={`${inputBase} ${readOnly ? readOnlyExtra : ""} ${className}`}
    />
  );
}

/**
 * SearchInput — searchable input with dropdown suggestions.
 */
export function SearchInput({ value, onChange, options, placeholder, className = "", onKeyDown, autoFocus }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [idx, setIdx] = useState(0);
  const [arrowUsed, setArrowUsed] = useState(false);

  const filtered = options.filter(o => 
    (o.l || o).toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const select = (o) => {
    onChange?.(o.v ?? o);
    setSearch("");
    setOpen(false);
    setIdx(0);
    setArrowUsed(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setArrowUsed(true);
      setIdx(p => (p + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setArrowUsed(true);
      setIdx(p => (p - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      if (open && filtered[idx] && arrowUsed) {
        e.preventDefault();
        select(filtered[idx]);
        return; // Important: prevent triggering the parent's generic Enter handler when picking a suggestion
      }
    } else if (e.key === "Tab") {
      if (open && filtered[idx] && arrowUsed) {
        select(filtered[idx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={open ? search : (value || "")}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
          setIdx(0);
          setArrowUsed(false);
        }}
        onFocus={() => {
          setSearch("");
          setOpen(true);
          setArrowUsed(false);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`${inputBase} ${className}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[1000] top-full left-0 right-0 mt-1 bg-surface border border-border-strong rounded-lg shadow-xl overflow-hidden py-1">
          {filtered.map((o, i) => (
            <div
              key={o.v ?? o}
              onMouseDown={() => select(o)}
              onMouseEnter={() => setIdx(i)}
              className={`px-3 py-2 text-xs cursor-pointer ${i === idx ? "bg-brand text-white" : "text-text-primary hover:bg-surface-alt"}`}
            >
              {o.l ?? o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Divider — horizontal line with a label, spans full grid width.
 */
export function Divider({ label }) {
  return (
    <div className="col-span-2 flex items-center gap-2.5 my-1">
      <span className="text-xs font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border-default" />
    </div>
  );
}
