import { useMemo } from "react";
import { Ico, IC, SBadge } from "../components/ui";
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

/**
 * Dashboard — KPI cards, charts, overdue/urgent alerts.
 * Reads data from usePOStore — no props needed except onJump.
 */
export function Dashboard({ onJump }) {
  const { pos, items, dos, settings } = usePOStore();

  const overduePOs    = pos.filter((p) => isOverdue(p, settings.overdueDays));
  const urgentPOs     = pos.filter((p) => p.priority === "urgent" && !["paid", "cancelled"].includes(p.status));
  const incompletePOs = pos.filter((p) => isIncompletePO(p));
  const totalRev      = pos.reduce((s, p) => s + calcPOTotals(p, items).total, 0);
  const totalExPPN    = pos.reduce((s, p) => s + calcPOTotals(p, items).exPPN, 0);
  const totalMargin   = items.reduce((s, i) => { const m = itemMargin(i); return m !== null ? s + m : s; }, 0);
  const unpaidPOs     = pos.filter((p) => !["paid", "cancelled"].includes(p.status));
  const pendingItems  = items.filter((i) => ["pending", "ordered", "partial"].includes(i.status));

  const kpis = [
    { label: "PO Aktif",          val: unpaidPOs.length,    sub: `dari ${pos.length} total PO`,              icon: IC.po,    color: "var(--color-brand)",  bg: "var(--color-brand-soft)"  },
    { label: "Total Revenue",      val: fmtShort(totalRev),  sub: `Ex PPN: ${fmtShort(totalExPPN)}`,         icon: IC.stats, color: "var(--color-green)",  bg: "var(--color-green-soft)"  },
    { label: "Est. Margin",        val: fmtShort(totalMargin),sub:`${fmtPct(totalMargin, totalExPPN)} dari revenue`, icon: IC.trend, color: "var(--color-orange)", bg: "#fff7ed"          },
    { label: "Item Belum Selesai", val: pendingItems.length, sub: `dari ${items.length} item`,                icon: IC.box,   color: "var(--color-purple)", bg: "var(--color-purple-soft)" },
    { label: "Surat Jalan",        val: dos.length,          sub: `${[...new Set(dos.map((d) => d.poId))].length} PO ada DO`, icon: IC.truck, color: "var(--color-amber)", bg: "var(--color-amber-soft)" },
    ...(incompletePOs.length > 0
      ? [{ label: "PO Tidak Lengkap", val: incompletePOs.length, sub: "No. Order / Tanggal kosong", icon: IC.warn, color: "#c2410c", bg: "#fff7ed" }]
      : []),
  ];

  const byCo = useMemo(() => {
    const m = {};
    pos.forEach((p) => { const t = calcPOTotals(p, items).total; m[p.company] = (m[p.company] || 0) + t; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [pos, items]);

  const byStatus = useMemo(() =>
    Object.entries(INIT_PO_STATUS)
      .map(([k, v]) => ({ k, label: v.label, count: pos.filter((p) => p.status === k).length, color: v.color }))
      .filter((x) => x.count > 0),
    [pos]);

  const maxCo = byCo.length ? byCo[0][1] : 1;

  return (
    <div className="p-5 overflow-y-auto h-full w-full">
      {/* KPI Cards */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        {kpis.map((k) => (
          <div key={k.label} className={kpiCard} style={{ background: k.bg }}>
            <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center mb-2.5" style={{ background: `${k.color}18` }}>
              <Ico d={k.icon} size={16} color={k.color} />
            </div>
            <div className={kpiValue} style={{ color: k.color }}>{k.val}</div>
            <div className={kpiLabel}>{k.label}</div>
            <div className={kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <div className={chartBox}>
          <div className="text-sm font-bold text-text-primary mb-3">Revenue per Perusahaan</div>
          {byCo.map(([co, val]) => (
            <div key={co} className="mb-[9px]">
              <div className="flex justify-between items-center mb-[3px]">
                <span className="text-[13px] text-text-secondary truncate max-w-[240px]" title={co}>{co}</span>
                <span className="text-[13px] font-bold text-text-primary font-mono shrink-0 ml-2">{fmtShort(val)}</span>
              </div>
              <div className="h-[5px] bg-bg-app rounded-[3px] overflow-hidden">
                <div className="h-full bg-brand rounded-[3px]" style={{ width: `${(val / maxCo) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className={chartBox}>
          <div className="text-sm font-bold text-text-primary mb-3">Status PO</div>
          {byStatus.map((s) => (
            <div key={s.k} className="flex items-center gap-2 mb-2">
              <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[13px] text-text-secondary flex-1">{s.label}</span>
              <span className="text-[15px] font-bold text-text-primary w-6 text-right">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {(overduePOs.length > 0 || urgentPOs.length > 0 || incompletePOs.length > 0) && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {overduePOs.length > 0 && (
            <div className="bg-amber-soft border border-amber-mid rounded-[10px] p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Ico d={IC.warn} size={14} color="var(--color-amber)" />
                <span className="text-sm font-bold text-amber">Overdue ({overduePOs.length})</span>
              </div>
              {overduePOs.slice(0, 5).map((p) => (
                <div key={p.id} onClick={() => onJump("po", p.id)} className={`${alertRow} hover:bg-warning-soft`}>
                  <div>
                    <div className="text-[13px] font-semibold truncate max-w-[170px]">{p.orderNo}</div>
                    <div className="text-[11px] text-text-secondary truncate max-w-[170px]">{p.company}</div>
                  </div>
                  <span className="text-xs font-mono text-amber bg-warning-soft rounded px-1.5 py-px shrink-0">{diffDays(p.orderDate)}h</span>
                </div>
              ))}
            </div>
          )}

          {urgentPOs.length > 0 && (
            <div className="bg-red-soft border border-red-mid rounded-[10px] p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Ico d={IC.fire} size={14} color="var(--color-red)" />
                <span className="text-sm font-bold text-red">Urgent ({urgentPOs.length})</span>
              </div>
              {urgentPOs.slice(0, 5).map((p) => (
                <div key={p.id} onClick={() => onJump("po", p.id)} className={`${alertRow} hover:bg-danger-soft`}>
                  <div>
                    <div className="text-[13px] font-semibold truncate max-w-[170px]">{p.orderNo}</div>
                    <div className="text-[11px] text-text-secondary truncate max-w-[170px]">{p.company}</div>
                  </div>
                  <SBadge status={p.status} cfg={INIT_PO_STATUS} />
                </div>
              ))}
            </div>
          )}

          {incompletePOs.length > 0 && (
            <div className="bg-orange-soft border border-orange-mid rounded-[10px] p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Ico d={IC.warn} size={14} color="var(--color-orange-dark)" />
                <span className="text-sm font-bold text-orange-dark">PO Tidak Lengkap ({incompletePOs.length})</span>
              </div>
              <div className="text-xs mb-2 text-orange-dark/70">No. Order atau Tanggal belum diisi</div>
              {incompletePOs.slice(0, 5).map((p) => {
                const missing = [];
                if (!p.orderNo?.trim() || p.orderNo.trim() === "Order") missing.push("No. Order");
                if (!p.orderDate || p.orderDate === "dd/mm/yyyy") missing.push("Tanggal");
                if (!p.company?.trim()) missing.push("Perusahaan");
                return (
                  <div key={p.id} onClick={() => onJump("po", p.id)} className={`${alertRow} hover:bg-orange-mid`}>
                    <div>
                      <div className="text-[13px] font-semibold truncate max-w-[170px]">{p.orderNo || "(No. kosong)"}</div>
                      <div className="text-[11px] truncate max-w-[170px] text-orange-dark/70">{p.company || "(Perusahaan kosong)"}</div>
                    </div>
                    <span className="text-[11px] font-bold whitespace-nowrap text-orange-dark">{missing.join(", ")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
