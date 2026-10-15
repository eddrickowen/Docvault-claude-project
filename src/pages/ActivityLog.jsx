/**
 * ActivityLog — full history timeline page.
 * Grouped by day, filterable by type.
 */
import { useState, useMemo } from "react";
import { useActivityStore, ACT_CONFIG } from "../store/useActivityStore";

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

const fmtTs = (ts) =>
  new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const fmtDay = (ts) => {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d >= today)      return "Today";
  if (d >= yesterday)  return "Yesterday";
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
};

const TYPE_OPTIONS = [
  { v: "all",            l: "All Activity" },
  { v: "po_created",     l: "PO Created"   },
  { v: "po_updated",     l: "PO Updated"   },
  { v: "po_deleted",     l: "PO Deleted"   },
  { v: "item_added",     l: "Item Added"   },
  { v: "item_updated",   l: "Item Updated" },
  { v: "item_status",    l: "Status Change"},
  { v: "item_deleted",   l: "Item Deleted" },
  { v: "do_created",     l: "DO Created"   },
  { v: "product_added",  l: "Product Added"},
  { v: "product_updated",l: "Product Updated"},
  { v: "stock_adjusted", l: "Stock Adjusted"},
  { v: "supplier_added", l: "Supplier Added"},
];

export function ActivityLog() {
  const { log, markAllRead, clearLog } = useActivityStore();
  const [typeFilter, setTypeFilter]   = useState("all");
  const [search, setSearch]           = useState("");

  const filtered = useMemo(() => {
    let r = log;
    if (typeFilter !== "all") r = r.filter(e => e.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(e => e.title?.toLowerCase().includes(q) || e.detail?.toLowerCase().includes(q));
    }
    return r;
  }, [log, typeFilter, search]);

  // Group by day
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(e => {
      const day = new Date(e.ts); day.setHours(0,0,0,0);
      const key = day.getTime();
      if (!g[key]) g[key] = { label: fmtDay(e.ts), entries: [] };
      g[key].entries.push(e);
    });
    return Object.entries(g).sort(([a], [b]) => Number(b) - Number(a));
  }, [filtered]);

  return (
    <div className="flex flex-col h-full w-full bg-bg-app">
      {/* ── Header ── */}
      <div className="shrink-0 px-6 pt-5 pb-4 bg-surface border-b border-border-default">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[18px] font-extrabold text-text-primary">Activity History</h1>
            <p className="text-[11px] text-text-muted">{log.length} recorded actions</p>
          </div>
          <div className="flex gap-2">
            {log.length > 0 && (
              <>
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-brand border border-brand-mid rounded-lg px-3 py-1.5 font-semibold hover:bg-brand-soft transition-colors"
                >
                  Mark All Read
                </button>
                <button
                  onClick={() => { if (confirm("Clear all activity history?")) clearLog(); }}
                  className="text-[11px] text-red border border-red/30 rounded-lg px-3 py-1.5 font-semibold hover:bg-red-soft transition-colors"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-bg-app border border-border-strong text-text-primary text-[12px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
          >
            {TYPE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title or detail..."
            className="border border-border-strong rounded-lg px-3 py-1.5 text-[12px] bg-bg-app text-text-primary focus:outline-none focus:border-brand w-[220px]"
          />
          {(typeFilter !== "all" || search) && (
            <button onClick={() => { setTypeFilter("all"); setSearch(""); }}
              className="text-[11px] text-text-muted hover:text-red font-semibold"
            >Reset</button>
          )}
          <span className="text-[10px] text-text-muted ml-auto">{filtered.length} results</span>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 overflow-y-auto custom-scroll px-6 py-5">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-muted opacity-50">
            <div className="text-5xl">📋</div>
            <div className="text-sm font-bold">No activity yet</div>
            <div className="text-[11px]">Actions like creating POs, updating items, and adjusting stock will appear here.</div>
          </div>
        ) : (
          grouped.map(([dayKey, { label, entries }]) => (
            <div key={dayKey} className="mb-8">
              {/* Day divider */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest whitespace-nowrap">{label}</span>
                <div className="flex-1 h-px bg-border-default" />
                <span className="text-[10px] text-text-muted">{entries.length} action{entries.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Entries */}
              <div className="flex flex-col gap-2 ml-2">
                {entries.map(e => (
                  <div key={e.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${e.read ? "bg-surface border-border-default" : "bg-brand-soft/30 border-brand-mid"}`}>
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] shrink-0 shadow-sm"
                      style={{ background: `${e.color}18` }}
                    >
                      {e.icon}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`text-[13px] leading-snug ${!e.read ? "font-bold text-text-primary" : "font-semibold text-text-secondary"}`}>
                          {e.title}
                        </div>
                        <div className="text-[10px] text-text-muted whitespace-nowrap shrink-0">{fmtTs(e.ts)}</div>
                      </div>
                      {e.detail && (
                        <div className="text-[11px] text-text-muted mt-0.5">{e.detail}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase rounded-full px-2 py-0.5 border" style={{ color: e.color, borderColor: `${e.color}40`, background: `${e.color}10` }}>
                          {e.label}
                        </span>
                        <span className="text-[9px] text-text-muted">{timeAgo(e.ts)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
