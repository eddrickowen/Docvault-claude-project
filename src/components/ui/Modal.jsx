import { useEffect } from "react";
import { Ico, IC } from "./Icon";

/**
 * Modal dialog overlay.
 * Props: open, onClose, title, children, wide, xwide, noPad
 */
export function Modal({ open, onClose, title, children, wide, xwide, noPad }) {
  /* ── Escape key closes modal ── */
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = xwide
    ? "w-[min(1160px,97vw)]"
    : wide
      ? "w-[min(900px,96vw)]"
      : "w-[580px]";

  return (
    <div
      className="np fixed inset-0 z-[4000] flex items-center justify-center bg-slate-900/50 backdrop-blur-[3px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-surface border border-border-default rounded-xl ${widthClass} max-w-[98vw] max-h-[95vh] overflow-hidden flex flex-col shadow-[0_8px_32px_rgba(15,23,42,.18)]`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-border-default shrink-0 bg-surface-alt">
          <h2 className="m-0 text-sm font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="bg-transparent border border-border-default rounded-md w-[26px] h-[26px] flex items-center justify-center cursor-pointer text-text-muted hover:bg-bg-app transition-colors"
          >
            <Ico d={IC.close} size={12} />
          </button>
        </div>

        {/* Body */}
        <div className={`${noPad ? "" : "p-5"} overflow-y-auto flex-1`}>
          {children}
        </div>
      </div>
    </div>
  );
}
