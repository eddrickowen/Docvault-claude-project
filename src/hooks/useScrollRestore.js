import { useEffect } from "react";

/**
 * Hook to persist and restore the scroll position of an element.
 * Useful for maintaining "view placement" when jumping between pages.
 * @param {string} key - Unique key for this scroll position (e.g., 'all-items')
 * @param {import("react").RefObject} ref - Ref to the scrollable container
 */
export function useScrollRestore(key, ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !key) return;

    // 1. Restore scroll on mount
    const saved = localStorage.getItem(`scroll-${key}`);
    if (saved) {
      // Use a small timeout to ensure the content is rendered
      const timeoutId = setTimeout(() => {
        el.scrollTop = parseInt(saved, 10);
      }, 50);
      return () => clearTimeout(timeoutId);
    }

    // 2. Save scroll position on scroll (throttled)
    let throttleTimer = null;
    const handleScroll = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        localStorage.setItem(`scroll-${key}`, el.scrollTop);
        throttleTimer = null;
      }, 200);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    
    // 3. Cleanup
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [key, ref]);
}
