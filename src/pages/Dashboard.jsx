import { useMemo, useState, useEffect, useRef } from "react";
import { Ico, IC, SBadge, Btn } from "../components/ui";
import { usePOStore } from "../store/usePOStore";
import {
  isOverdue, isIncompletePO, calcPOTotals, itemMargin,
  fmt, fmtPct, fmtDate, diffDays, getAgingBucketsConfig, getAgingBucket,
} from "../lib/helpers";
import { INIT_PO_STATUS } from "../lib/constants";

/* ─────────────────────────────────────────────
   Micro helpers
───────────────────────────────────────────── */
function useCountUp(target, duration = 550) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const diff = target - prev.current;
    if (!diff) return;
    const t0 = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(Math.round(prev.current + diff * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ── Monthly bar chart ── */
function SparkBar({ pos, selYear, selMonth, onMonthClick, large = false, xl = false }) {
  const shortLabels = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
  const miniLabels  = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const fullLabels  = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
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
  const BAR_MAX = xl ? 56 : large ? 48 : 20;
  const showLabels = large || xl;
  return (
    <div className={`flex gap-[4px] ${xl ? "h-[80px]" : large ? "h-[72px]" : "h-7"}`}>
      {data.map((c, i) => {
        const barPx = Math.max(4, Math.round((c / max) * BAR_MAX));
        const isSelected = selMonth === i;
        return (
          <button
            key={i}
            onClick={() => onMonthClick(i)}
            title={`${fullLabels[i]}: ${c} PO`}
            className={`flex flex-col items-center justify-end flex-1 min-w-0 rounded-md transition-all group
              ${isSelected ? "bg-brand/8" : "hover:bg-brand-soft/50"}
              ${showLabels ? "pb-[2px] pt-[3px] px-[1px]" : ""}
            `}
          >
            {showLabels && (
              <span className={`${xl ? "text-[10px]" : "text-[8px]"} font-bold leading-none mb-[3px] tabular-nums
                ${isSelected ? "text-brand" : c > 0 ? "text-text-secondary" : "text-transparent"}`}
              >
                {c > 0 ? c : "·"}
              </span>
            )}
            <div
              className={`w-full rounded-sm transition-all duration-200 ${isSelected ? "ring-2 ring-brand ring-offset-1" : ""}`}
              style={{
                height: barPx,
                background: isSelected
                  ? "var(--color-brand)"
                  : c > 0 ? "var(--color-brand-mid)" : "var(--color-border-default)",
              }}
            />
            {showLabels && (
              <span className={`${xl ? "text-[10px]" : "text-[8px]"} font-semibold leading-none mt-[4px] truncate w-full text-center
                ${isSelected ? "text-brand font-bold" : "text-text-muted"}`}
              >
                {xl ? shortLabels[i] : miniLabels[i]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon, iconColor, iconBg, label, value, sub, subColor, onClick, active, animated }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-4 border transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] ${
        active
          ? "border-brand/40 ring-2 ring-brand/20 bg-surface shadow-sm"
          : "border-border-default bg-surface hover:border-border-strong shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
          <Ico d={icon} size={15} color={iconColor} />
        </div>
        {active && (
          <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1 mr-0.5" />
        )}
      </div>
      <div className="text-[18px] font-black leading-none tracking-tight" style={{ color: iconColor }}>
        {animated !== undefined ? animated : value}
      </div>
      <div className="text-[11px] font-semibold text-text-secondary mt-1.5">{label}</div>
      {sub && (
        <div className="text-[10px] font-medium mt-0.5" style={{ color: subColor || "var(--color-text-muted)" }}>
          {sub}
        </div>
      )}
    </button>
  );
}

/* ── Section header ── */
const SectionHead = ({ icon, title, sub, right }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md bg-brand-soft flex items-center justify-center">
        <Ico d={icon} size={13} color="var(--color-brand)" />
      </div>
      <div>
        <div className="text-[13px] font-bold text-text-primary leading-tight">{title}</div>
        {sub && <div className="text-[10px] text-text-muted">{sub}</div>}
      </div>
    </div>
    {right}
  </div>
);

/* ── Aging badge ── */
const AgingBadge = ({ days, color }) => (
  <span
    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
    style={{ background: color + "18", color }}
  >
    {days}h
  </span>
);

/* ─────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────── */
export function Dashboard({ onJump }) {
  const { pos, items, dos, products } = usePOStore();

  const now        = new Date();
  const thisYear   = now.getFullYear();
  const thisMonth  = now.getMonth();

  const years     = useMemo(() => [...new Set(pos.map(p => new Date(p.orderDate).getFullYear()))].sort((a, b) => b - a), [pos]);
  const companies = useMemo(() => [...new Set(pos.map(p => p.company))].sort(), [pos]);

  const [selYear,    setSelYear]    = useState(() => {
    const cur = new Date().getFullYear();
    return pos.some(p => new Date(p.orderDate).getFullYear() === cur) ? cur : -1;
  });
  const [selMonth,   setSelMonth]   = useState(-1);
  const [selCompany, setSelCompany] = useState("all");
  const [drill,      setDrill]      = useState(null);   // { id, label, data }
  const [drillQ,     setDrillQ]     = useState("");

  /* ── Filtered data ── */
  const { fPos, fItems, fDos } = useMemo(() => {
    let fPos = pos;
    if (selYear    !== -1)    fPos = fPos.filter(p => new Date(p.orderDate).getFullYear() === selYear);
    if (selMonth   !== -1)    fPos = fPos.filter(p => new Date(p.orderDate).getMonth() === selMonth);
    if (selCompany !== "all") fPos = fPos.filter(p => p.company === selCompany);
    const ids   = new Set(fPos.map(p => p.id));
    return { fPos, fItems: items.filter(i => ids.has(i.poId)), fDos: dos.filter(d => ids.has(d.poId)) };
  }, [pos, items, dos, selYear, selMonth, selCompany]);

  const poTotalsMap = useMemo(() => {
    const map = new Map();
    fPos.forEach(p => map.set(p.id, calcPOTotals(p, items)));
    return map;
  }, [fPos, items]);

  /* ── Derived lists ── */
  const overduePOs      = useMemo(() => fPos.filter(p => isOverdue(p, fItems, 0)), [fPos, fItems]);
  const incompletePOs   = useMemo(() => fPos.filter(p => isIncompletePO(p)), [fPos]);
  const notDeliveredPOs = useMemo(() => fPos.filter(p => !["delivered","invoiced","paid","cancelled"].includes(p.status)), [fPos]);
  const notInvoicedPOs  = useMemo(() => fPos.filter(p => !["invoiced","paid","cancelled"].includes(p.status)), [fPos]);

  /* ── Totals ── */
  const { totalRev, totalExPPN } = useMemo(() => fPos.reduce((acc, p) => {
    const t = poTotalsMap.get(p.id) || { total: 0, exPPN: 0 };
    return { totalRev: acc.totalRev + t.total, totalExPPN: acc.totalExPPN + t.exPPN };
  }, { totalRev: 0, totalExPPN: 0 }), [fPos, poTotalsMap]);

  const totalMargin = useMemo(() =>
    fItems.reduce((s, i) => { const m = itemMargin(i); return m !== null ? s + m : s; }, 0),
  [fItems]);

  /* ── Aging ── */
  const agingBuckets = useMemo(() => {
    const buckets = getAgingBucketsConfig().map(b => ({ ...b, count: 0, items: [] }));
    fPos.forEach(p => {
      if (["paid","cancelled","received"].includes(p.status)) return;
      const b = getAgingBucket(diffDays(p.orderDate));
      if (b) {
        const found = buckets.find(x => x.label === b.label);
        if (found) { found.count++; found.items.push(p); }
      }
    });
    return buckets;
  }, [fPos]);

  /* ── Revenue by company ── */
  const byCompany = useMemo(() => {
    const m = {};
    fPos.forEach(p => {
      const t = poTotalsMap.get(p.id);
      if (t) m[p.company] = (m[p.company] || 0) + t.total;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [fPos, poTotalsMap]);

  /* ── Status breakdown ── */
  const byStatus = useMemo(() =>
    Object.entries(INIT_PO_STATUS).map(([k, v]) => {
      const rows = fPos.filter(p => p.status === k);
      const rev  = rows.reduce((s, p) => s + (poTotalsMap.get(p.id)?.total || 0), 0);
      return { k, label: v.label, count: rows.length, revenue: rev, color: v.color, raw: rows };
    }).filter(x => x.count > 0),
  [fPos, poTotalsMap]);

  /* ── Inventory alerts ── */
  const outOfStock = useMemo(() => products.filter(p => (p.stockLevel || 0) === 0), [products]);
  const lowStock   = useMemo(() => products.filter(p => (p.stockLevel || 0) > 0 && (p.stockLevel || 0) <= (p.safetyStock || 0)), [products]);

  /* ── Drill filtered ── */
  const drillFiltered = useMemo(() => {
    if (!drill) return [];
    const src = drill.data;
    if (!drillQ) return src;
    const q = drillQ.toLowerCase();
    return src.filter(p => {
      const po = p.orderNo ? p : pos.find(x => x.id === (p.poId || p.id));
      return po && (po.orderNo?.toLowerCase().includes(q) || po.company?.toLowerCase().includes(q));
    });
  }, [drill, drillQ, pos]);

  const drillRef = useRef(null);
  const openDrill = (id, label, data) => {
    setDrill({ id, label, data });
    setDrillQ("");
    setTimeout(() => drillRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };
  const closeDrill = () => setDrill(null);

  /* ── Count-up hooks ── */
  const aTotalPO  = useCountUp(fPos.length);
  const aNotDel   = useCountUp(notDeliveredPOs.length);
  const aNotInv   = useCountUp(notInvoicedPOs.length);
  const aDO       = useCountUp(fDos.length);
  const aPoUnique = new Set(fDos.map(d => d.poId)).size;

  /* ── Period flags ── */
  const isThisMonth = selYear === thisYear && selMonth === thisMonth;
  const isThisYear  = selYear === thisYear && selMonth === -1;
  const isAll       = selYear === -1 && selMonth === -1;

  const monthNames = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];

  const periodLabel = isThisMonth ? "Bulan Ini"
    : isThisYear ? "Tahun Ini"
    : isAll ? "Semua Data"
    : selMonth !== -1 && selYear !== -1 ? `${monthNames[selMonth]} ${selYear}`
    : selYear !== -1 ? `Tahun ${selYear}` : "Semua Data";

  /* ── Drill panel renderer ── */
  const DrillPanel = ({ fill = false }) => {
    if (!drill) return null;
    const isMargin  = drill.id === "margin";
    const isSJ      = drill.id === "sj";
    const isAging   = drill.id?.startsWith("aging-");
    const isRevenue = drill.id === "revenue";
    const isAllPO   = drill.id === "all-po";
    const isCo      = drill.id?.startsWith("co-");

    const footerTotal = isMargin
      ? drillFiltered.reduce((s, i) => { const m = itemMargin(i); return m !== null ? s + m : s; }, 0)
      : isSJ
      ? null
      : drillFiltered.reduce((s, p) => {
          const po = p.orderNo ? p : pos.find(x => x.id === (p.poId || p.id));
          return s + (po ? (poTotalsMap.get(po.id)?.total || 0) : 0);
        }, 0);
    const footerExPPN = isRevenue
      ? drillFiltered.reduce((s, p) => s + (poTotalsMap.get(p.id)?.exPPN || 0), 0)
      : null;

    /* ── Footer bar — rendered outside scroll in fill mode so it always stays at bottom ── */
    const countLabel = isSJ ? `${drillFiltered.length} Surat Jalan` : isMargin ? `${drillFiltered.length} item` : `${drillFiltered.length} PO`;
    const FooterBar = () => (
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-surface-alt border-t-2 border-border-default">
        <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wide">{countLabel}</span>
        <div className="flex items-center gap-4">
          {isRevenue && footerExPPN !== null && (
            <span className="text-[10px] font-mono text-text-muted">Ex PPN: {fmt(footerExPPN)}</span>
          )}
          {!isSJ && footerTotal !== null && (
            <span className="text-[12px] font-mono font-extrabold" style={{ color: isMargin ? "var(--color-green)" : "var(--color-text-primary)" }}>
              {fmt(footerTotal)}
            </span>
          )}
        </div>
      </div>
    );

    return (
      <div className={fill ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "bg-surface border border-brand/25 rounded-xl shadow-sm overflow-hidden"}>

        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-brand/5 border-b border-border-default">
          <div className="w-1 h-4 bg-brand rounded-full" />
          <span className="text-[12px] font-bold text-text-primary flex-1">{drill.label}</span>
          <div className="relative max-w-[220px] w-full">
            <Ico d={IC.search} size={11} color="var(--color-text-muted)" className="absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={drillQ} onChange={e => setDrillQ(e.target.value)}
              placeholder="Cari..."
              className="w-full bg-white border border-border-default rounded-lg pl-7 pr-3 py-1 text-[11px] outline-none focus:border-brand"
            />
          </div>
          <span className="text-[10px] font-bold text-text-muted bg-bg-app border border-border-default px-2 py-0.5 rounded shrink-0">
            {drillFiltered.length}
          </span>
          <button onClick={closeDrill} className="p-1 rounded hover:bg-surface-alt">
            <Ico d={IC.close} size={13} color="var(--color-text-muted)" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className={fill ? "flex-1 min-h-0 overflow-y-auto custom-scroll" : "max-h-[240px] overflow-y-auto custom-scroll"}>
          {drillFiltered.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-text-muted">Tidak ada data</div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10 bg-surface border-b border-border-default">
                <tr>
                  {isMargin ? (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase">Deskripsi</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Harga Jual</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">HPP</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase">Margin</th>
                    </>
                  ) : isSJ ? (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase">No. DO</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">PO Terkait</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase">Tgl Kirim</th>
                    </>
                  ) : isAging ? (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase">No. Order</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Perusahaan</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase">Umur</th>
                    </>
                  ) : isRevenue ? (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase">No. Order</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Perusahaan</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden md:table-cell">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase">Total</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Ex PPN</th>
                    </>
                  ) : isAllPO ? (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase">No. Order</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Perusahaan</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Tgl Order</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden md:table-cell">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase">Total</th>
                    </>
                  ) : isCo ? (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase">No. Order</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Tgl Order</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase">Total</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase">No. Order</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Perusahaan</th>
                      <th className="px-3 py-2 text-left font-semibold text-text-muted text-[10px] uppercase hidden sm:table-cell">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-text-muted text-[10px] uppercase">Total</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {drillFiltered.map(p => {
                  if (isMargin) {
                    const m = itemMargin(p);
                    return (
                      <tr key={p.id} className="border-b border-border-default/40 hover:bg-brand-soft/20 transition-colors">
                        <td className="px-3 py-1.5 text-text-primary truncate max-w-[180px]">{p.description || "—"}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-text-secondary">{p.qty ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right font-mono hidden sm:table-cell">{fmt(Number(p.unitPrice) * (Number(p.qty) || 1) - (Number(p.discount) || 0))}</td>
                        <td className="px-3 py-1.5 text-right font-mono hidden sm:table-cell text-text-muted">{itemMargin(p) !== null ? fmt((p.buyUnitPrice || 0) * (Number(p.qty) || 1)) : "—"}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold" style={{ color: m !== null && m >= 0 ? "var(--color-green)" : "var(--color-red)" }}>{m !== null ? fmt(m) : "—"}</td>
                      </tr>
                    );
                  }
                  if (isSJ) {
                    const linkedPO = pos.find(x => x.id === p.poId);
                    return (
                      <tr key={p.id} onClick={() => linkedPO && onJump("po", linkedPO.id)} className="border-b border-border-default/40 hover:bg-brand-soft/20 cursor-pointer transition-colors">
                        <td className="px-3 py-1.5 font-mono font-bold text-brand">{p.doNo || "—"}</td>
                        <td className="px-3 py-1.5 font-mono text-text-secondary hidden sm:table-cell">{linkedPO?.orderNo || "—"}</td>
                        <td className="px-3 py-1.5 text-text-muted">{p.deliveryDate ? fmtDate(p.deliveryDate) : "—"}</td>
                      </tr>
                    );
                  }
                  const po = p.orderNo ? p : pos.find(x => x.id === (p.poId || p.id));
                  if (!po) return null;
                  const poTotal = poTotalsMap.get(po.id);
                  return (
                    <tr key={po.id} onClick={() => onJump("po", po.id)} className="border-b border-border-default/40 hover:bg-brand-soft/20 cursor-pointer transition-colors">
                      <td className="px-3 py-1.5 font-mono font-bold text-brand">{po.orderNo}</td>
                      {isAging ? (
                        <>
                          <td className="px-3 py-1.5 text-text-secondary truncate max-w-[160px] hidden sm:table-cell">{po.company}</td>
                          <td className="px-3 py-1.5 hidden sm:table-cell"><SBadge status={po.status} cfg={INIT_PO_STATUS} /></td>
                          <td className="px-3 py-1.5 text-right">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "#ef444418", color: "#ef4444" }}>
                              {diffDays(po.orderDate)}h
                            </span>
                          </td>
                        </>
                      ) : isRevenue ? (
                        <>
                          <td className="px-3 py-1.5 text-text-secondary truncate max-w-[140px] hidden sm:table-cell">{po.company}</td>
                          <td className="px-3 py-1.5 hidden md:table-cell"><SBadge status={po.status} cfg={INIT_PO_STATUS} /></td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold">{fmt(poTotal?.total || 0)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-text-muted hidden sm:table-cell">{fmt(poTotal?.exPPN || 0)}</td>
                        </>
                      ) : isAllPO ? (
                        <>
                          <td className="px-3 py-1.5 text-text-secondary truncate max-w-[140px] hidden sm:table-cell">{po.company}</td>
                          <td className="px-3 py-1.5 text-text-muted hidden sm:table-cell">{fmtDate(po.orderDate)}</td>
                          <td className="px-3 py-1.5 hidden md:table-cell"><SBadge status={po.status} cfg={INIT_PO_STATUS} /></td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold">{fmt(poTotal?.total || 0)}</td>
                        </>
                      ) : isCo ? (
                        <>
                          <td className="px-3 py-1.5 text-text-muted hidden sm:table-cell">{fmtDate(po.orderDate)}</td>
                          <td className="px-3 py-1.5 hidden sm:table-cell"><SBadge status={po.status} cfg={INIT_PO_STATUS} /></td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold">{fmt(poTotal?.total || 0)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-1.5 text-text-secondary truncate max-w-[160px] hidden sm:table-cell">{po.company}</td>
                          <td className="px-3 py-1.5 hidden sm:table-cell"><SBadge status={po.status} cfg={INIT_PO_STATUS} /></td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold">{fmt(poTotal?.total || 0)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* tfoot only for non-fill (standalone) mode */}
              {!fill && (
                <tfoot className="sticky bottom-0 z-10 bg-surface-alt border-t-2 border-border-default">
                  <tr>
                    <td className="px-3 py-2 text-[10px] font-extrabold text-text-muted uppercase tracking-wide">{countLabel}</td>
                    {isMargin && <><td /><td className="hidden sm:table-cell" /><td className="hidden sm:table-cell" /></>}
                    {isSJ    && <><td /><td /></>}
                    {isRevenue && <><td className="hidden sm:table-cell" /><td className="hidden md:table-cell" /><td className="px-3 py-2 text-right font-mono font-extrabold text-[11px] text-text-primary">{fmt(footerTotal)}</td><td className="px-3 py-2 text-right font-mono text-[10px] text-text-muted hidden sm:table-cell">{fmt(footerExPPN)}</td></>}
                    {(isAllPO || isCo) && <><td className="hidden sm:table-cell" />{isAllPO && <><td className="hidden sm:table-cell" /><td className="hidden md:table-cell" /></>}<td className="px-3 py-2 text-right font-mono font-extrabold text-[11px] text-text-primary">{fmt(footerTotal)}</td></>}
                    {!isMargin && !isSJ && !isRevenue && !isAllPO && !isCo && <><td className="hidden sm:table-cell" /><td className="hidden sm:table-cell" /><td className="px-3 py-2 text-right font-mono font-extrabold text-[11px] text-text-primary">{fmt(footerTotal)}</td></>}
                    {isMargin && <td className="px-3 py-2 text-right font-mono font-extrabold text-[11px]" style={{ color: "var(--color-green)" }}>{fmt(footerTotal)}</td>}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Footer bar — always pinned at bottom in fill mode */}
        {fill && <FooterBar />}
      </div>
    );
  };

  /* ─────── RENDER ─────── */
  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-app">

      {/* ═══════════════════════════════════════
          STICKY HEADER — title + filters + alerts
      ═══════════════════════════════════════ */}
      <div className="shrink-0 bg-surface border-b border-border-default px-5 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Left: Title + period */}
          <div className="shrink-0">
            <div className="text-[15px] font-black text-text-primary tracking-tight leading-none">Dashboard</div>
            <div className="text-[11px] text-text-muted mt-0.5 font-medium">
              {fmtDate(now)} · <span className="text-brand font-bold">{fPos.length} PO</span>
              {selCompany !== "all" && <span className="ml-1">· {selCompany}</span>}
            </div>
          </div>

          {/* Center: Filter selects */}
          <div className="flex items-center gap-2 flex-wrap flex-1 justify-center">
            <select
              value={selMonth}
              onChange={e => setSelMonth(Number(e.target.value))}
              className="bg-surface border border-border-default text-text-primary text-[11px] font-semibold rounded-lg px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value={-1}>Semua Bulan</option>
              {["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>

            <select
              value={selYear}
              onChange={e => setSelYear(Number(e.target.value))}
              className="bg-surface border border-border-default text-text-primary text-[11px] font-semibold rounded-lg px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value={-1}>Semua Tahun</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              value={selCompany}
              onChange={e => setSelCompany(e.target.value)}
              className="bg-surface border border-border-default text-text-primary text-[11px] font-semibold rounded-lg px-2 py-1.5 outline-none cursor-pointer max-w-[200px]"
            >
              <option value="all">Semua Perusahaan</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {(selYear !== -1 || selMonth !== -1 || selCompany !== "all") && (
              <button
                onClick={() => { setSelYear(-1); setSelMonth(-1); setSelCompany("all"); closeDrill(); }}
                className="text-[11px] font-bold text-text-muted hover:text-text-primary border border-border-default rounded-lg px-2 py-1.5 hover:bg-surface-alt transition-all"
              >
                Reset
              </button>
            )}
          </div>

          {/* Right: Alert badges */}
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            {overduePOs.length > 0 && (
              <button
                onClick={() => onJump("po")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-soft border border-red-mid text-red text-[11px] font-bold hover:bg-red hover:text-white transition-all"
              >
                <Ico d={IC.warn} size={10} />
                {overduePOs.length} Overdue
              </button>
            )}
            {incompletePOs.length > 0 && (
              <button
                onClick={() => onJump("po")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"
              >
                <Ico d={IC.warn} size={10} />
                {incompletePOs.length} Belum Lengkap
              </button>
            )}
            {(outOfStock.length > 0 || lowStock.length > 0) && (
              <button
                onClick={() => onJump("products")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
              >
                <Ico d={IC.box} size={10} />
                {outOfStock.length + lowStock.length} Stok Kritis
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════
          BODY — scrollable
      ═══════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        <div className="p-5 pb-24 space-y-4 max-w-[1440px] mx-auto">

          {/* ── 1. BAR CHART ── */}
          <div className="bg-surface border border-border-default rounded-xl shadow-sm p-4">
            <SectionHead
              icon={IC.stats}
              title="PO per Bulan"
              sub={`${selYear !== -1 ? selYear : "Semua Tahun"} · klik bar untuk filter bulan`}
              right={
                selMonth !== -1 && (
                  <span className="text-[10px] font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-lg">
                    {monthNames[selMonth]} dipilih
                  </span>
                )
              }
            />
            <SparkBar
              pos={pos}
              selYear={selYear}
              selMonth={selMonth}
              xl
              onMonthClick={i => {
                setSelMonth(selMonth === i ? -1 : i);
                if (selYear === -1) setSelYear(thisYear);
              }}
            />
          </div>

          {/* ── 2. KPI CARDS ── */}
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[130px] max-w-[180px] flex-1">
              <StatCard
                icon={IC.po}    iconColor="var(--color-brand)"       iconBg="var(--color-brand-soft)"
                label="Total PO" animated={aTotalPO}
                sub={periodLabel}
                onClick={() => openDrill("all-po", "Semua PO", fPos)}
                active={drill?.id === "all-po"}
              />
            </div>
            <div className="min-w-[160px] max-w-[260px] flex-1">
              <StatCard
                icon={IC.trend}  iconColor="var(--color-green)"       iconBg="var(--color-green-soft)"
                label="Revenue"  value={fmt(totalRev)}
                sub={`Ex PPN: ${fmt(totalExPPN)}`}
                onClick={() => openDrill("revenue", "Revenue", fPos)}
                active={drill?.id === "revenue"}
              />
            </div>
            <div className="min-w-[130px] max-w-[180px] flex-1">
              <StatCard
                icon={IC.clock}  iconColor="var(--color-orange)"      iconBg="var(--color-orange-soft)"
                label="Belum Kirim" animated={aNotDel}
                sub="Belum delivered"
                onClick={() => openDrill("not-del", "Belum Kirim", notDeliveredPOs)}
                active={drill?.id === "not-del"}
              />
            </div>
            <div className="min-w-[130px] max-w-[180px] flex-1">
              <StatCard
                icon={IC.stats}  iconColor="var(--color-purple)"      iconBg="var(--color-purple-soft)"
                label="Belum Tagih" animated={aNotInv}
                sub="Belum invoiced"
                onClick={() => openDrill("not-inv", "Belum Tagih", notInvoicedPOs)}
                active={drill?.id === "not-inv"}
              />
            </div>
            <div className="min-w-[160px] max-w-[260px] flex-1">
              <StatCard
                icon={IC.percent} iconColor="var(--color-amber)"      iconBg="var(--color-amber-soft)"
                label="Est. Margin" value={fmt(totalMargin)}
                sub={fmtPct(totalMargin, totalExPPN) + " dari revenue"}
                onClick={() => openDrill("margin", "Est. Margin", fItems)}
                active={drill?.id === "margin"}
              />
            </div>
          </div>

          {/* ── 3. REVENUE + STATUS BREAKDOWN ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Revenue per company — 2 cols */}
            <div className="lg:col-span-2 bg-surface border border-border-default rounded-xl shadow-sm p-4">
              <SectionHead
                icon={IC.trend}
                title="Revenue per Perusahaan"
                sub={`Total ${fmt(totalRev)}`}
                right={<span className="text-[11px] text-text-muted font-mono">{byCompany.length} perusahaan</span>}
              />
              {byCompany.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-text-muted">Tidak ada data untuk periode ini</div>
              ) : (
                <div className="space-y-2.5">
                  {byCompany.map(([co, val], idx) => {
                    const pct = totalRev > 0 ? (val / totalRev) * 100 : 0;
                    return (
                      <div key={co} onClick={() => openDrill(`co-${co}`, co, fPos.filter(p => p.company === co))} className="group cursor-pointer">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-text-muted w-4 shrink-0">#{idx + 1}</span>
                            <span className="text-[12px] font-semibold text-text-primary truncate group-hover:text-brand transition-colors">{co}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] text-text-muted font-medium">{pct.toFixed(1)}%</span>
                            <span className="text-[12px] font-bold font-mono">{fmt(val)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-bg-app rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 group-hover:brightness-110"
                            style={{ width: `${pct}%`, background: `hsl(${220 - idx * 18}, 75%, 55%)` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status Breakdown — 1 col */}
            <div className="bg-surface border border-border-default rounded-xl shadow-sm p-4">
              <SectionHead
                icon={IC.stats}
                title="Status Breakdown"
                sub={`${fPos.length} PO · ${byStatus.length} status`}
              />
              {byStatus.length === 0 ? (
                <div className="py-6 text-center text-[12px] text-text-muted">Tidak ada data</div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {byStatus.map(s => {
                    const pct = fPos.length > 0 ? ((s.count / fPos.length) * 100).toFixed(0) : 0;
                    return (
                      <button
                        key={s.k}
                        onClick={() => openDrill(`st-${s.k}`, s.label, s.raw)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all hover:shadow-sm ${
                          drill?.id === `st-${s.k}` ? "border-brand/40 ring-1 ring-brand/20" : "border-border-default hover:border-border-strong"
                        }`}
                        style={drill?.id === `st-${s.k}` ? { background: s.color + "10" } : {}}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-text-primary leading-tight truncate">{s.label}</div>
                            <div className="text-[9px] text-text-muted truncate">{fmt(s.revenue)}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-1">
                          <div className="text-[15px] font-black leading-none" style={{ color: s.color }}>{s.count}</div>
                          <div className="text-[9px] text-text-muted font-medium">{pct}%</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 4. ACTION REQUIRED + AGING PO + DETAIL — single container ── */}
          <div className="bg-surface border border-border-default rounded-xl shadow-sm overflow-hidden">

            {/* Container header */}
            <div className="px-4 py-2.5 border-b border-border-default bg-bg-app/40 flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-brand-soft flex items-center justify-center shrink-0">
                <Ico d={IC.warn} size={11} color="var(--color-brand)" />
              </div>
              <span className="text-[12px] font-bold text-text-primary">Monitoring PO</span>
              <span className="text-[10px] text-text-muted ml-1">· tindakan, aging, dan detail</span>
            </div>

            {/* Inner layout: left panels | right detail */}
            <div className="relative">

              {/* Left: in-flow — sole height anchor for the container */}
              <div className="w-[280px] flex flex-col border-r border-border-default">

                {/* Action Required */}
                <div className="border-b border-border-default">
                  <div className="px-3 py-2 bg-bg-app/50 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-text-primary uppercase tracking-wider">Action Required</span>
                    {(overduePOs.length > 0 || incompletePOs.length > 0) && (
                      <span className="text-[9px] font-bold bg-red text-white rounded-full px-1.5 py-0.5">
                        {overduePOs.length + incompletePOs.length}
                      </span>
                    )}
                  </div>
                  {overduePOs.length === 0 && incompletePOs.length === 0 ? (
                    <div className="py-4 flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-1">
                        <Ico d={IC.check} size={13} color="#22c55e" />
                      </div>
                      <div className="text-[10px] font-bold text-green-600">Semua PO OK</div>
                    </div>
                  ) : (
                    <div className="divide-y divide-border-default/40">
                      {overduePOs.length > 0 && (
                        <div>
                          <div className="px-3 py-1 bg-red-soft/30 flex items-center justify-between">
                            <span className="text-[8px] font-extrabold text-red uppercase tracking-wider flex items-center gap-1">
                              <Ico d={IC.warn} size={7} color="var(--color-red)" /> Overdue
                            </span>
                            <span className="text-[8px] font-bold bg-red text-white rounded-full px-1 py-0.5">{overduePOs.length}</span>
                          </div>
                          <div className="max-h-[110px] overflow-y-auto custom-scroll">
                            {overduePOs.slice(0, 5).map(p => (
                              <div key={p.id} onClick={() => onJump("po", p.id)}
                                className="px-3 py-1.5 hover:bg-red-soft/20 cursor-pointer flex items-center justify-between gap-2 border-b border-border-default/30 last:border-0 transition-colors">
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold font-mono text-red truncate">{p.orderNo}</div>
                                  <div className="text-[8px] text-text-muted truncate">{p.company}</div>
                                </div>
                                <AgingBadge days={diffDays(p.orderDate)} color="#ef4444" />
                              </div>
                            ))}
                            {overduePOs.length > 5 && (
                              <button onClick={() => onJump("po")} className="w-full py-1 text-[9px] font-bold text-red hover:bg-red-soft/20 transition-colors">
                                +{overduePOs.length - 5} lainnya →
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {incompletePOs.length > 0 && (
                        <div>
                          <div className="px-3 py-1 bg-amber-50 flex items-center justify-between">
                            <span className="text-[8px] font-extrabold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                              <Ico d={IC.warn} size={7} color="#b45309" /> Belum Lengkap
                            </span>
                            <span className="text-[8px] font-bold bg-amber-500 text-white rounded-full px-1 py-0.5">{incompletePOs.length}</span>
                          </div>
                          <div className="max-h-[90px] overflow-y-auto custom-scroll">
                            {incompletePOs.slice(0, 4).map(p => (
                              <div key={p.id} onClick={() => onJump("po", p.id)}
                                className="px-3 py-1.5 hover:bg-amber-50/60 cursor-pointer flex items-center justify-between gap-2 border-b border-border-default/30 last:border-0 transition-colors">
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold font-mono text-amber-700 truncate">{p.orderNo || "(No PO)"}</div>
                                  <div className="text-[8px] text-text-muted truncate">{p.company || "No company"}</div>
                                </div>
                                <span className="text-[7px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded shrink-0">Isi Data</span>
                              </div>
                            ))}
                            {incompletePOs.length > 4 && (
                              <button onClick={() => onJump("po")} className="w-full py-1 text-[9px] font-bold text-amber-700 hover:bg-amber-50 transition-colors">
                                +{incompletePOs.length - 4} lainnya →
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Aging PO Aktif */}
                <div className="flex-1 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-4 h-4 rounded bg-brand-soft flex items-center justify-center">
                      <Ico d={IC.clock} size={10} color="var(--color-brand)" />
                    </div>
                    <span className="text-[10px] font-bold text-text-primary">Aging PO Aktif</span>
                  </div>
                  <div className="space-y-1">
                    {agingBuckets.map(b => {
                      const total = agingBuckets.reduce((s, x) => s + x.count, 0) || 1;
                      const pct = (b.count / total) * 100;
                      const isActive = drill?.id === `aging-${b.label}`;
                      return (
                        <button
                          key={b.label}
                          onClick={() => openDrill(`aging-${b.label}`, b.label, b.items)}
                          disabled={b.count === 0}
                          className={`w-full text-left px-2 py-1.5 rounded-lg border transition-all ${
                            b.count === 0
                              ? "opacity-40 cursor-default border-transparent"
                              : isActive
                              ? "border-brand/30 ring-1 ring-brand/20 bg-brand-soft/30 cursor-pointer"
                              : "border-border-default hover:border-border-strong hover:bg-bg-app cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-bold" style={{ color: b.color }}>{b.label}</span>
                            <span className="text-[9px] font-extrabold px-1 py-0.5 rounded leading-none" style={{ background: b.color + "18", color: b.color }}>
                              {b.count}
                            </span>
                          </div>
                          <div className="h-1 bg-bg-app rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: b.color }} />
                          </div>
                        </button>
                      );
                    })}
                    {agingBuckets.every(b => b.count === 0) && (
                      <div className="py-2 text-center text-[10px] text-text-muted">Tidak ada PO aktif</div>
                    )}
                  </div>
                  <button
                    onClick={() => onJump("po")}
                    className="mt-2 w-full py-1 text-[9px] font-bold text-brand border border-brand/20 bg-brand-soft hover:bg-brand hover:text-white rounded-lg transition-all"
                  >
                    Buka PO List <Ico d={IC.chevR} size={9} color="currentColor" />
                  </button>
                </div>

              </div>

              {/* Right: Detail drill-down */}
              <div ref={drillRef} className="absolute inset-0 left-[280px] flex flex-col overflow-hidden border-l border-border-default">
                {drill ? (
                  <DrillPanel fill />
                ) : (
                  <div className="h-full flex flex-col">
                    {/* Skeleton header */}
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-app/60 border-b border-border-default">
                      <div className="w-1 h-4 bg-border-strong rounded-full animate-pulse" />
                      <div className="h-3 w-32 bg-border-strong rounded animate-pulse" />
                      <div className="flex-1" />
                      <div className="h-6 w-24 bg-border-default rounded-lg animate-pulse" />
                      <div className="h-5 w-7 bg-border-default rounded animate-pulse" />
                      <div className="h-5 w-5 bg-border-default rounded animate-pulse" />
                    </div>
                    {/* Skeleton rows */}
                    <div className="flex-1 p-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-2 py-2.5 border-b border-border-default/40 last:border-0">
                          <div className="h-3 rounded animate-pulse" style={{ width: `${52 + (i % 3) * 16}px`, background: "var(--color-border-strong)", opacity: 0.5 + i * 0.06 }} />
                          <div className="h-3 rounded animate-pulse flex-1" style={{ background: "var(--color-border-default)", opacity: 0.3 + i * 0.04 }} />
                          <div className="h-3 w-16 rounded animate-pulse" style={{ background: "var(--color-border-default)", opacity: 0.25 }} />
                          <div className="h-3 w-20 rounded animate-pulse" style={{ background: "var(--color-border-strong)", opacity: 0.3 }} />
                        </div>
                      ))}
                    </div>
                    {/* Hint */}
                    <div className="px-4 py-2 border-t border-border-default/60 bg-bg-app/40 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-border-strong animate-pulse" />
                      <span className="text-[10px] text-text-muted font-medium">Klik kartu, status, atau aging bucket untuk melihat detail PO</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── 6. SURAT JALAN ── */}
          <div className="bg-surface border border-border-default rounded-xl shadow-sm p-4">
            <SectionHead
              icon={IC.truck}
              title="Surat Jalan"
              sub={`${fDos.length} DO tercatat`}
              right={
                fDos.length > 0 && (
                  <button
                    onClick={() => openDrill("sj", "Surat Jalan", fDos)}
                    className={`text-[11px] font-bold px-3 py-1 rounded-lg border transition-all ${
                      drill?.id === "sj"
                        ? "border-brand/40 bg-brand text-white"
                        : "border-border-default text-text-secondary hover:bg-bg-app"
                    }`}
                  >
                    Detail DO
                  </button>
                )
              }
            />
            <div className="flex gap-4">
              <div className="flex-1 text-center p-4 rounded-xl bg-bg-app border border-border-default">
                <div className="text-[28px] font-black text-text-primary leading-none">{aDO}</div>
                <div className="text-[11px] text-text-muted font-semibold mt-1.5">Total DO</div>
              </div>
              <div className="flex-1 text-center p-4 rounded-xl bg-bg-app border border-border-default">
                <div className="text-[28px] font-black text-brand leading-none">{aPoUnique}</div>
                <div className="text-[11px] text-text-muted font-semibold mt-1.5">PO Terkait</div>
              </div>
              <div className="flex-1 text-center p-4 rounded-xl bg-bg-app border border-border-default">
                <div className="text-[28px] font-black text-text-secondary leading-none">
                  {fDos.length > 0 ? (fDos.length / Math.max(aPoUnique, 1)).toFixed(1) : "—"}
                </div>
                <div className="text-[11px] text-text-muted font-semibold mt-1.5">DO / PO</div>
              </div>
            </div>
          </div>

          {/* ── 7. INVENTORY ALERT (conditional) ── */}
          {(outOfStock.length > 0 || lowStock.length > 0) && (
            <div className="bg-surface border border-amber-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-100 rounded-md flex items-center justify-center">
                    <Ico d={IC.warn} size={13} color="#d97706" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-amber-800">Inventory Alert</div>
                    <div className="text-[10px] text-amber-600">
                      {outOfStock.length > 0 && `${outOfStock.length} item habis`}
                      {outOfStock.length > 0 && lowStock.length > 0 && " · "}
                      {lowStock.length > 0 && `${lowStock.length} item hampir habis`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onJump("products")}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline"
                >
                  Kelola Stok <Ico d={IC.chevR} size={11} color="currentColor" />
                </button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {[...outOfStock, ...lowStock].slice(0, 8).map(p => {
                    const isOut = (p.stockLevel || 0) === 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => onJump("products")}
                        className={`rounded-lg border p-2.5 cursor-pointer hover:shadow-sm transition-all text-center ${
                          isOut ? "bg-red-50 border-red-200 hover:border-red" : "bg-amber-50 border-amber-200 hover:border-amber-400"
                        }`}
                      >
                        <div className="font-mono text-[9px] text-text-muted font-bold truncate">{p.sku}</div>
                        <div className="text-[11px] font-semibold truncate mt-0.5" title={p.name}>{p.name}</div>
                        <div className={`text-[18px] font-black mt-1 leading-none ${isOut ? "text-red" : "text-amber-600"}`}>
                          {p.stockLevel ?? 0}
                        </div>
                        <div className={`text-[8px] font-bold uppercase mt-0.5 ${isOut ? "text-red" : "text-amber-600"}`}>
                          {isOut ? "⛔ Habis" : "⚠ Low"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
