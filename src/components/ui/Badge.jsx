/**
 * Status Badge — renders a colored pill with a dot indicator.
 * Uses inline color from the status config object (dynamic per-status colors).
 *
 * Props:
 *   status — status key (e.g. "pending", "paid")
 *   cfg    — status config map: { [key]: { label, color, bg, ring } }
 */
export function SBadge({ status, cfg }) {
  const c = cfg[status] || {
    label: status || "–",
    color: "#475569",
    bg: "#f0f4f8",
    ring: "#e2e8f0",
  };

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase whitespace-nowrap"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.ring}` }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full shrink-0"
        style={{ background: c.color }}
      />
      {c.label}
    </span>
  );
}

/**
 * Status Pill Select — inline status dropdown with matching colors.
 *
 * Props:
 *   value    — current status key
 *   onChange — callback(newStatus)
 *   cfg      — same config map as SBadge
 *   mini     — smaller variant
 */
export function SPill({ value, onChange, cfg, mini, micro }) {
  const c = cfg[value] || { color: "#475569", bg: "#f0f4f8", ring: "#e2e8f0" };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-[4px] font-semibold cursor-pointer outline-none uppercase tracking-wide ${
        micro ? "px-0.5 py-0 text-[9px] max-w-[78px]" :
        mini  ? "px-1 py-0.5 text-[11px] max-w-[90px]" :
                "px-1.5 py-1 text-xs max-w-[130px]"
      }`}
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.ring}` }}
    >
      {Object.entries(cfg).map(([k, v]) => (
        <option key={k} value={k}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
