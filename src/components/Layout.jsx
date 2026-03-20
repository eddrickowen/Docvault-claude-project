/**
 * Layout — App shell: sidebar, topbar, alert banners, keyboard shortcuts.
 * Reads from usePOStore directly — no prop drilling.
 */
import { useState, useEffect } from "react";
import { Ico, IC, Btn } from "./ui";
import { usePOStore } from "../store/usePOStore";
import { VENDOR_NAME } from "../lib/constants";
import { pb } from "../lib/pocketbase";
import { isIncompletePO, isOverdue, today } from "../lib/helpers";

const NAV = [
  { id: "dashboard", label: "Dashboard",        icon: IC.dash  },
  { id: "po",        label: "Purchase Orders",  icon: IC.po,   kbd: "N" },
  { id: "items",     label: "Semua Item",        icon: IC.box   },
  { id: "supplier",  label: "Supplier",          icon: IC.users },
  { id: "margin",    label: "Margin Analysis",   icon: IC.stats },
  { id: "ar-aging",  label: "AR Aging Report",   icon: IC.trend },
  { id: "settings",  label: "Settings",          icon: IC.cog   },
];

/* ── Class constants ── */
const navActiveBtn = "flex items-center gap-2 w-full px-2 py-1.5 rounded border-none text-[13px] font-bold transition-all duration-120 mb-0.5 whitespace-nowrap overflow-hidden bg-blue-900 text-white";
const navIdleBtn  = "flex items-center gap-2 w-full px-2 py-1.5 rounded border-none text-[13px] font-medium transition-all duration-120 mb-0.5 whitespace-nowrap overflow-hidden bg-transparent text-slate-400 hover:bg-slate-800";

export function Layout({ view, setView, onJump, onLogout, children }) {
  const { pos, items, suppliers } = usePOStore();
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [hideAlert,    setHideAlert]    = useState(false);
  const [hideIncAlert, setHideIncAlert] = useState(false);
  const [sharing, setSharing] = useState({ active: false, url: "" });
  const [isToggling, setIsToggling] = useState(false);

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

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        usePOStore.getState().undo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        usePOStore.getState().redo();
        return;
      }

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

  /* ── Sharing Status Polling ── */
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("http://localhost:4041/api/sharing/status").then(r => r.json());
        setSharing(res);
      } catch (e) {
        // Fallback to old behavior or silent fail
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSharing = async () => {
    if (isToggling) return;
    console.log("Toggle sharing clicked! Current active:", sharing.active);
    setIsToggling(true);
    try {
      const url = "http://localhost:4041/api/sharing/toggle?active=" + !sharing.active;
      console.log("Sending request to helper:", url);
      await fetch(url);
      
      // Small delay to let ngrok start/stop
      setTimeout(async () => {
        try {
          const res = await fetch("http://localhost:4041/api/sharing/status").then(r => r.json());
          console.log("New status after toggle:", res);
          setSharing(res);
        } catch (statusErr) {
          console.error("Failed to fetch final status:", statusErr);
        } finally {
          setIsToggling(false);
        }
      }, 3000);
    } catch (e) {
      alert("Sharing Toggle Error: " + e.message);
      console.error("Failed to toggle sharing:", e);
      setIsToggling(false);
    }
  };

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

          {/* Sharing Toggle */}
          {!sideCollapsed && (
            <div className="px-2.5 py-2 border-t border-slate-800 bg-slate-900/30 shrink-0">
              <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Public Sharing</span>
                <button
                  onClick={handleToggleSharing}
                  disabled={isToggling}
                  className={`w-7 h-3.5 rounded-full transition-all duration-200 relative ${sharing.active ? 'bg-emerald-600' : 'bg-slate-700'} ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all ${sharing.active ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
              {sharing.active && sharing.url && (
                <div 
                  className="text-[10px] text-emerald-400 font-mono break-all cursor-pointer hover:text-emerald-300 bg-emerald-950/30 p-1 rounded border border-emerald-900/30 mb-1.5" 
                  onClick={() => window.open(sharing.url, "_blank")}
                  title="Click to open public link"
                >
                  {sharing.url.replace('https://', '')}
                </div>
              )}
              {/* CMS Link */}
              <div 
                className="text-[10px] text-slate-500 font-bold uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-1.5 px-0.5"
                onClick={() => window.open("http://localhost:8090/_/", "_blank")}
                title="Open PocketBase Admin"
              >
                <Ico d={IC.cog} size={10} />
                Database CMS
              </div>
            </div>
          )}

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
            {onLogout && (
              <Btn
                size="sm"
                variant="ghost"
                onClick={onLogout}
                title="Logout"
                className="!text-text-secondary hover:!text-red hover:!bg-red-soft"
              >
                <Ico d={IC.close} size={12} />
                Logout
              </Btn>
            )}
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
