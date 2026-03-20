/**
 * Shared table styling constants used across multiple pages.
 * Extracted to avoid duplication and ensure consistency.
 */

export const TABLE_CLASSES = {
  th: "py-1 px-1.5 text-[10px] font-bold text-text-secondary text-left whitespace-nowrap border-b border-border-default uppercase tracking-[.02em] bg-surface-alt cursor-pointer select-none",
  td: "py-0.5 px-1.5 border-b border-border-default text-[11px] align-middle",
  stickyLeft: "sticky left-0 z-[1] shadow-[3px_0_6px_rgba(0,0,0,0.05)]",
  stickyRight: "sticky right-0 z-[1] shadow-[-3px_0_6px_rgba(0,0,0,0.05)]",
};

// Legacy exports for backward compatibility
export const thCls = TABLE_CLASSES.th;
export const tdCls = TABLE_CLASSES.td;
export const stickyL = TABLE_CLASSES.stickyLeft;
export const stickyR = TABLE_CLASSES.stickyRight;
