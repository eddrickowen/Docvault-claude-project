import { useState, useCallback, useEffect } from "react";

/**
 * Enhanced toast notification hook with slide-in animation + icon variants.
 * Auto-detects success (✓), error (✗), or neutral based on message content.
 * Returns { show(msg), Toast } — render <Toast /> in your layout.
 */
export function useToast() {
  const [toast, setToast] = useState(null); // { msg, id, leaving }

  const show = useCallback((m) => {
    const id = Date.now();
    setToast({ msg: m, id, leaving: false });
    setTimeout(() => setToast((t) => t?.id === id ? { ...t, leaving: true } : t), 2200);
    setTimeout(() => setToast((t) => t?.id === id ? null : t), 2600);
  }, []);

  const getVariant = (msg) => {
    if (!msg) return "info";
    if (msg.includes("✓") || msg.includes("disimpan") || msg.includes("disalin") || msg.includes("berhasil")) return "success";
    if (msg.includes("✗") || msg.includes("gagal") || msg.includes("error")) return "error";
    return "info";
  };

  const Toast = () => {
    if (!toast) return null;
    const v = getVariant(toast.msg);
    const colors = {
      success: { bg: "bg-emerald-900/95", accent: "bg-emerald-400", icon: "✓", iconBg: "bg-emerald-500/20" },
      error:   { bg: "bg-red-900/95", accent: "bg-red-400", icon: "✗", iconBg: "bg-red-500/20" },
      info:    { bg: "bg-slate-800/95", accent: "bg-blue-400", icon: "ℹ", iconBg: "bg-blue-500/20" },
    }[v];

    return (
      <div
        className={`fixed bottom-6 left-1/2 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-[0_8px_32px_rgba(0,0,0,.35)] backdrop-blur-sm border border-white/10 ${colors.bg} ${toast.leaving ? "toast-leave" : "toast-enter"}`}
        style={{ transform: "translateX(-50%)" }}
      >
        <span className={`w-5 h-5 rounded-md ${colors.iconBg} flex items-center justify-center text-[11px] font-bold shrink-0`}>
          {colors.icon}
        </span>
        <span className="whitespace-nowrap">{toast.msg}</span>
        <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full overflow-hidden">
          <div className={`h-full ${colors.accent} rounded-full toast-progress`} />
        </div>
      </div>
    );
  };

  return { show, Toast };
}
