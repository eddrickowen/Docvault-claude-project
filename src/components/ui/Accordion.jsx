import { useState, useEffect } from "react";
import { Ico, IC } from "./Icon";

/**
 * Collapsible Accordion section.
 */
export function Accordion({ title, icon, defaultOpen = false, forceOpen, children, badge, warning, extra }) {
  const [open, setOpen] = useState(defaultOpen || !!forceOpen);
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);

  return (
    <div
      className={`border rounded-lg mb-2 overflow-hidden ${
        open ? "border-brand" : "border-border-default"
      }`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 border-none cursor-pointer ${
          open ? "bg-brand-soft" : "bg-surface-alt"
        }`}
      >
        {icon && (
          <Ico d={icon} size={14} color={open ? "var(--color-brand)" : "var(--color-text-muted)"} />
        )}
        <span
          className={`flex-1 text-left text-xs font-bold ${
            open ? "text-brand" : "text-text-secondary"
          }`}
        >
          {title}
        </span>
        {badge != null && (
          <span className="text-[10px] bg-brand-soft text-brand border border-brand-mid rounded-full px-2 font-bold">
            {badge}
          </span>
        )}
        {warning && <Ico d={IC.warn} size={12} color="var(--color-red)" />}
        {extra}
        <Ico
          d={open ? IC.chevD : IC.chevR}
          size={12}
          color={open ? "var(--color-brand)" : "var(--color-text-muted)"}
        />
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 py-3.5 border-t border-border-default">{children}</div>
      )}
    </div>
  );
}
