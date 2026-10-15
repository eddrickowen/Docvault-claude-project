import { useState, useRef } from "react";
import { Ico, IC } from "../ui";
import { fmtDate, parseSmartDate } from "../../lib/helpers";

const inputCls =
  "w-full bg-surface border border-border-strong rounded-[7px] px-2 py-1 text-[11px] text-text-primary outline-none focus:border-brand font-[JetBrains_Mono,monospace]";

/**
 * SmartDate — hybrid text input + native date picker
 * Accepts DD/MM/YY, DD.MM.YYYY, YYYY-MM-DD etc.
 */
export function SmartDate({ value, onChange, onCancel, placeholder, disabled, className }) {
  const [raw, setRaw] = useState("");
  const [focused, setFocused] = useState(false);
  const pickerRef = useRef();

  const display = focused ? raw : value ? fmtDate(value) : "";

  const commitRaw = () => {
    const parsed = parseSmartDate(raw);
    if (parsed) {
      onChange(parsed);
      setRaw(fmtDate(parsed));
    } else {
      setRaw(value ? fmtDate(value) : "");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setFocused(false);
      setRaw(value ? fmtDate(value) : "");
      onCancel?.();
    }
    if (e.key === "Enter") {
      commitRaw();
      setFocused(false);
    }
  };

  return (
    <div className="relative flex items-center gap-0">
      <input
        value={display}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={() => {
          if (disabled) return;
          setFocused(true);
          setRaw(value ? fmtDate(value) : "");
        }}
        onBlur={() => {
          setTimeout(() => {
            commitRaw();
            setFocused(false);
          }, 200);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || "Pilih tanggal..."}
        className={`${inputCls} pr-[30px] cursor-text ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className || ""}`}
      />
      <button
        type="button"
        onClick={() => { if (!disabled) pickerRef.current?.showPicker?.() || pickerRef.current?.click(); }}
        disabled={disabled}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 bg-transparent border-none flex p-0.5 ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer text-text-muted"}`}
        title="Buka kalender"
      >
        <Ico d={IC.cal} size={14} color={focused ? "var(--color-brand)" : "var(--color-text-muted)"} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={value || ""}
        onChange={(e) => { if (!disabled) onChange(e.target.value); }}
        disabled={disabled}
        className="absolute right-0 top-0 opacity-0 w-[30px] h-full border-none cursor-pointer -z-[1]"
      />
    </div>
  );
}
