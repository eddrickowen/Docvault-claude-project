import { useState, useCallback } from "react";

/**
 * Lightweight toast notification hook.
 * Returns { show(msg), Toast } — render <Toast /> in your layout.
 */
export function useToast() {
  const [msg, setMsg] = useState(null);

  const show = useCallback((m) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2400);
  }, []);

  const Toast = () =>
    msg ? (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-800 text-white px-6 py-2.5 rounded-lg text-xs font-semibold shadow-[0_4px_20px_rgba(0,0,0,.25)] whitespace-nowrap">
        {msg}
      </div>
    ) : null;

  return { show, Toast };
}
