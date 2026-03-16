import { useState, useMemo } from "react";
import { Ico, IC, FIn } from "../components/ui";
import { CopyTSVButton } from "../components/shared";
import { usePOStore } from "../store/usePOStore";
import { itemNet, itemBuy, itemMargin, fmt } from "../lib/helpers";

/* ── Class constants ── */
const thCls    = "py-[9px] px-[10px] text-[9px] font-bold text-text-secondary text-left border-b-2 border-border-default uppercase tracking-[.04em] bg-surface-alt";
const tdCls    = "py-[9px] px-[10px] border-b border-border-default text-xs align-middle";
const tabBtn   = (active) => `py-[5px] px-3.5 rounded-[5px] border-none text-[11px] font-semibold cursor-pointer ${active ? "bg-surface text-text-primary shadow-sm" : "bg-transparent text-text-muted"}`;

const GROUP_OPTS = [
  { v: "po",      l: "Per PO"          },
  { v: "company", l: "Per Perusahaan"  },
  { v: "supplier",l: "Per Supplier"    },
  { v: "year",    l: "Per Tahun"       },
  { v: "month",   l: "Per Bulan"       },
];

export function MarginAnalysis() {
  const { items, pos, suppliers } = usePOStore();
  const [groupBy, setGroupBy] = useState("po");
  const [search,  setSearch]  = useState("");
  const [sortCol, setSortCol] = useState("net");
  const [sortDir, setSortDir] = useState("desc");

  const groups = useMemo(() => {
    const m = {};
    items.forEach((i) => {
      const po = pos.find((p) => p.id === i.poId);
      let key = "";
      if      (groupBy === "po")       key = po?.orderNo || i.poId;
      else if (groupBy === "company")  key = po?.company || "–";
      else if (groupBy === "supplier") {
        const main = (i.supplierAssignments || []).find((a) => a.role === "main");
        key = suppliers.find((s) => s.id === main?.supplierId)?.name || "Tanpa Supplier";
      } else if (groupBy === "year")   key = po?.orderDate?.slice(0, 4) || "–";
      else if  (groupBy === "month")   {
        const d = po?.orderDate?.slice(0, 7) || "–";
        const mDate = new Date(d + "-01");
        key = d === "–" ? "–" : `${d} – ${mDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`;
      }
      if (!m[key]) m[key] = { key, items: [], net: 0, buy: 0, margin: 0, noPrice: 0 };
      const n = itemNet(i); const b = itemBuy(i); const mg = itemMargin(i);
      m[key].items.push(i); m[key].net += n; m[key].buy += b;
      if (mg !== null) m[key].margin += mg; else m[key].noPrice++;
    });
    const all = Object.values(m);
    all.sort((a, b) => {
      let vA, vB;
      if (sortCol === "key") { vA = a.key; vB = b.key; }
      else if (sortCol === "items") { vA = a.items.length; vB = b.items.length; }
      else if (sortCol === "pct") {
        vA = a.net > 0 && a.buy > 0 ? (a.margin / a.net) : -Infinity;
        vB = b.net > 0 && b.buy > 0 ? (b.margin / b.net) : -Infinity;
      } else { vA = a[sortCol]; vB = b[sortCol]; }
      
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof vA === "string") return vA.localeCompare(vB) * dir;
      return (vA - vB) * dir;
    });

    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((g) => g.key.toLowerCase().includes(q));
  }, [items, pos, suppliers, groupBy, search, sortCol, sortDir]);

  const tSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const totNet = groups.reduce((s, g) => s + g.net, 0);
  const totBuy = groups.reduce((s, g) => s + g.buy, 0);
  const totMg  = groups.reduce((s, g) => s + g.margin, 0);

  const getCopyData = () => ({
    headers: ["Kelompok", "Net Jual", "Total Beli", "Margin", "Margin %", "Items"],
    rows: groups.map((g) => {
      const pct = g.net > 0 && g.buy > 0 ? (g.margin / g.net * 100).toFixed(1) + "%" : "–";
      return [g.key, g.net, g.buy, g.margin, pct, g.items.length];
    }),
  });

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex gap-2 py-3 px-4 border-b border-border-default flex-wrap items-center shrink-0 bg-surface">
        <div className="flex gap-0 bg-bg-app rounded-md p-0.5 border border-border-default">
          {GROUP_OPTS.map((o) => (
            <button key={o.v} onClick={() => setGroupBy(o.v)} className={tabBtn(groupBy === o.v)}>{o.l}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px] max-w-[280px]">
          <FIn value={search} onChange={setSearch} placeholder="Cari..." className="pl-7 pr-2 py-1" />
          <Ico d={IC.search} size={13} color="var(--color-text-muted)" className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <CopyTSVButton label="Copy TSV" getData={getCopyData} />
        <span className="text-[11px] text-text-muted ml-auto">{groups.length} kelompok</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1 w-full">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className={`${thCls} cursor-pointer hover:text-brand select-none`} onClick={() => tSort("key")}>Kelompok {sortCol === "key" && (sortDir === "asc" ? "↑" : "↓")}</th>
              <th className={`${thCls} text-right cursor-pointer hover:text-brand select-none`} onClick={() => tSort("net")}>Net Jual {sortCol === "net" && (sortDir === "asc" ? "↑" : "↓")}</th>
              <th className={`${thCls} text-right cursor-pointer hover:text-brand select-none`} onClick={() => tSort("buy")}>Total Beli {sortCol === "buy" && (sortDir === "asc" ? "↑" : "↓")}</th>
              <th className={`${thCls} text-right cursor-pointer hover:text-brand select-none`} onClick={() => tSort("margin")}>Margin {sortCol === "margin" && (sortDir === "asc" ? "↑" : "↓")}</th>
              <th className={`${thCls} text-right cursor-pointer hover:text-brand select-none`} onClick={() => tSort("pct")}>Margin % {sortCol === "pct" && (sortDir === "asc" ? "↑" : "↓")}</th>
              <th className={`${thCls} text-center cursor-pointer hover:text-brand select-none`} onClick={() => tSort("items")}>Items {sortCol === "items" && (sortDir === "asc" ? "↑" : "↓")}</th>
              <th className={thCls}>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g, i) => {
              const pct     = g.net > 0 && g.buy > 0 ? g.margin / g.net * 100 : null;
              const rowBg   = i % 2 === 0 ? "bg-white hover:bg-brand-soft" : "bg-surface-alt hover:bg-brand-soft";
              const netCls  = "text-brand";
              const buyCls  = g.buy > 0 ? "text-orange" : "text-text-muted";
              const mgCls   = g.buy > 0 ? (g.margin >= 0 ? "text-green" : "text-red") : "text-text-muted";
              const pctCls  = pct === null ? "text-text-muted" : pct >= 20 ? "text-green" : pct >= 10 ? "text-amber" : "text-red";
              return (
                <tr key={g.key} className={`transition-colors ${rowBg}`}>
                  <td className={`${tdCls} font-semibold truncate max-w-[220px]`} title={g.key}>{g.key}</td>
                  <td className={`${tdCls} text-right font-mono font-semibold whitespace-nowrap ${netCls}`}>{fmt(g.net)}</td>
                  <td className={`${tdCls} text-right font-mono whitespace-nowrap ${buyCls}`}>{g.buy > 0 ? fmt(g.buy) : "–"}</td>
                  <td className={`${tdCls} text-right font-mono font-bold whitespace-nowrap ${mgCls}`}>{g.buy > 0 ? fmt(g.margin) : "–"}</td>
                  <td className={`${tdCls} text-right font-bold ${pctCls}`}>{pct === null ? "–" : `${pct.toFixed(1)}%`}</td>
                  <td className={`${tdCls} text-center`}>{g.items.length}</td>
                  <td className={`${tdCls} text-[10px] text-text-muted`}>{g.noPrice > 0 ? `${g.noPrice} item tanpa harga beli` : ""}</td>
                </tr>
              );
            })}
            <tr className="bg-brand-soft">
              <td className={`${tdCls} font-extrabold text-text-primary`}>TOTAL</td>
              <td className={`${tdCls} text-right font-mono font-extrabold text-brand whitespace-nowrap`}>{fmt(totNet)}</td>
              <td className={`${tdCls} text-right font-mono font-bold text-orange whitespace-nowrap`}>{fmt(totBuy)}</td>
              <td className={`${tdCls} text-right font-mono font-extrabold whitespace-nowrap ${totMg >= 0 ? "text-green" : "text-red"}`}>{fmt(totMg)}</td>
              <td className={`${tdCls} text-right font-extrabold text-text-primary`}>{totNet > 0 && totBuy > 0 ? `${(totMg / totNet * 100).toFixed(1)}%` : "–"}</td>
              <td className={`${tdCls} text-center font-bold`}>{items.length}</td>
              <td className={tdCls} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
