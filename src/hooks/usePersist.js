import { useState, useEffect } from "react";

/**
 * useState that persists to localStorage.
 */
export function usePersist(key, init) {
  const [val, set] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : init;
    } catch {
      return init;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
  }, [key, val]);

  return [val, set];
}
