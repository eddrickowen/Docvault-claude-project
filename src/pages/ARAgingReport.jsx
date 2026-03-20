import { useState, useMemo } from "react";
import { Ico, IC, FIn, FSel } from "../components/ui";
import { CopyTSVButton } from "../components/shared";
import { usePOStore } from "../store/usePOStore";
import { calcPOTotals, diffDays, fmt, fmtDate, agingColor, agingBg } from "../lib/helpers";

/* ── Class constants ── */
const thCls = "py-[9px] px-[10px] text-[9px] font-bold text-text-secondary text-left border-b-2 border-border-default uppercase tracking-[.04em] bg-surface-alt";
const tdCls = "py-[9px] px-[10px] border-b border-border-default text-xs align-middle";

const AGING_BUCKETS = [
  { key: "current", label: "Current (0-30 days)", min: 0, max: 30 },
  { key: "30-60", label: "30-60 days", min: 30, max: 60 },
  { key: "60-90", label: "60-90 days", min: 60, max: 90 },
  { key: "90+", label: "90+ days", min: 90, max: Infinity },
];

export function ARAgingReport({ onJump }) {
  const { pos, items } = usePOStore();
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("aging");
  const [sortDir, setSortDir] = useState("desc");
  const [filterBucket, setFilterBucket] = useState("all");

  // Pre-compute PO totals and aging
  const poData = useMemo(() => {
    return pos
      .filter((p) => !["paid", "cancelled"].includes(p.status)) // Only unpaid POs
      .map((p) => {
        const totals = calcPOTotals(p, items);
        const aging = diffDays(p.orderDate);
        const bucket = AGING_BUCKETS.find((b) => aging >= b.min && aging < b.max)?.key || "current";
        return { ...p, totals, aging, bucket };
      });
  }, [pos, items]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = poData;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.orderNo?.toLowerCase().includes(q) ||
          p.company?.toLowerCase().includes(q) ||
          p.quoteRef?.toLowerCase().includes(q)
      );
    }

    // Bucket filter
    if (filterBucket !== "all") {
      result = result.filter((p) => p.bucket === filterBucket);
    }

    // Sort
    result.sort((a, b) => {
      let av, bv;
      if (sortCol === "aging") {
        av = a.aging;
        bv = b.aging;
      } else if (sortCol === "total") {
        av = a.totals.total;
        bv = b.totals.total;
      } else if (sortCol === "company") {
        av = a.company || "";
        bv = b.company || "";
      } else if (sortCol === "orderNo") {
        av = a.orderNo || "";
        bv = b.orderNo || "";
      } else if (sortCol === "orderDate") {
        av = a.orderDate || "";
        bv = b.orderDate || "";
      } else {
        av = a[sortCol] || "";
        bv = b[sortCol] || "";
      }

      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof av === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    return result;
  }, [poData, search, filterBucket, sortCol, sortDir]);

  // Calculate totals by bucket
  const bucketTotals = useMemo(() => {
    const totals = {};
    AGING_BUCKETS.forEach((b) => {
      totals[b.key] = {
        count: 0,
        amount: 0,
      };
    });

    poData.forEach((p) => {
      if (totals[p.bucket]) {
        totals[p.bucket].count++;
        totals[p.bucket].amount += p.totals.total;
      }
    });

    return totals;
  }, [poData]);

  const totalOutstanding = poData.reduce((sum, p) => sum + p.totals.total, 0);

  const tSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const getCopyData = () => ({
    headers: ["No PO", "Company", "Order Date", "Aging (Days)", "Status", "Total", "Bucket"],
    rows: filtered.map((p) => [
      p.orderNo,
      p.company,
      fmtDate(p.orderDate),
      p.aging,
      p.status,
      p.totals.total,
      AGING_BUCKETS.find((b) => b.key === p.bucket)?.label || "",
    ]),
  });

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="py-4 px-5 border-b border-border-default bg-surface shrink-0">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Ico d={IC.stats} size={24} color="var(--color-brand)" />
          AR Aging Report
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Track outstanding invoices by aging period (based on Order Date)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3 p-4 border-b border-border-default bg-surface-alt shrink-0">
        <div className="bg-surface rounded-lg p-3 shadow-sm border border-border-default">
          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
            Total Outstanding
          </div>
          <div className="text-xl font-bold text-brand">{fmt(totalOutstanding)}</div>
          <div className="text-[10px] text-text-muted mt-0.5">{poData.length} POs</div>
        </div>

        {AGING_BUCKETS.map((bucket) => {
          const data = bucketTotals[bucket.key];
          const color = bucket.key === "current" ? "#059669" : bucket.key === "30-60" ? "#d97706" : "#dc2626";
          const bg = bucket.key === "current" ? "#f0fdf4" : bucket.key === "30-60" ? "#fffbeb" : "#fef2f2";
          return (
            <div
              key={bucket.key}
              className="bg-surface rounded-lg p-3 shadow-sm border border-border-default cursor-pointer hover:border-brand transition-colors"
              onClick={() => setFilterBucket(filterBucket === bucket.key ? "all" : bucket.key)}
              style={{ borderColor: filterBucket === bucket.key ? "var(--color-brand)" : "" }}
            >
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                {bucket.label}
              </div>
              <div className="text-lg font-bold" style={{ color }}>
                {fmt(data.amount)}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">
                {data.count} POs · {((data.amount / totalOutstanding) * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 py-3 px-4 border-b border-border-default flex-wrap items-center shrink-0 bg-surface">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <FIn
            value={search}
            onChange={setSearch}
            placeholder="Search PO, Company..."
            className="pl-7 pr-2 py-1"
          />
          <Ico
            d={IC.search}
            size={13}
            color="var(--color-text-muted)"
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>

        <FSel
          value={filterBucket}
          onChange={setFilterBucket}
          options={[
            { v: "all", l: "All Buckets" },
            ...AGING_BUCKETS.map((b) => ({ v: b.key, l: b.label })),
          ]}
          className="!py-1 w-[180px]"
        />

        <CopyTSVButton label="Copy TSV" getData={getCopyData} />
        <span className="text-[11px] text-text-muted ml-auto">
          {filtered.length} of {poData.length} POs
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 w-full">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead className="sticky top-0 bg-surface-alt z-10">
            <tr>
              <th
                className={`${thCls} cursor-pointer hover:text-brand select-none`}
                onClick={() => tSort("orderNo")}
              >
                No PO {sortCol === "orderNo" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className={`${thCls} cursor-pointer hover:text-brand select-none`}
                onClick={() => tSort("company")}
              >
                Company {sortCol === "company" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className={`${thCls} cursor-pointer hover:text-brand select-none`}
                onClick={() => tSort("orderDate")}
              >
                Order Date {sortCol === "orderDate" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className={`${thCls} text-right cursor-pointer hover:text-brand select-none`}
                onClick={() => tSort("aging")}
              >
                Aging (Days) {sortCol === "aging" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className={thCls}>Status</th>
              <th
                className={`${thCls} text-right cursor-pointer hover:text-brand select-none`}
                onClick={() => tSort("total")}
              >
                Total Outstanding {sortCol === "total" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className={thCls}>Aging Bucket</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-text-muted text-sm">
                  {search || filterBucket !== "all"
                    ? "No POs match your filters"
                    : "No outstanding POs found"}
                </td>
              </tr>
            )}
            {filtered.map((p, i) => {
              const rowBg = i % 2 === 0 ? "bg-white" : "bg-surface-alt";
              const agingColorVal = agingColor(p.aging);
              const agingBgVal = agingBg(p.aging);
              return (
                <tr
                  key={p.id}
                  className={`${rowBg} hover:bg-brand-soft cursor-pointer transition-colors`}
                  onClick={() => onJump?.("po", p.id)}
                >
                  <td className={`${tdCls} font-mono text-brand font-semibold truncate max-w-[180px]`}>
                    {p.orderNo}
                  </td>
                  <td className={`${tdCls} truncate max-w-[200px]`} title={p.company}>
                    {p.company}
                  </td>
                  <td className={`${tdCls} font-mono text-text-secondary`}>{fmtDate(p.orderDate)}</td>
                  <td
                    className={`${tdCls} text-right font-bold font-mono`}
                    style={{ color: agingColorVal, backgroundColor: agingBgVal }}
                  >
                    {p.aging}
                  </td>
                  <td className={tdCls}>
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide"
                      style={{
                        color: p.status === "invoiced" ? "#0e7490" : "#b45309",
                        backgroundColor: p.status === "invoiced" ? "#cffafe" : "#fef3c7",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className={`${tdCls} text-right font-mono font-bold text-brand`}>
                    {fmt(p.totals.total)}
                  </td>
                  <td className={tdCls}>
                    <span
                      className="text-[10px] font-semibold px-2 py-1 rounded"
                      style={{
                        color: agingColorVal,
                        backgroundColor: agingBgVal,
                      }}
                    >
                      {AGING_BUCKETS.find((b) => b.key === p.bucket)?.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-brand-soft shadow-sm">
            <tr>
              <td colSpan={5} className={`${tdCls} font-extrabold text-text-primary`}>
                TOTAL
              </td>
              <td className={`${tdCls} text-right font-mono font-extrabold text-brand`}>
                {fmt(filtered.reduce((s, p) => s + p.totals.total, 0))}
              </td>
              <td className={`${tdCls} font-semibold text-text-secondary`}>
                {filtered.length} POs
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
