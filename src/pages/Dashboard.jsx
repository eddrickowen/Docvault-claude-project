import { useMemo, useState, useEffect, useRef } from "react";
import { Ico, IC, SBadge, Btn } from "../components/ui";
import { usePOStore } from "../store/usePOStore";
import {
  isOverdue, isIncompletePO, calcPOTotals, itemMargin, itemNet,
  fmt, fmtShort, fmtPct, diffDays,
} from "../lib/helpers";
import { INIT_PO_STATUS } from "../lib/constants";

/* ── Class constants ── */
const kpiCard  = "border border-border-default rounded-[10px] p-[14px_16px] shadow-sm";
const kpiValue = "text-[18px] font-extrabold leading-tight break-words";
const kpiLabel = "text-[13px] font-semibold text-text-secondary mt-[3px]";
const kpiSub   = "text-xs text-text-muted mt-0.5";
const chartBox = "bg-surface border border-border-default rounded-[10px] p-4 shadow-sm";
const alertRow = "flex justify-between items-center mb-[7px] cursor-pointer py-1 px-1.5 rounded-[5px]";

const PeriodBtn = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
      active 
        ? "bg-brand text-white shadow-sm" 
        : "bg-surface text-text-secondary hover:bg-bg-app border border-border-default"
    }`}
  >
    {label}
  </button>
);

/* ── Animated count-up hook ── */
function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let raf;
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(start + diff * eased);
      setVal(current);
      if (progress < 1) raf = requestAnimationFrame(step);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ── Month Sparkline ── */
function MonthSparkline({ pos, selYear, selMonth, setSelMonth }) {
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
  const data = useMemo(() => {
    const counts = new Array(12).fill(0);
    pos.forEach(p => {
      const d = new Date(p.orderDate);
      if (selYear !== -1 && d.getFullYear() !== selYear) return;
      counts[d.getMonth()]++;
    });
    return counts;
  }, [pos, selYear]);
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-[36px]">
      {data.map((c, i) => (
        <button
          key={i}
          onClick={() => setSelMonth(selMonth === i ? -1 : i)}
          title={`${months[i]}: ${c} PO`}
          className={`flex-1 rounded-[3px] transition-all duration-200 min-w-[18px] hover:brightness-110 relative group ${
            selMonth === i ? "ring-1 ring-brand ring-offset-1" : ""
          }`}
          style={{
            height: `${Math.max(4, (c / max) * 100)}%`,
            background: selMonth === i ? "var(--color-brand)" : c > 0 ? "var(--color-brand-mid)" : "var(--color-bg-app)",
          }}
        >
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-text-muted">{months[i]}</span>
          {c > 0 && (
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">{c}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Dashboard — KPI cards, charts, overdue/urgent alerts.
 */
export function Dashboard({ onJump }) {
  const { pos, items, dos, settings } = usePOStore();
  const [selMonth, setSelMonth] = useState(-1); // -1 = All
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selCompany, setSelCompany] = useState("all");
  const [overdueThreshold, setOverdueThreshold] = useState(settings.overdueDays || 7);
  const [detailSource, setDetailSource] = useState(null); // { type, label, data }
  const [drillSearch, setDrillSearch] = useState("");

  const companies = useMemo(() => [...new Set(pos.map(p => p.company))].sort(), [pos]);
  const years = useMemo(() => [...new Set(pos.map(p => new Date(p.orderDate).getFullYear()))].sort((a,b) => b-a), [pos]);

  const filteredData = useMemo(() => {
    let fPos = [...pos];
    if (selYear !== -1) fPos = fPos.filter(p => new Date(p.orderDate).getFullYear() === selYear);
    if (selMonth !== -1) fPos = fPos.filter(p => new Date(p.orderDate).getMonth() === selMonth);
    if (selCompany !== "all") fPos = fPos.filter(p => p.company === selCompany);
    const fPoIds = new Set(fPos.map(p => p.id));
    const fItems = items.filter(i => fPoIds.has(i.poId));
    const fDos = dos.filter(d => fPoIds.has(d.poId));
    return { fPos, fItems, fDos };
  }, [pos, items, dos, selMonth, selYear, selCompany]);

  const { fPos, fItems, fDos } = filteredData;

  const overduePOs    = fPos.filter((p) => isOverdue(p, overdueThreshold));
  const urgentPOs     = fPos.filter((p) => p.priority === "urgent" && !["paid", "cancelled"].includes(p.status));
  const incompletePOs = fPos.filter((p) => isIncompletePO(p));
  
  const { totalRev, totalExPPN } = fPos.reduce((acc, p) => {
    const { total, exPPN } = calcPOTotals(p, items);
    acc.totalRev += total;
    acc.totalExPPN += exPPN;
    return acc;
  }, { totalRev: 0, totalExPPN: 0 });
  const totalMargin   = fItems.reduce((s, i) => { const m = itemMargin(i); return m !== null ? s + m : s; }, 0);
  
  const notDeliveredPOs = fPos.filter(p => !["delivered", "invoiced", "paid", "cancelled"].includes(p.status));
  const notInvoicedPOs  = fPos.filter(p => !["invoiced", "paid", "cancelled"].includes(p.status));

  const kpis = [
    { id: "total-po",      label: "Total PO",     val: fPos.length, sub: `Semua PO terfilter`, icon: IC.po, color: "var(--color-brand)", bg: "var(--color-brand-soft)", data: fPos },
    { id: "not-delivered", label: "Belum Kirim", val: notDeliveredPOs.length, sub: `inc. partial`, icon: IC.clock, color: "var(--color-orange)", bg: "var(--color-orange-soft)", data: notDeliveredPOs },
    { id: "not-invoiced",  label: "Belum Tagih",  val: notInvoicedPOs.length, sub: `inc. delivered`, icon: IC.stats, color: "var(--color-purple)", bg: "var(--color-purple-soft)", data: notInvoicedPOs },
    { id: "revenue",       label: "Revenue",      val: fmt(totalRev), sub: `Ex PPN: ${fmt(totalExPPN)}`, icon: IC.trend, color: "var(--color-green)", bg: "var(--color-green-soft)", data: fPos },
    { id: "surat-jalan",   label: "Surat Jalan",  val: fDos.length, sub: `${[...new Set(fDos.map(d => d.poId))].length} PO berafiliasi`, icon: IC.truck, color: "var(--color-amber)", bg: "var(--color-amber-soft)", data: fDos },
    { id: "margin",        label: "Est. Margin",  val: fmt(totalMargin), sub: `${fmtPct(totalMargin, totalExPPN)} dari rev`, icon: IC.percent, color: "var(--color-orange-dark)", bg: "var(--color-orange-soft)", data: fItems },
  ];

  /* ── Animated counters ── */
  const aPOCount       = useCountUp(fPos.length);
  const aNotDel        = useCountUp(notDeliveredPOs.length);
  const aNotInv        = useCountUp(notInvoicedPOs.length);
  const aDOCount       = useCountUp(fDos.length);

  const [showAllCo, setShowAllCo] = useState(false);
  const [showAllStatus, setShowAllStatus] = useState(false);

  const byCoAll = useMemo(() => {
    const m = {};
    fPos.forEach((p) => { const t = calcPOTotals(p, items).total; m[p.company] = (m[p.company] || 0) + t; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [fPos, items]);
  const byCo = showAllCo ? byCoAll : byCoAll.slice(0, 3);

  const byStatusAll = useMemo(() => {
    const stats = Object.entries(INIT_PO_STATUS).map(([k, v]) => {
      const filteredForStatus = fPos.filter((p) => p.status === k);
      const rev = filteredForStatus.reduce((s, p) => s + calcPOTotals(p, items).total, 0);
      return { k, label: v.label, count: filteredForStatus.length, revenue: rev, color: v.color, raw: filteredForStatus };
    });
    return stats.filter((x) => x.count > 0 || x.revenue > 0);
  }, [fPos, items]);
  const byStatus = showAllStatus ? byStatusAll : byStatusAll.slice(0, 3);

  const maxCo = byCoAll.length ? byCoAll[0][1] : 1;
  const maxStatRev = byStatusAll.length ? Math.max(...byStatusAll.map(s => s.revenue)) : 1;
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const drillFiltered = useMemo(() => {
    if (!detailSource) return [];
    if (!drillSearch) return detailSource.data;
    const q = drillSearch.toLowerCase();
    return detailSource.data.filter(p => {
      const po = p.orderNo ? p : pos.find(x => x.id === (p.poId || p.id));
      if (!po) return false;
      return (
        po.orderNo?.toLowerCase().includes(q) ||
        po.company?.toLowerCase().includes(q) ||
        String(po.status)?.toLowerCase().includes(q)
      );
    });
  }, [detailSource, drillSearch, pos]);

  const handleKPISelect = (k) => {
    setDetailSource({ type: k.id, label: k.label, data: k.data });
    setDrillSearch("");
    setTimeout(() => {
      const el = document.getElementById("drill-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-2", "ring-brand", "ring-offset-4");
        setTimeout(() => el.classList.remove("ring-2", "ring-brand", "ring-offset-4"), 2000);
      }
    }, 100);
  };

  return (
    <div className="p-5 overflow-y-auto h-full w-full bg-bg-app/20 pb-20 custom-scroll">
      {/* Global Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-surface p-4 rounded-xl border border-border-default shadow-sm lg:sticky lg:top-0 lg:z-[10]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-muted uppercase px-1">Bulan</span>
            <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} className="bg-bg-app border border-border-strong text-text-primary text-[12px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer">
              <option value={-1}>Semua Bulan</option>
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-muted uppercase px-1">Tahun</span>
            <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} className="bg-bg-app border border-border-strong text-text-primary text-[12px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer">
              <option value={-1}>Semua Tahun</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-muted uppercase px-1">Perusahaan</span>
            <select value={selCompany} onChange={(e) => setSelCompany(e.target.value)} className="bg-bg-app border border-border-strong text-text-primary text-[12px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer max-w-[200px]">
              <option value="all">Semua Perusahaan</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Btn size="sm" variant="ghost" onClick={() => { setSelMonth(-1); setSelYear(new Date().getFullYear()); setSelCompany("all"); setDetailSource(null); }}>
             Reset Filter
          </Btn>
        </div>
      </div>

      {/* Month Sparkline */}
      <div className="bg-surface border border-border-default rounded-xl p-4 pb-7 mb-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wide flex items-center gap-2">
            <Ico d={IC.stats} size={12} color="var(--color-brand)" />
            PO Timeline {selYear !== -1 ? selYear : "(Semua Tahun)"}
          </div>
          {selMonth !== -1 && (
            <button onClick={() => setSelMonth(-1)} className="text-[10px] text-brand font-semibold hover:underline">Reset Bulan</button>
          )}
        </div>
        <MonthSparkline pos={pos} selYear={selYear} selMonth={selMonth} setSelMonth={setSelMonth} />
      </div>

      {/* KPI Cards */}
      <div className="flex flex-wrap lg:flex-nowrap gap-3 mb-6 items-stretch overflow-x-auto pb-2 custom-scroll">
        {kpis.map((k) => (
          <div 
            key={k.id} 
            onClick={() => handleKPISelect(k)}
            className={`${kpiCard} shrink-0 transition-all hover:translate-y-[-2px] hover:shadow-md cursor-pointer group active:scale-[0.98] ${detailSource?.type === k.id ? 'ring-2 ring-brand ring-offset-2' : ''} ${k.id === "revenue" || k.id === "margin" ? "flex-[1.5] min-w-[200px]" : "flex-1 min-w-[145px]"}`} 
            style={{ background: k.bg }}
          >
            <div className="flex justify-between items-start">
              <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform" style={{ background: `${k.color}25` }}>
                <Ico d={k.icon} size={18} color={k.color} />
              </div>
              {detailSource?.type === k.id && <div className="bg-brand text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">Selected</div>}
            </div>
            <div className={`${kpiValue} ${k.id === 'revenue' || k.id === 'margin' ? 'text-[15px]' : ''}`} style={{ color: k.color }} title={String(k.val)}>
              {k.id === "total-po" ? aPOCount : k.id === "not-delivered" ? aNotDel : k.id === "not-invoiced" ? aNotInv : k.id === "surat-jalan" ? aDOCount : k.val}
            </div>
            <div className={kpiLabel}>{k.label}</div>
            <div className={kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))" }}>
        <div className={chartBox}>
          <div className="flex justify-between items-center mb-4 border-b border-border-default pb-2">
            <div className="text-[15px] font-bold text-text-primary flex items-center gap-2">
               <Ico d={IC.stats} size={14} color="var(--color-brand)" />
               Revenue per Perusahaan
               <span className="ml-auto text-[11px] font-mono text-text-muted bg-bg-app px-2 py-0.5 rounded border border-border-default">Total: {fmt(totalRev)}</span>
            </div>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scroll">
            {byCoAll.map(([co, val]) => (
              <div key={co} className="group cursor-pointer hover:bg-bg-app p-1 rounded-lg transition-colors" onClick={() => handleKPISelect({ id: `co-${co}`, label: `Revenue: ${co}`, data: fPos.filter(p => p.company === co) })}>
                <div className="flex justify-between items-end mb-[5px]">
                  <span className="text-[13px] text-text-secondary truncate max-w-[260px] font-medium" title={co}>{co}</span>
                  <span className="text-[13px] font-bold text-text-primary font-mono bg-bg-app px-2 py-0.5 rounded-md">{fmt(val)}</span>
                </div>
                <div className="h-[7px] bg-bg-app rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-brand rounded-full transition-all duration-500 group-hover:brightness-110" style={{ width: `${(val / maxCo) * 100}%` }} />
                </div>
              </div>
            ))}
            {byCoAll.length === 0 && <div className="text-center py-10 text-text-muted text-xs">Tidak ada data untuk filter ini</div>}
          </div>
        </div>

        <div className={chartBox}>
          <div className="flex justify-between items-center mb-4 border-b border-border-default pb-2">
            <div className="text-[15px] font-bold text-text-primary flex items-center gap-2">
               <Ico d={IC.trend} size={14} color="var(--color-green)" />
               Status: Revenue & Jumlah
               <span className="ml-auto text-[11px] font-mono text-text-muted bg-bg-app px-2 py-0.5 rounded border border-border-default">Total: {fPos.length} PO | {fmt(totalRev)}</span>
            </div>
            {detailSource?.type?.startsWith('status-') && <button onClick={() => setDetailSource(null)} className="text-[10px] text-brand hover:underline">Clear View</button>}
          </div>
          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2 custom-scroll">
            {byStatusAll.map((s) => (
              <div 
                key={s.k} 
                className={`flex flex-col gap-1.5 p-2 rounded-lg transition-all cursor-pointer hover:bg-bg-app border border-transparent hover:border-border-default hover:shadow-sm group ${detailSource?.type === `status-${s.k}` ? 'bg-bg-app border-brand/30 shadow-sm' : ''}`}
                onClick={() => handleKPISelect({ id: `status-${s.k}`, label: `Status: ${s.label}`, data: s.raw })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 max-w-[180px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transform group-hover:scale-125 transition-transform" style={{ background: s.color }} />
                    <span className="text-[13px] text-text-secondary truncate font-semibold group-hover:text-brand transition-colors">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold bg-white text-text-secondary border border-border-default px-1.5 py-0.5 rounded shadow-sm group-hover:bg-brand-soft group-hover:text-brand transition-all">{s.count} PO</span>
                    <span className="text-xs font-extrabold text-text-primary font-mono group-hover:text-brand transition-colors">{fmt(s.revenue)}</span>
                  </div>
                </div>
                <div className="h-[6px] bg-bg-app rounded-full overflow-hidden shadow-inner">
                  <div className="h-full transition-all duration-700 ease-out group-hover:brightness-105" style={{ background: s.color, width: `${(s.revenue / maxStatRev) * 100}%` }} />
                </div>
              </div>
            ))}
            {byStatusAll.length === 0 && <div className="text-center py-10 text-text-muted text-xs">Tidak ada data untuk filter ini</div>}
          </div>
        </div>
      </div>

      {/* Drill-down Detail List (Floating/Pinned at bottom if active) */}
      {detailSource && (
        <div id="drill-section" className="mb-6 bg-surface border border-brand/20 rounded-xl shadow-lg animate-in slide-in-from-bottom duration-300 transition-all">
          <div className="p-3 border-b border-border-default flex justify-between items-center bg-brand/5 rounded-t-xl gap-4">
            <div className="flex items-center gap-2 min-w-fit">
              <div className="w-2 h-4 bg-brand rounded-full"></div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Detail: {detailSource.label} ({detailSource.data.length})</h3>
            </div>
            
            <div className="flex-1 max-w-[400px] relative">
              <Ico d={IC.search} size={12} color="var(--color-text-muted)" className="absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input 
                value={drillSearch}
                onChange={(e) => setDrillSearch(e.target.value)}
                placeholder="Cari di list detail..."
                className="w-full bg-white border border-border-strong rounded-lg pl-8 pr-3 py-1 text-xs outline-none focus:border-brand"
              />
            </div>

            <button onClick={() => { setDetailSource(null); setDrillSearch(""); }} className="p-1 hover:bg-bg-app rounded-full shrink-0">
               <Ico d={IC.close} size={14} color="var(--color-text-muted)" />
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scroll">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface shadow-sm text-[10px] font-bold text-text-muted uppercase z-[5]">
                <tr>
                  {detailSource.type === "surat-jalan" ? (
                    <>
                      <th className="px-4 py-2 border-b">No. DO</th>
                      <th className="px-4 py-2 border-b">No. PO</th>
                      <th className="px-4 py-2 border-b">Customer</th>
                      <th className="px-4 py-2 border-b">Tgl Kirim</th>
                      <th className="px-4 py-2 border-b text-center">Items</th>
                    </>
                  ) : detailSource.type === "margin" ? (
                    <>
                      <th className="px-4 py-2 border-b">Item Name</th>
                      <th className="px-4 py-2 border-b">PO No</th>
                      <th className="px-4 py-2 border-b text-right">Qty</th>
                      <th className="px-4 py-2 border-b text-right">Net</th>
                      <th className="px-4 py-2 border-b text-right">Margin</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2 border-b">No. Order</th>
                      <th className="px-4 py-2 border-b">Perusahaan</th>
                      <th className="px-4 py-2 border-b">Tanggal</th>
                      <th className="px-4 py-2 border-b text-right">Total</th>
                      <th className="px-4 py-2 border-b text-center">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {drillFiltered.map((p, idx) => {
                  if (detailSource.type === "surat-jalan") {
                    const d = p; // p is a DO object here
                    const po = pos.find(x => x.id === d.poId);
                    return (
                      <tr key={d.id + idx} className="hover:bg-brand-soft cursor-pointer transition-colors border-b border-border-default/50 group" onClick={() => onJump("po", d.poId)}>
                        <td className="px-4 py-2 font-bold text-brand">{d.doNo}</td>
                        <td className="px-4 py-2 font-mono">{po?.orderNo || "–"}</td>
                        <td className="px-4 py-2 text-text-secondary truncate max-w-[150px]">{po?.company || "–"}</td>
                        <td className="px-4 py-2 text-text-muted">{d.deliveryDate}</td>
                        <td className="px-4 py-2 text-center font-bold text-text-secondary">{d.lines?.length || 0}</td>
                      </tr>
                    );
                  }
                  if (detailSource.type === "margin") {
                    const item = p; // p is an item object here
                    const po = pos.find(x => x.id === item.poId);
                    const mg = itemMargin(item);
                    return (
                      <tr key={item.id + idx} className="hover:bg-brand-soft cursor-pointer transition-colors border-b border-border-default/50 group" onClick={() => onJump("po", item.poId)}>
                        <td className="px-4 py-2 font-bold text-text-primary group-hover:text-brand transition-colors">{item.itemName}</td>
                        <td className="px-4 py-2 font-mono text-brand">{po?.orderNo || "–"}</td>
                        <td className="px-4 py-2 text-right font-mono">{item.qty} {item.unit}</td>
                        <td className="px-4 py-2 text-right font-bold font-mono">{fmt(itemNet(item))}</td>
                        <td className={`px-4 py-2 text-right font-bold font-mono ${mg >= 0 ? "text-green" : "text-red"}`}>{fmt(mg)}</td>
                      </tr>
                    );
                  }

                  const po = p.orderNo ? p : pos.find(x => x.id === (p.poId || p.id));
                  if (!po) return null;
                  const totals = calcPOTotals(po, items);
                  return (
                    <tr 
                      key={po.id + idx} 
                      className="hover:bg-brand-soft cursor-pointer transition-colors border-b border-border-default/50 group"
                      onClick={() => onJump("po", po.id)}
                    >
                      <td className="px-4 py-2 font-bold text-text-primary group-hover:text-brand transition-colors">{po.orderNo}</td>
                      <td className="px-4 py-2 text-text-secondary truncate max-w-[150px]" title={po.company}>{po.company}</td>
                      <td className="px-4 py-2 text-text-muted font-mono">{po.orderDate}</td>
                      <td className="px-4 py-2 text-right font-bold text-text-primary font-mono">{fmt(totals.total)}</td>
                      <td className="px-4 py-2 text-center">
                        <div className="scale-75 origin-center inline-block">
                          <SBadge status={po.status} cfg={INIT_PO_STATUS} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {/* Overdue Alert with Threshold Selector */}
        <div className="bg-amber-soft/40 border border-amber-mid/30 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber/10 rounded-lg flex items-center justify-center">
                <Ico d={IC.warn} size={16} color="var(--color-amber)" />
              </div>
              <span className="text-[15px] font-bold text-amber">Overdue ({overduePOs.length})</span>
            </div>
            <select 
              value={overdueThreshold} 
              onChange={(e) => setOverdueThreshold(Number(e.target.value))}
              className="bg-bg-app border border-amber/20 text-amber text-[10px] font-bold rounded-md px-2 py-1 outline-none cursor-pointer"
            >
              {[7, 14, 24, 31].map(v => <option key={v} value={v}>&gt;= {v} hari</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {overduePOs.slice(0, 5).map((p) => (
              <div key={p.id} onClick={() => onJump("po", p.id)} className={`${alertRow} hover:bg-warning-soft bg-surface border border-transparent hover:border-amber/20 transition-all`}>
                <div className="flex flex-col overflow-hidden">
                  <div className="text-[13px] font-bold truncate text-text-primary">{p.orderNo}</div>
                  <div className="text-[11px] text-text-secondary truncate">{p.company}</div>
                </div>
                <span className="text-[11px] font-bold font-mono text-amber bg-warning-soft border border-amber/10 rounded-lg px-2 py-1 shadow-sm shrink-0">
                  {diffDays(p.orderDate)} hari
                </span>
              </div>
            ))}
            {overduePOs.length > 5 && (
              <button onClick={() => onJump("po")} className="w-full py-2 text-[10px] font-bold text-amber hover:bg-amber/10 rounded-lg border border-dashed border-amber/30 transition-all">
                + {overduePOs.length - 5} lainnya (Lihat Semua)
              </button>
            )}
            {overduePOs.length === 0 && <div className="text-center py-4 text-text-muted text-xs italic">Tidak ada PO yang overdue pada periode ini</div>}
          </div>
        </div>

        {urgentPOs.length > 0 && (
          <div className="bg-red-soft/40 border border-red-mid/30 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-red/10 rounded-lg flex items-center justify-center">
                <Ico d={IC.fire} size={16} color="var(--color-red)" />
              </div>
              <span className="text-[15px] font-bold text-red">Urgent ({urgentPOs.length})</span>
            </div>
            <div className="space-y-2">
              {urgentPOs.slice(0, 5).map((p) => (
                <div key={p.id} onClick={() => onJump("po", p.id)} className={`${alertRow} hover:bg-danger-soft bg-surface border border-transparent hover:border-red/20 transition-all`}>
                  <div className="flex flex-col overflow-hidden">
                    <div className="text-[13px] font-bold truncate text-text-primary">{p.orderNo}</div>
                    <div className="text-[11px] text-text-secondary truncate">{p.company}</div>
                  </div>
                  <div className="shrink-0 scale-90 origin-right">
                    <SBadge status={p.status} cfg={INIT_PO_STATUS} />
                  </div>
                </div>
              ))}
              {urgentPOs.length > 5 && (
                <button onClick={() => onJump("po")} className="w-full py-2 text-[10px] font-bold text-red hover:bg-red/10 rounded-lg border border-dashed border-red/30 transition-all">
                  + {urgentPOs.length - 5} lainnya (Lihat Semua)
                </button>
              )}
            </div>
          </div>
        )}

        {incompletePOs.length > 0 && (
          <div className="bg-orange-soft/40 border border-orange-mid/30 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-orange-dark/10 rounded-lg flex items-center justify-center">
                <Ico d={IC.warn} size={16} color="var(--color-orange-dark)" />
              </div>
              <span className="text-[15px] font-bold text-orange-dark">Info Parsial ({incompletePOs.length})</span>
            </div>
            <div className="space-y-2">
              {incompletePOs.slice(0, 5).map((p) => {
                const missing = [];
                if (!p.orderNo?.trim() || p.orderNo.trim() === "Order") missing.push("No. PO");
                if (!p.orderDate || p.orderDate === "dd/mm/yyyy") missing.push("Tanggal");
                return (
                  <div key={p.id} onClick={() => onJump("po", p.id)} className={`${alertRow} hover:bg-orange-mid/10 bg-surface border border-transparent hover:border-orange-dark/20 transition-all`}>
                    <div className="flex flex-col overflow-hidden">
                      <div className="text-[13px] font-bold truncate text-text-primary">{p.orderNo || "(No. kosong)"}</div>
                      <div className="text-[11px] truncate text-orange-dark/70 font-medium">{missing.join(", ") || "Info tidak detail"}</div>
                    </div>
                    <div className="shrink-0 text-[10px] font-extrabold uppercase bg-orange-soft text-orange-dark px-2 py-1 rounded-lg border border-orange-dark/10">Pending</div>
                  </div>
                );
              })}
              {incompletePOs.length > 5 && (
                <button onClick={() => onJump("po")} className="w-full py-2 text-[10px] font-bold text-orange-dark hover:bg-orange-dark/10 rounded-lg border border-dashed border-orange-dark/30 transition-all">
                  + {incompletePOs.length - 5} lainnya (Lihat Semua)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
