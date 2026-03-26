import { useMemo, useState, useEffect, useRef } from "react";
import { Ico, IC, SBadge, Btn } from "../components/ui";
import { usePOStore } from "../store/usePOStore";
import {
  isOverdue, isIncompletePO, calcPOTotals, itemMargin, itemNet,
  fmt, fmtPct, fmtDate, diffDays, getAgingBucketsConfig, getAgingBucket,
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
  const years = useMemo(() => [...new Set(pos.map(p => new Date(p.orderDate).getFullYear()))].sort((a,b) => b-a), [pos]);
  const companies = useMemo(() => [...new Set(pos.map(p => p.company))].sort(), [pos]);
  
  const [selMonth, setSelMonth] = useState(-1);
  const [selYear, setSelYear] = useState(() => {
    const cur = new Date().getFullYear();
    if (pos.some(p => new Date(p.orderDate).getFullYear() === cur)) return cur;
    return -1;
  });
  const [selCompany, setSelCompany] = useState("all");
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [drillSearch, setDrillSearch] = useState("");
  const [detailSource, setDetailSource] = useState(null);

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

  const poTotalsMap = useMemo(() => {
    const map = new Map();
    fPos.forEach((p) => {
      map.set(p.id, calcPOTotals(p, items));
    });
    return map;
  }, [fPos, items]);

  const overdueThreshold = 7;
  const overduePOs    = useMemo(() => fPos.filter((p) => isOverdue(p, overdueThreshold)), [fPos]);
  const urgentPOs     = fPos.filter((p) => p.priority === "urgent" && !["paid", "cancelled"].includes(p.status));
  const incompletePOs = fPos.filter((p) => isIncompletePO(p));

  const agingBuckets = useMemo(() => {
    const buckets = getAgingBucketsConfig().map(b => ({ ...b, count: 0, items: [] }));
    fPos.forEach(p => {
      if (["paid", "cancelled", "received"].includes(p.status)) return;
      const days = diffDays(p.orderDate);
      const bucket = getAgingBucket(days);
      if (bucket) {
        const found = buckets.find(b => b.label === bucket.label);
        if (found) {
          found.count++;
          found.items.push(p);
        }
      }
    });
    return buckets;
  }, [fPos]);

  const overdueBucket = useMemo(() => ({
    label: "Terlambat (Overdue)",
    count: overduePOs.length,
    items: overduePOs,
    color: "#ef4444",
    isOverdue: true
  }), [overduePOs]);

  useEffect(() => {
    if (!selectedBucket) {
      if (overdueBucket.count > 0) setSelectedBucket(overdueBucket);
      else if (agingBuckets.length > 0) setSelectedBucket(agingBuckets.find(b => b.count > 0) || agingBuckets[0]);
    } else {
      // Refresh selected bucket if data changes
      if (selectedBucket.isOverdue) {
        if (selectedBucket.count !== overdueBucket.count) setSelectedBucket(overdueBucket);
      } else {
        const matched = agingBuckets.find(b => b.label === selectedBucket.label);
        if (matched && matched.count !== selectedBucket.count) setSelectedBucket(matched);
      }
    }
  }, [agingBuckets, overdueBucket]);

  const { totalRev, totalExPPN } = fPos.reduce((acc, p) => {
    const { total, exPPN } = poTotalsMap.get(p.id) || { total: 0, exPPN: 0 };
    acc.totalRev += total;
    acc.totalExPPN += exPPN;
    return acc;
  }, { totalRev: 0, totalExPPN: 0 });
  const totalMargin   = fItems.reduce((s, i) => { const m = itemMargin(i); return m !== null ? s + m : s; }, 0);
  
  const notDeliveredPOs = fPos.filter(p => !["delivered", "invoiced", "paid", "cancelled"].includes(p.status));
  const notInvoicedPOs  = fPos.filter(p => !["invoiced", "paid", "cancelled"].includes(p.status));

  const kpis = [
    { id: "total-po-kpi", label: "Total PO", val: fPos.length, sub: `Semua PO terfilter`, icon: IC.po, color: "var(--color-brand)", bg: "var(--color-brand-soft)", data: fPos },
    { id: "not-delivered", label: "Belum Kirim", val: notDeliveredPOs.length, sub: `inc. partial`, icon: IC.clock, color: "var(--color-orange)", bg: "var(--color-orange-soft)", data: notDeliveredPOs },
    { id: "not-invoiced",  label: "Belum Tagih",  val: notInvoicedPOs.length, sub: `inc. delivered`, icon: IC.stats, color: "var(--color-purple)", bg: "var(--color-purple-soft)", data: notInvoicedPOs },
    { id: "revenue",       label: "Revenue",      val: fmt(totalRev), sub: `Ex PPN: ${fmt(totalExPPN)}`, icon: IC.trend, color: "var(--color-green)", bg: "var(--color-green-soft)", data: fPos },
    { id: "surat-jalan",   label: "Surat Jalan",  val: fDos.length, sub: `${[...new Set(fDos.map(d => d.poId))].length} PO berafiliasi`, icon: IC.truck, color: "var(--color-amber)", bg: "var(--color-amber-soft)", data: fDos },
    { id: "margin",        label: "Est. Margin",  val: fmt(totalMargin), sub: `${fmtPct(totalMargin, totalExPPN)} dari rev`, icon: IC.percent, color: "var(--color-orange-dark)", bg: "var(--color-orange-soft)", data: fItems },
  ];

  const aPOCount       = useCountUp(fPos.length);
  const aNotDel        = useCountUp(notDeliveredPOs.length);
  const aNotInv        = useCountUp(notInvoicedPOs.length);
  const aDOCount       = useCountUp(fDos.length);

  const byCoAll = useMemo(() => {
    const m = {};
    fPos.forEach((p) => { const totals = poTotalsMap.get(p.id); if (totals) m[p.company] = (m[p.company] || 0) + totals.total; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [fPos, poTotalsMap]);

  const byStatusAll = useMemo(() => {
    return Object.entries(INIT_PO_STATUS).map(([k, v]) => {
      const filteredForStatus = fPos.filter((p) => p.status === k);
      const rev = filteredForStatus.reduce((s, p) => s + (poTotalsMap.get(p.id)?.total || 0), 0);
      return { k, label: v.label, count: filteredForStatus.length, revenue: rev, color: v.color, raw: filteredForStatus };
    }).filter(x => x.count > 0);
  }, [fPos, poTotalsMap]);

  const drillFiltered = useMemo(() => {
    if (!detailSource) return [];
    if (!drillSearch) return detailSource.data;
    const q = drillSearch.toLowerCase();
    return detailSource.data.filter(p => {
      const po = p.orderNo ? p : pos.find(x => x.id === (p.poId || p.id));
      if (!po) return false;
      return (po.orderNo?.toLowerCase().includes(q) || po.company?.toLowerCase().includes(q));
    });
  }, [detailSource, drillSearch, pos]);

  const handleKPISelect = (k) => {
    setDetailSource({ id: k.id, label: k.label, data: k.data });
    setDrillSearch("");
    setTimeout(() => document.getElementById("drill-section")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const monthsList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  return (
    <div className="p-5 overflow-y-auto h-full w-full bg-bg-app/20 pb-20 custom-scroll">
      {/* Global Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-surface p-4 rounded-xl border border-border-default shadow-sm lg:sticky lg:top-0 lg:z-[10]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-text-muted uppercase px-1">Bulan</span>
            <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} className="bg-bg-app border border-border-strong text-text-primary text-[12px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer">
              <option value={-1}>Semua Bulan</option>
              {monthsList.map((m, i) => <option key={m} value={i}>{m}</option>)}
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
        <Btn size="sm" variant="ghost" onClick={() => { setSelMonth(-1); setSelYear(new Date().getFullYear()); setSelCompany("all"); setDetailSource(null); }}>Reset Filter</Btn>
      </div>

      {/* KPI Cards */}
      <div className="flex flex-wrap lg:flex-nowrap gap-3 mb-6 items-stretch overflow-x-auto pb-2 custom-scroll">
        {kpis.map((k) => (
          <div key={k.id} onClick={() => handleKPISelect(k)} className={`${kpiCard} shrink-0 transition-all hover:translate-y-[-2px] hover:shadow-md cursor-pointer group ${detailSource?.id === k.id ? 'ring-2 ring-brand ring-offset-2' : ''} ${k.id === "revenue" || k.id === "margin" ? "flex-[1.5] min-w-[200px]" : "flex-1 min-w-[145px]"}`} style={{ background: k.bg }}>
            <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform" style={{ background: `${k.color}25` }}><Ico d={k.icon} size={18} color={k.color} /></div>
            <div className={`${kpiValue} ${k.id === 'revenue' || k.id === 'margin' ? 'text-[15px]' : ''}`} style={{ color: k.color }}>
              {k.id === "total-po-kpi" ? aPOCount : k.id === "not-delivered" ? aNotDel : k.id === "not-invoiced" ? aNotInv : k.id === "surat-jalan" ? aDOCount : k.val}
            </div>
            <div className={kpiLabel}>{k.label}</div>
            <div className={kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Unified Aging & Detail Group */}
      <div className="bg-surface border border-border-default rounded-xl shadow-md overflow-hidden mb-8 transition-all hover:shadow-lg">
        <div className="p-4 bg-brand/5 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-soft rounded-lg flex items-center justify-center shadow-sm"><Ico d={IC.clock} size={18} color="var(--color-brand)" /></div>
            <div>
              <h2 className="text-[16px] font-bold text-text-primary leading-tight">Aging & Overdue Analysis</h2>
              <p className="text-[11px] text-text-muted font-medium">Monitoring track record keterlambatan PO non-paid</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border-default h-full min-h-[440px]">
          {/* Left Side: Category Pickers */}
          <div className="w-full lg:w-[350px] p-5 bg-bg-app/5 flex flex-col gap-6">
            {/* 1. Overdue Category */}
            <div>
              <div className="text-[11px] font-bold text-text-secondary uppercase mb-3 px-1 flex items-center justify-between">
                <span>Pilih Kategori Overdue</span>
                {overdueBucket.count > 0 && <span className="bg-red text-white px-2 py-0.5 rounded-full text-[9px] animate-pulse">Needs Attention</span>}
              </div>
              <div 
                onClick={() => setSelectedBucket(overdueBucket)}
                className={`p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden ${
                  selectedBucket?.isOverdue 
                    ? "ring-2 ring-brand border-transparent shadow-md translate-y-[-2px]" 
                    : "bg-surface border-border-default hover:border-red/40 hover:shadow-sm"
                }`}
                style={selectedBucket?.isOverdue ? { background: `linear-gradient(135deg, white, #ef444415)` } : {}}
              >
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-red">{overdueBucket.label}</span>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors ${
                    selectedBucket?.isOverdue ? "bg-red text-white" : "bg-bg-app text-red group-hover:bg-red group-hover:text-white"
                  }`}>{overdueBucket.count}</span>
                </div>
                <div className="text-[20px] font-black text-text-primary relative z-10">
                  {overdueBucket.count} <span className="text-[12px] font-bold text-text-muted">PO</span>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Ico d={IC.warn} size={64} color="var(--color-red)" />
                </div>
              </div>
            </div>

            {/* 2. Aging Categories */}
            <div className="flex-1">
              <div className="text-[11px] font-bold text-text-secondary uppercase mb-3 px-1">
                <span>Pilih Kategori Aging</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {agingBuckets.map((b) => (
                  <div 
                    key={b.label}
                    onClick={() => setSelectedBucket(b)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group active:scale-[0.97] relative overflow-hidden ${
                      selectedBucket?.label === b.label && !selectedBucket.isOverdue
                        ? "ring-2 ring-brand border-transparent shadow-md translate-y-[-1px]" 
                        : "bg-surface border-border-default hover:border-brand-mid"
                    }`}
                    style={selectedBucket?.label === b.label && !selectedBucket.isOverdue ? { background: `linear-gradient(135deg, white, ${b.color}15)` } : {}}
                  >
                    <div className="flex justify-between items-start mb-1 relative z-10">
                      <span className="text-[9px] font-extrabold uppercase" style={{ color: b.color }}>{b.label}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                        selectedBucket?.label === b.label && !selectedBucket.isOverdue ? "bg-brand text-white" : "bg-bg-app text-text-secondary"
                      }`}>{b.count}</span>
                    </div>
                    <div className="text-[15px] font-black text-text-primary relative z-10">{b.count} <span className="text-[9px] font-bold text-text-muted">PO</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Detail List (Transition Optimized) */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-4 border-b border-border-default/50 bg-bg-app/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-text-primary uppercase tracking-tight">Detail:</span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg border border-brand/20 text-brand bg-white shadow-sm" style={{ borderColor: selectedBucket?.color + "40", color: selectedBucket?.color }}>{selectedBucket?.label || "Pilih Kategori"}</span>
              </div>
              <span className="text-[10px] text-text-muted font-bold bg-bg-app px-2 py-0.5 rounded-md border border-border-default">{selectedBucket?.items?.length || 0} PO</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll min-h-[350px] max-h-[500px]">
              {selectedBucket?.items && selectedBucket.items.length > 0 ? (
                <div className="divide-y divide-border-default/40">
                  {selectedBucket.items.map((p) => (
                    <div key={p.id} onClick={() => onJump("po", p.id)} className="p-3 hover:bg-brand-soft/30 cursor-pointer transition-colors flex items-center justify-between group">
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-text-primary group-hover:text-brand font-mono">{p.orderNo}</span>
                          <SBadge status={p.status} cfg={INIT_PO_STATUS} className="scale-75 origin-left" />
                        </div>
                        <div className="text-[11px] text-text-secondary truncate font-medium">{p.company}</div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-4">
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-lg border border-border-default bg-bg-app group-hover:border-brand-mid transition-all shadow-sm">
                          {diffDays(p.orderDate)} hari
                        </span>
                        <span className="text-[9px] text-text-muted mt-1">{fmtDate(p.orderDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-10 text-center text-text-muted">
                  <Ico d={IC.info} size={32} color="var(--color-border-strong)" className="mb-2 opacity-30" />
                  <div className="text-sm font-bold">Tidak ada data</div>
                  <p className="text-[11px] max-w-[200px] mt-1">Gunakan filter global untuk menyesuaikan cakupan data.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-default bg-surface-alt/50">
              <Btn 
                variant="primary" 
                className="w-full !py-2.5 !text-[12px] font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all group"
                onClick={() => {
                   const bucketLabel = selectedBucket?.label;
                   if (bucketLabel) {
                     localStorage.setItem("po-list-colF", JSON.stringify({ aging: [bucketLabel] }));
                     onJump("po");
                   }
                }}
              >
                <span>Lihat "{selectedBucket?.label}" di PO List</span>
                <Ico d={IC.chevR} size={14} className="group-hover:translate-x-1 transition-transform" />
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Tables/Charts and Drill-down details follow same pattern... */}
      {detailSource && (
        <div id="drill-section" className="mb-10 bg-surface border border-brand/20 rounded-xl shadow-lg animate-in slide-in-from-bottom duration-300">
           <div className="p-3 border-b border-border-default flex justify-between items-center bg-brand/5 rounded-t-xl gap-4">
              <span className="text-sm font-bold text-text-primary uppercase tracking-tight">Detail: {detailSource.label}</span>
              <div className="flex-1 max-w-[300px] relative">
                <Ico d={IC.search} size={12} color="var(--color-text-muted)" className="absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input value={drillSearch} onChange={(e) => setDrillSearch(e.target.value)} placeholder="Filter detail..." className="w-full bg-white border border-border-strong rounded-lg pl-8 pr-3 py-1 text-xs outline-none" />
              </div>
              <button onClick={() => setDetailSource(null)} className="p-1"><Ico d={IC.close} size={14} color="var(--color-text-muted)" /></button>
           </div>
           <div className="max-h-[300px] overflow-y-auto custom-scroll bg-white rounded-b-xl">
             <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-surface-alt shadow-sm">
                  <tr>
                    <th className="p-3 border-b text-left">No. Order</th>
                    <th className="p-3 border-b text-left">Perusahaan</th>
                    <th className="p-3 border-b text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {drillFiltered.map(p => {
                    const po = p.orderNo ? p : pos.find(x => x.id === (p.poId || p.id));
                    if (!po) return null;
                    const tot = poTotalsMap.get(po.id)?.total || 0;
                    return (
                      <tr key={po.id} className="border-b hover:bg-bg-app cursor-pointer" onClick={() => onJump("po", po.id)}>
                        <td className="p-3 font-mono font-bold text-brand">{po.orderNo}</td>
                        <td className="p-3 text-text-secondary">{po.company}</td>
                        <td className="p-3 text-right font-mono font-bold">{fmt(tot)}</td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Row of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
        <div className={chartBox}>
          <div className="font-bold text-sm mb-4 border-b pb-2 flex justify-between">
             <span>Revenue per Perusahaan</span>
             <span className="text-[10px] font-mono text-text-muted">{fmt(totalRev)}</span>
          </div>
          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2 custom-scroll">
            {byCoAll.map(([co, val]) => (
              <div key={co} className="group cursor-pointer" onClick={() => handleKPISelect({ id: `co-${co}`, label: co, data: fPos.filter(p => p.company === co) })}>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[12px] truncate max-w-[200px] font-medium">{co}</span>
                  <span className="text-[12px] font-bold font-mono">{fmt(val)}</span>
                </div>
                <div className="h-[6px] bg-bg-app rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${(val / (byCoAll[0]?.[1] || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={chartBox}>
          <div className="font-bold text-sm mb-4 border-b pb-2">Status Analysis</div>
          <div className="space-y-3.5">
            {byStatusAll.map(s => (
               <div key={s.k} className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-app cursor-pointer border border-transparent hover:border-border-default" onClick={() => handleKPISelect({ id: `st-${s.k}`, label: s.label, data: s.raw })}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-[12px] font-medium">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold bg-white border px-1.5 py-0.5 rounded shadow-sm">{s.count} PO</span>
                    <span className="text-xs font-bold font-mono text-brand">{fmt(s.revenue)}</span>
                  </div>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
