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
  type = "text",
  placeholder,
  readOnly,
  min,
  max,
  className = "",
  onKeyDown,
  style,
  autoFocus,
  id,
}) {
  return (
    <input
      id={id}
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      min={min}
      max={max}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      style={style}
      className={`${inputBase} ${readOnly ? readOnlyExtra : ""} ${className}`}
    />
  );
}

/**
 * Select
 */
export function FSel({ value, onChange, options, placeholder, className = "" }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      className={`${inputBase} cursor-pointer ${className}`}
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
export function FTa({ value, onChange, rows = 2, placeholder }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
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
}) {
  const [raw, setRaw] = useState("");
  const [focused, setFocused] = useState(false);
  const display = focused
    ? raw
    : value === 0 || value === "" || value == null
      ? ""
      : String(value);

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
      className={`${inputBase} ${readOnly ? readOnlyExtra : ""} ${className}`}
    />
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
