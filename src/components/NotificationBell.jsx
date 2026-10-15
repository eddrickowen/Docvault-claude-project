/**
 * NotificationBell — top-bar component showing unread count & dropdown.
 * Pulls from useActivityStore + live data (overdue, low stock).
 */
import { useState, useRef, useEffect } from "react";
import { Ico, IC } from "./ui";
import { useActivityStore } from "../store/useActivityStore";
import { usePOStore } from "../store/usePOStore";
import { isOverdue, diffDays } from "../lib/helpers";

/* ─── Helpers ── */
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

export function NotificationBell({ onJump }) {
  const { log, unreadCount, markAllRead, markRead, clearLog } = useActivityStore();
  const { pos, items, products } = usePOStore();
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── Smart notifications from live data ── */
  const smartNotifs = [];

  // Overdue POs
  const overduePos = pos.filter(p => !["paid","cancelled","invoiced"].includes(p.status) && isOverdue(p, items, 7));
  if (overduePos.length > 0) {
    smartNotifs.push({
      id: "smart_overdue",
      icon: "🚨",
      color: "#ef4444",
      title: `${overduePos.length} PO Overdue`,
      detail: overduePos.slice(0,2).map(p => p.orderNo).join(", ") + (overduePos.length > 2 ? "…" : ""),
      ts: Date.now(),
      read: false,
      smart: true,
      onClick: () => { onJump?.("po"); setOpen(false); },
    });
  }

  // Low stock
  const lowStock = (products || []).filter(p => (p.stockLevel||0) <= (p.safetyStock||0));
  if (lowStock.length > 0) {
    smartNotifs.push({
      id: "smart_lowstock",
      icon: "📦",
      color: "#f97316",
      title: `${lowStock.length} Product${lowStock.length > 1 ? "s" : ""} Low / Out of Stock`,
      detail: lowStock.slice(0,2).map(p => p.name).join(", ") + (lowStock.length > 2 ? "…" : ""),
      ts: Date.now(),
      read: false,
      smart: true,
      onClick: () => { onJump?.("products"); setOpen(false); },
    });
  }

  // Unconfirmed items (no delivery date but status=ordered) older than 3 days
  const unconfirmed = items.filter(i => i.status === "ordered" && !i.deliveryDate && diffDays(i.updatedAt || i.createdAt) > 3);
  if (unconfirmed.length > 0) {
    smartNotifs.push({
      id: "smart_noeta",
      icon: "⏰",
      color: "#f59e0b",
      title: `${unconfirmed.length} Item${unconfirmed.length>1?"s":""} Without Delivery Date`,
      detail: "Items ordered 3+ days ago with no ETA",
      ts: Date.now(),
      read: false,
      smart: true,
      onClick: () => { onJump?.("items"); setOpen(false); },
    });
  }

  const totalUnread = unreadCount + smartNotifs.length;

  /* ── Combined feed (smart first, then log) ── */
  const feed = [...smartNotifs, ...log.slice(0, 30)];

  const handleOpen = () => {
    setOpen(v => !v);
  };

  const handleClear = () => {
    markAllRead();
    clearLog();
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
          open ? "bg-slate-700" : "hover:bg-slate-800"
        }`}
        title="Notifications & Activity"
      >
        <Ico d={IC.warn} size={16} color={totalUnread > 0 ? "#f59e0b" : "#94a3b8"} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red text-white text-[9px] font-extrabold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-[3px] animate-pulse">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-surface border border-border-strong rounded-xl shadow-2xl z-[200] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-alt">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13px] text-text-primary">Notifications</span>
              {totalUnread > 0 && (
                <span className="bg-red text-white text-[9px] font-extrabold rounded-full px-2 py-0.5">{totalUnread}</span>
              )}
            </div>
            <div className="flex gap-2">
              {log.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-brand hover:underline font-semibold"
                >
                  Mark all read
                </button>
              )}
              {log.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-[10px] text-text-muted hover:text-red font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Feed */}
          <div className="max-h-[420px] overflow-y-auto custom-scroll">
            {feed.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-sm">
                <div className="text-2xl mb-2">🔔</div>
                All clear — no notifications
              </div>
            ) : (
              feed.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => {
                    if (entry.smart) { entry.onClick?.(); }
                    else { markRead(entry.id); }
                  }}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border-default cursor-pointer hover:bg-bg-app transition-colors ${
                    !entry.read && !entry.smart ? "bg-brand-soft/20" : ""
                  }`}
                >
                  {/* Icon dot */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[15px]"
                    style={{ background: `${entry.color}18` }}
                  >
                    {entry.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] leading-snug ${!entry.read ? "font-semibold text-text-primary" : "font-medium text-text-secondary"}`}>
                      {entry.title}
                    </div>
                    {entry.detail && (
                      <div className="text-[10px] text-text-muted mt-0.5 truncate">{entry.detail}</div>
                    )}
                    <div className="text-[9px] text-text-muted mt-1">{timeAgo(entry.ts)}</div>
                  </div>

                  {/* Unread dot */}
                  {!entry.read && (
                    <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border-default bg-surface-alt/50">
            <button
              onClick={() => { onJump?.("activity"); setOpen(false); }}
              className="text-[11px] text-brand font-semibold hover:underline flex items-center gap-1 w-full justify-center"
            >
              View Full Activity Log <Ico d={IC.chevR} size={10} color="var(--color-brand)" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
