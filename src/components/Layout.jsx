/**
 * Layout — App shell: sidebar, topbar, alert banners, keyboard shortcuts.
 * Reads from usePOStore directly — no prop drilling.
 */
import { useState, useEffect } from "react";
import { Ico, IC, Btn } from "./ui";
import { usePOStore } from "../store/usePOStore";
import { VENDOR_NAME } from "../lib/constants";
import { isIncompletePO, isOverdue, today } from "../lib/helpers";

const NAV = [
  { id: "dashboard", label: "Dashboard",        icon: IC.dash  },
  { id: "po",        label: "Purchase Orders",  icon: IC.po,   kbd: "N" },
  { id: "items",     label: "Semua Item",        icon: IC.box   },
  { id: "supplier",  label: "Supplier",          icon: IC.users },
  { id: "margin",    label: "Margin Analysis",   icon: IC.stats },
  { id: "settings",  label: "Settings",          icon: IC.cog   },
];

/* ── Class constants ── */
const navActiveBtn = "flex items-center gap-2 w-full px-2 py-1.5 rounded border-none text-[13px] font-bold transition-all duration-120 mb-0.5 whitespace-nowrap overflow-hidden bg-blue-900 text-white";
const navIdleBtn  = "flex items-center gap-2 w-full px-2 py-1.5 rounded border-none text-[13px] font-medium transition-all duration-120 mb-0.5 whitespace-nowrap overflow-hidden bg-transparent text-slate-400 hover:bg-slate-800";

export function Layout({ view, setView, onJump, children }) {
  const { pos, items, suppliers } = usePOStore();
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [hideAlert,    setHideAlert]    = useState(false);
  const [hideIncAlert, setHideIncAlert] = useState(false);

  const todayStr    = today();
  const overduePOs  = pos.filter((p) => {
    if (["paid", "invoiced"].includes(p.status)) return false;
    return items
      .filter((i) => i.poId === p.id && !["delivered", "invoiced", "paid"].includes(i.status))
      .some((i) => i.deliveryDate && i.deliveryDate !== "dd/mm/yyyy" && i.deliveryDate < todayStr);
  });
  const incompletePOs = pos.filter(
    (p) => !["paid", "cancelled"].includes(p.status) && isIncompletePO(p)
  );

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const h = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setView("po");
        usePOStore.getState().setTriggerNewPO(true);
      }
      if (e.key === "/") {
        e.preventDefault();
        // Look for any visible search input
        const searchInput = document.querySelector("input[placeholder*='Cari'], input[type='search']");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [setView]);

  const sideWidth = sideCollapsed ? 44 : 176;

  return (
    <div className="flex flex-col h-screen w-full">
      {/* ── Incomplete PO alert ── */}
      {incompletePOs.length > 0 && !hideIncAlert && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center gap-2.5 text-sm font-semibold shrink-0">
          <Ico d={IC.warn} size={14} color="#fff" />
          <span className="flex-1">
            ⚠ {incompletePOs.length} PO belum lengkap — No. Order / Perusahaan / Tanggal belum diisi!
          </span>
          <Btn
            size="sm" variant="ghost"
            onClick={() => { 
              const firstId = incompletePOs[0]?.id;
              if (onJump && firstId) onJump("po", firstId);
              else setView("po");
              setHideIncAlert(true); 
            }}
            className="!bg-white/20 !border-white/40 !text-white hover:!bg-white/30"
          >
            Lihat PO
          </Btn>
          <Btn
            size="sm" variant="ghost"
            onClick={() => setHideIncAlert(true)}
            title="Tutup"
            className="!bg-transparent !border-transparent !text-white hover:!bg-white/10 !p-1"
          >
            <Ico d={IC.close} size={14} />
          </Btn>
        </div>
      )}

      {/* ── Overdue alert ── */}
      {overduePOs.length > 0 && !hideAlert && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center gap-2.5 text-sm font-semibold shrink-0 shadow-sm">
          <Ico d={IC.warn} size={14} color="#fff" />
          <span className="flex-1">
            ⚠ {overduePOs.length} PO OVERDUE — item belum terkirim melewati tanggal delivery!
          </span>
          <Btn
            size="sm" variant="ghost"
            onClick={() => { 
              const firstId = overduePOs[0]?.id;
              if (onJump && firstId) onJump("po", firstId);
              else setView("po");
              setHideAlert(true); 
            }}
            className="!bg-white/20 !border-white/40 !text-white hover:!bg-white/30"
          >
            Lihat PO
          </Btn>
          <Btn
            size="sm" variant="ghost"
            onClick={() => setHideAlert(true)}
            title="Tutup Peringatan"
            className="!bg-transparent !border-transparent !text-white hover:!bg-white/10 !p-1"
          >
            <Ico d={IC.close} size={14} />
          </Btn>
        </div>
      )}

      {/* ── Main wrapper ── */}
      <div className="flex flex-1 w-full overflow-hidden bg-bg-app">
        {/* ── Sidebar ── */}
        <div
          id="sb"
          className="flex flex-col transition-all duration-200 overflow-hidden bg-slate-950 border-r border-slate-800 shrink-0"
          style={{ width: sideWidth }}
        >
          {/* Logo / collapse */}
          <div className="px-2.5 py-2 border-b border-slate-700 flex items-center justify-between gap-2 shrink-0">
            {!sideCollapsed && (
              <div>
                <div className="text-[13px] font-black text-slate-50 tracking-wider">PO MANAGER</div>
                <div className="text-sm text-slate-500">v6.6</div>
              </div>
            )}
            <Btn
              variant="ghost" size="sm"
              onClick={() => setSideCollapsed((v) => !v)}
              className="!border-slate-700 !text-slate-500 hover:!text-slate-400 hover:!border-slate-600 !p-1.5 shrink-0 ml-auto"
            >
              <Ico d={sideCollapsed ? IC.chevR : IC.chevL} size={11} />
            </Btn>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-1 overflow-y-auto">
            {NAV.map((n) => {
              const active = view === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setView(n.id)}
                  title={n.label}
                  className={active ? navActiveBtn : navIdleBtn}
                >
                  <Ico d={n.icon} size={14} color={active ? "#fff" : "#64748b"} />
                  {!sideCollapsed && (
                    <>
                      <span className="flex-1 truncate">{n.label}</span>
                      {n.kbd && (
                        <kbd className="ml-auto text-[9px] font-mono font-bold bg-slate-700/60 text-slate-400 rounded px-1.5 py-0.5 border border-slate-600/50 leading-none shrink-0">
                          {n.kbd}
                        </kbd>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Stats footer */}
          {!sideCollapsed && (
            <div className="px-2.5 py-1.5 border-t border-slate-700 shrink-0">
              <div className="text-sm text-slate-500 font-semibold truncate">{VENDOR_NAME}</div>
              <div className="text-sm text-slate-600">
                {pos.length} PO · {items.length} item · {suppliers.filter((s) => !s.deletedAt).length} sup
              </div>
            </div>
          )}
        </div>

        {/* ── Content area ── */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Topbar */}
          <div
            id="tb"
            className="h-12 bg-surface border-b border-border-default flex items-center px-5 gap-3 shrink-0 shadow-sm"
          >
            <h1 className="m-0 text-base font-bold text-text-primary flex-1">
              {NAV.find((n) => n.id === view)?.label}
            </h1>
            <span className="text-sm text-text-muted">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          </div>

          {/* Page content */}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
