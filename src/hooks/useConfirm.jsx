import { useState, useCallback } from "react";

/**
 * Confirm dialog hook — replaces window.confirm.
 * Returns { ask(msg, onYes, opts), ConfirmModal }
 */
export function useConfirm() {
  const [cfg, setCfg] = useState(null);

  const ask = useCallback(
    (msg, onYes, opts = {}) => setCfg({ msg, onYes, ...opts }),
    []
  );

  const ConfirmModal = () =>
    cfg ? (
      <div
        className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/45"
        onClick={() => setCfg(null)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[10px] px-7 py-6 max-w-[380px] w-[90%] shadow-[0_8px_32px_rgba(0,0,0,.18)]"
        >
          <div className="text-sm font-bold text-text-primary mb-2">
            {cfg.title || "Konfirmasi"}
          </div>
          <div className="text-[13px] text-text-secondary mb-5 leading-relaxed">
            {cfg.msg}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setCfg(null)}
              className="px-4 py-[7px] rounded-md border border-border-strong bg-white text-xs font-semibold cursor-pointer text-text-secondary hover:bg-surface-alt transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => { cfg.onYes(); setCfg(null); }}
              className={`px-4 py-[7px] rounded-md border-none text-white text-xs font-semibold cursor-pointer transition-colors ${
                cfg.danger
                  ? "bg-red hover:bg-red-700"
                  : "bg-brand hover:bg-brand-hover"
              }`}
            >
              {cfg.confirmLabel || "Ya, Lanjutkan"}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return { ask, ConfirmModal };
}
