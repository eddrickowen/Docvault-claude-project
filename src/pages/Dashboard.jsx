import { useMemo, useState } from "react";
import { Ico, IC, SBadge, Btn } from "../components/ui";
import { usePOStore } from "../store/usePOStore";
import {
  isOverdue, isIncompletePO, calcPOTotals, itemMargin,
  fmtShort, fmtPct, diffDays,
} from "../lib/helpers";
import { INIT_PO_STATUS } from "../lib/constants";

/* ── Class constants ── */
const kpiCard  = "border border-border-default rounded-[10px] p-[14px_16px] shadow-sm";
const kpiValue = "text-[22px] font-extrabold leading-none";
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

  const companies = useMemo(() => [...new Set(pos.map(p => p.company))].sort(), [pos]);
  const years = useMemo(() => [...new Set(pos.map(p => new Date(p.orderDate).getFullYear()))].sort((a,b) => b-a), [pos]);

  const filteredData = useMemo(() => {
    let fPos = [...pos];

    if (selYear !== -1) {
      fPos = fPos.filter(p => new Date(p.orderDate).getFullYear() === selYear);
    }
    if (selMonth !== -1) {
      fPos = fPos.filter(p => new Date(p.orderDate).getMonth() === selMonth);
    }
    if (selCompany !== "all") {
      fPos = fPos.filter(p => p.company === selCompany);
    }

    const fPoIds = new Set(fPos.map(p => p.id));
    const fItems = items.filter(i => fPoIds.has(i.poId));
    const fDos = dos.filter(d => fPoIds.has(d.poId));

    return { fPos, fItems, fDos };
  }, [pos, items, dos, selMonth, selYear, selCompany]);

  const { fPos, fItems, fDos } = filteredData;

  // Granular Overdue Threshold
  const overduePOs    = fPos.filter((p) => isOverdue(p, overdueThreshold));
  const urgentPOs     = fPos.filter((p) => p.priority === "urgent" && !["paid", "cancelled"].includes(p.status));
  const incompletePOs = fPos.filter((p) => isIncompletePO(p));
  
  const totalRev      = fPos.reduce((s, p) => s + calcPOTotals(p, items).total, 0);
  const totalExPPN    = fPos.reduce((s, p) => s + calcPOTotals(p, items).exPPN, 0);
  const totalMargin   = fItems.reduce((s, i) => { const m = itemMargin(i); return m !== null ? s + m : s; }, 0);
  
  // Specific KPIs
  const notDeliveredPOs = fPos.filter(p => !["delivered", "invoiced", "paid", "cancelled"].includes(p.status));
  const notInvoicedPOs  = fPos.filter(p => !["invoiced", "paid", "cancelled"].includes(p.status));

  const kpis = [
    { id: "not-delivered", label: "Belum Kirim", val: notDeliveredPOs.length, sub: `inc. partial`, icon: IC.po, color: "var(--color-brand)", bg: "var(--color-brand-soft)", data: notDeliveredPOs },
    { id: "not-invoiced",  label: "Belum Tagih",  val: notInvoicedPOs.length, sub: `inc. delivered`, icon: IC.stats, color: "var(--color-purple)", bg: "var(--color-purple-soft)", data: notInvoicedPOs },
    { id: "revenue",       label: "Revenue",      val: fmtShort(totalRev), sub: `Ex PPN: ${fmtShort(totalExPPN)}`, icon: IC.trend, color: "var(--color-green)", bg: "var(--color-green-soft)", data: fPos },
    { id: "margin",        label: "Est. Margin",  val: fmtShort(totalMargin), sub: `${fmtPct(totalMargin, totalExPPN)} dari rev`, icon: IC.trend, color: "var(--color-orange)", bg: "#fff7ed", data: fItems },
    { id: "surat-jalan",   label: "Surat Jalan",  val: fDos.length, sub: `${[...new Set(fDos.map(d => d.poId))].length} PO berafiliasi`, icon: IC.truck, color: "var(--color-amber)", bg: "var(--color-amber-soft)", data: fDos },
  ];

  const byCo = useMemo(() => {
    const m = {};
    fPos.forEach((p) => { const t = calcPOTotals(p, items).total; m[p.company] = (m[p.company] || 0) + t; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [fPos, items]);

  const byStatus = useMemo(() => {
    const stats = Object.entries(INIT_PO_STATUS).map(([k, v]) => {
      const filteredForStatus = fPos.filter((p) => p.status === k);
      const rev = filteredForStatus.reduce((s, p) => s + calcPOTotals(p, items).total, 0);
      return { k, label: v.label, count: filteredForStatus.length, revenue: rev, color: v.color, raw: filteredForStatus };
    });
    return stats.filter((x) => x.count > 0 || x.revenue > 0);
  }, [fPos, items]);

  const maxCo = byCo.length ? byCo[0][1] : 1;
  const maxStatRev = byStatus.length ? Math.max(...byStatus.map(s => s.revenue)) : 1;

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  return (
    <div className="p-5 overflow-y-auto h-full w-full bg-bg-app/20 pb-20">
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

      {/* KPI Cards */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        {kpis.map((k) => (
          <div 
            key={k.id} 
            onClick={() => setDetailSource({ type: k.id, label: k.label, data: k.data })}
            className={`${kpiCard} transition-all hover:translate-y-[-2px] hover:shadow-md cursor-pointer group active:scale-[0.98] ${detailSource?.type === k.id ? 'ring-2 ring-brand ring-offset-2' : ''}`} 
            style={{ background: k.bg }}
          >
            <div className="flex justify-between items-start">
              <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform" style={{ background: `${k.color}25` }}>
                <Ico d={k.icon} size={18} color={k.color} />
              </div>
              {detailSource?.type === k.id && <div className="bg-brand text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">Selected</div>}
            </div>
            <div className={kpiValue} style={{ color: k.color }}>{k.val}</div>
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
            </div>
          </div>
          <div className="space-y-4">
            {byCo.map(([co, val]) => (
              <div key={co} className="group">
                <div className="flex justify-between items-end mb-[5px]">
                  <span className="text-[13px] text-text-secondary truncate max-w-[260px] font-medium" title={co}>{co}</span>
                  <span className="text-[13px] font-bold text-text-primary font-mono bg-bg-app px-2 py-0.5 rounded-md">{fmtShort(val)}</span>
                </div>
                <div className="h-[7px] bg-bg-app rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-brand rounded-full transition-all duration-500 group-hover:brightness-110" style={{ width: `${(val / maxCo) * 100}%` }} />
                </div>
              </div>
            ))}
            {byCo.length === 0 && <div className="text-center py-10 text-text-muted text-xs">Tidak ada data untuk filter ini</div>}
          </div>
        </div>

        <div className={chartBox}>
          <div className="flex justify-between items-center mb-4 border-b border-border-default pb-2">
            <div className="text-[15px] font-bold text-text-primary flex items-center gap-2">
               <Ico d={IC.trend} size={14} color="var(--color-green)" />
               Status: Revenue & Jumlah
            </div>
            {detailSource?.type?.startsWith('status-') && <button onClick={() => setDetailSource(null)} className="text-[10px] text-brand hover:underline">Clear View</button>}
          </div>
          <div className="space-y-3.5">
            {byStatus.map((s) => (
              <div 
                key={s.k} 
                className={`flex flex-col gap-1.5 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-bg-app ${detailSource?.type === `status-${s.k}` ? 'bg-bg-app ring-1 ring-border-strong' : ''}`}
                onClick={() => setDetailSource({ type: `status-${s.k}`, label: `Status: ${s.label}`, data: s.raw })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 max-w-[180px]">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0 shadow-sm" style={{ background: s.color }} />
                    <span className="text-[13px] text-text-secondary truncate font-medium">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold bg-bg-app text-text-primary px-1.5 py-0.5 rounded shadow-sm group-hover:shadow-md transition-shadow">{s.count} PO</span>
                    <span className="text-xs font-extrabold text-text-primary font-mono">{fmtShort(s.revenue)}</span>
                  </div>
                </div>
                <div className="h-[6px] bg-bg-app rounded-full overflow-hidden shadow-inner">
                  <div className="h-full transition-all duration-500" style={{ background: s.color, width: `${(s.revenue / maxStatRev) * 100}%` }} />
                </div>
              </div>
            ))}
            {byStatus.length === 0 && <div className="text-center py-10 text-text-muted text-xs">Tidak ada data untuk filter ini</div>}
          </div>
        </div>
      </div>

      {/* Drill-down Detail List (Floating/Pinned at bottom if active) */}
      {detailSource && (
        <div className="mb-6 bg-surface border border-brand/20 rounded-xl shadow-lg animate-in slide-in-from-bottom duration-300">
          <div className="p-3 border-b border-border-default flex justify-between items-center bg-brand/5 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-brand rounded-full"></div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Detail List: {detailSource.label} ({detailSource.data.length})</h3>
            </div>
            <button onClick={() => setDetailSource(null)} className="p-1 hover:bg-bg-app rounded-full">
               <Ico d={IC.close} size={14} color="var(--color-text-muted)" />
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface shadow-sm text-[10px] font-bold text-text-muted uppercase">
                <tr>
                  <th className="px-4 py-2 border-b">No. Order</th>
                  <th className="px-4 py-2 border-b">Perusahaan</th>
                  <th className="px-4 py-2 border-b">Tanggal</th>
                  <th className="px-4 py-2 border-b text-right">Total</th>
                  <th className="px-4 py-2 border-b text-center">Status</th>
                  <th className="px-4 py-2 border-b text-center w-[60px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {detailSource.data.map((p, idx) => {
                  // If kpi Margin, the data might be items, need to get PO
                  const po = p.orderNo ? p : pos.find(x => x.id === (p.poId || p.id));
                  if (!po) return null;
                  const totals = calcPOTotals(po, items);
                  return (
                    <tr key={po.id + idx} className="hover:bg-bg-app transition-colors border-b border-border-default/50">
                      <td className="px-4 py-2 font-bold text-text-primary">{po.orderNo}</td>
                      <td className="px-4 py-2 text-text-secondary truncate max-w-[150px]" title={po.company}>{po.company}</td>
                      <td className="px-4 py-2 text-text-muted font-mono">{po.orderDate}</td>
                      <td className="px-4 py-2 text-right font-bold text-text-primary">{fmtShort(totals.total)}</td>
                      <td className="px-4 py-2 text-center">
                        <div className="scale-75 origin-center inline-block">
                          <SBadge status={po.status} cfg={INIT_PO_STATUS} />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => onJump("po", po.id)} className="p-1.5 hover:bg-brand/10 rounded-lg group" title="Jump to PO">
                          <Ico d={IC.jump} size={12} color="var(--color-brand)" className="group-hover:scale-110" />
                        </button>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
