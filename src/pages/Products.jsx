import { useState, useMemo } from "react";
import { Btn, Ico, IC, Modal, FIn } from "../components/ui";
import { DataTableToolbar, Pagination } from "../components/shared";
import { useDataTable, useConfirm } from "../hooks";
import { usePOStore } from "../store/usePOStore";
import { fmt, fmtShort } from "../lib/helpers";
import { PAGE_SIZE } from "../lib/constants";

/* ─── Class Constants ───────────────────────────────────────── */
const kpiCard  = "rounded-xl border border-border-default p-4 shadow-sm flex flex-col gap-1 cursor-default";
const tdCls    = "py-2.5 px-3 border-b border-border-default text-[12px] align-middle";
const thCls    = "py-2 px-3 text-[10px] font-extrabold text-text-secondary text-left whitespace-nowrap border-b border-border-strong uppercase tracking-[.08em] bg-surface-alt sticky top-0 z-[10]";

/* ─── Stock Health Bar ───────────────────────────────────────── */
function StockBar({ stock, safety, max }) {
  const safetyPct = max > 0 ? Math.min(100, (safety / max) * 100) : 0;
  const stockPct  = max > 0 ? Math.min(100, (stock  / max) * 100) : 0;
  const isLow     = stock <= safety;
  const isCritical= stock === 0;
  const barColor  = isCritical ? "bg-red-500" : isLow ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="relative w-full h-2 rounded-full bg-bg-app overflow-hidden" title={`Stock: ${stock} / Safety: ${safety}`}>
      {/* Safety threshold marker */}
      {safetyPct > 0 && (
        <div className="absolute top-0 bottom-0 w-[2px] bg-amber-400/70 z-[2]" style={{ left: `${safetyPct}%` }} />
      )}
      {/* Stock fill */}
      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${stockPct}%` }} />
    </div>
  );
}

/* ─── KPI Card ───────────────────────────────────────────────── */
function KPI({ icon, label, value, sub, color, bg }) {
  return (
    <div className={kpiCard} style={{ background: bg }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
          <Ico d={icon} size={16} color={color} />
        </div>
      </div>
      <div className="text-[20px] font-extrabold leading-tight" style={{ color }}>{value}</div>
      <div className="text-[12px] font-semibold text-text-secondary">{label}</div>
      {sub && <div className="text-[10px] text-text-muted">{sub}</div>}
    </div>
  );
}

/* ─── Adjust Stock Modal ─────────────────────────────────────── */
function AdjustStockModal({ product, onSave, onClose }) {
  const [qty, setQty]     = useState(0);
  const [mode, setMode]   = useState("set");  // "set" | "add" | "sub"
  const [note, setNote]   = useState("");

  const preview = mode === "set" ? qty
    : mode === "add" ? (product.stockLevel || 0) + qty
    : Math.max(0, (product.stockLevel || 0) - qty);

  const handleSave = () => {
    onSave({ ...product, stockLevel: preview, _adjustNote: note });
    onClose();
  };

  return (
    <Modal title={`Adjust Stock — ${product.sku}`} onClose={onClose}>
      <div className="flex flex-col gap-5 min-w-[340px] p-2">
        {/* Current Stock Banner */}
        <div className="rounded-lg bg-brand-soft border border-brand-mid p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-text-muted uppercase font-bold">Current Stock</div>
            <div className="text-[22px] font-extrabold text-brand">{product.stockLevel ?? 0} <span className="text-[12px] font-semibold">{product.uom}</span></div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-text-muted uppercase font-bold">Safety Min</div>
            <div className="text-[16px] font-bold text-amber">{product.safetyStock ?? 0}</div>
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <div className="text-[10px] font-bold text-text-secondary uppercase mb-2">Adjustment Type</div>
          <div className="flex gap-2">
            {[
              { v: "set", label: "Set Exact",      color: "blue" },
              { v: "add", label: "Add (Inbound)",   color: "green" },
              { v: "sub", label: "Remove (Outbound)", color: "red" },
            ].map(m => (
              <button
                key={m.v}
                onClick={() => setMode(m.v)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all ${
                  mode === m.v
                    ? m.v === "set" ? "bg-blue-600 text-white border-blue-600"
                      : m.v === "add" ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-red-500 text-white border-red-500"
                    : "bg-bg-app border-border-default text-text-secondary hover:border-brand-mid"
                }`}
              >{m.label}</button>
            ))}
          </div>
        </div>

        {/* Quantity Input */}
        <div>
          <div className="text-[10px] font-bold text-text-secondary uppercase mb-1">Quantity</div>
          <input
            type="number"
            min={0}
            value={qty}
            onChange={e => setQty(parseFloat(e.target.value) || 0)}
            className="w-full border border-border-strong rounded-lg px-3 py-2 text-[16px] font-bold bg-bg-app text-text-primary focus:outline-none focus:border-brand"
          />
        </div>

        {/* Preview */}
        <div className={`rounded-lg p-3 border ${preview < (product.safetyStock||0) ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
          <div className="text-[9px] uppercase font-bold text-text-muted mb-1">New Stock After Adjustment</div>
          <div className={`text-[20px] font-extrabold ${preview < (product.safetyStock||0) ? "text-red-600" : "text-emerald-600"}`}>
            {preview} <span className="text-[12px]">{product.uom}</span>
          </div>
          {preview < (product.safetyStock||0) && (
            <div className="text-[10px] text-red-500 font-semibold mt-1">⚠ Below safety stock level</div>
          )}
        </div>

        {/* Note */}
        <div>
          <div className="text-[10px] font-bold text-text-secondary uppercase mb-1">Reason / Note</div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Physical count, supplier delivery..."
            className="w-full border border-border-default rounded-lg px-3 py-2 text-xs bg-bg-app text-text-primary focus:outline-none focus:border-brand"
          />
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-border-default">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" className="!px-6" onClick={handleSave}>
            <Ico d={IC.check} size={13} /> Apply Adjustment
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Products Page ──────────────────────────────────────────── */
export function Products() {
  const { products, addProduct, updateProduct, deleteProduct, toast } = usePOStore();
  const {
    search, setSearch, page, setPage, perPage, setPerPage,
    sort, toggleSort, getPaged, hasFilters, resetFilters
  } = useDataTable("name", "asc", PAGE_SIZE, "products-list");

  const [showForm,   setShowForm]   = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [adjusting,  setAdjusting]  = useState(null);
  const [activeTab,  setActiveTab]  = useState("all");   // "all" | "low" | "ok"
  const { ask, ConfirmModal } = useConfirm();

  /* ─── KPI Computations ─── */
  const kpis = useMemo(() => {
    const all        = products || [];
    const low        = all.filter(p => (p.stockLevel || 0) <= (p.safetyStock || 0));
    const outOfStock = all.filter(p => (p.stockLevel || 0) === 0);
    const totalVal   = all.reduce((s, p) => s + (p.stockLevel || 0) * (p.unitCost || 0), 0);
    return { all, low, outOfStock, totalVal };
  }, [products]);

  /* ─── Filter + Sort ─── */
  const filtered = useMemo(() => {
    let r = products || [];
    // Tab filter
    if (activeTab === "low")  r = r.filter(p => (p.stockLevel || 0) <= (p.safetyStock || 0) && (p.stockLevel||0) > 0);
    if (activeTab === "out")  r = r.filter(p => (p.stockLevel || 0) === 0);
    if (activeTab === "ok")   r = r.filter(p => (p.stockLevel || 0) > (p.safetyStock || 0));

    if (search) {
      const q = search.toLowerCase();
      r = r.filter(p =>
        (p.sku?.toLowerCase().includes(q)) ||
        (p.name?.toLowerCase().includes(q)) ||
        (p.desc?.toLowerCase().includes(q))
      );
    }
    return [...r].sort((a, b) => {
      let av = a[sort.col] ?? "", bv = b[sort.col] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
      const d = String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? d : -d;
    });
  }, [products, search, sort, activeTab]);

  const maxStock = useMemo(() => Math.max(...(products || []).map(p => p.stockLevel || 0), 1), [products]);
  const paged    = getPaged(filtered);

  /* ─── Handlers ─── */
  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      sku:        fd.get("sku"),
      name:       fd.get("name"),
      desc:       fd.get("desc"),
      uom:        fd.get("uom"),
      stockLevel:  parseFloat(fd.get("stockLevel"))  || 0,
      safetyStock: parseFloat(fd.get("safetyStock")) || 0,
      unitCost:    parseFloat(fd.get("unitCost"))    || 0,
      unitPrice:   parseFloat(fd.get("unitPrice"))   || 0,
    };
    if (editItem) {
      await updateProduct({ ...editItem, ...data });
      toast("✓ Product updated");
    } else {
      await addProduct(data);
      toast("✓ Product added");
    }
    setShowForm(false);
  };

  const handleAdjust = async (updated) => {
    await updateProduct(updated);
    toast(`✓ Stock adjusted to ${updated.stockLevel} ${updated.uom || ""}`);
  };

  /* ─── Tabs ─── */
  const TABS = [
    { id: "all",  label: "All Products",    count: kpis.all.length },
    { id: "low",  label: "Low Stock",       count: kpis.low.length,        accent: "text-amber" },
    { id: "out",  label: "Out of Stock",    count: kpis.outOfStock.length,  accent: "text-red" },
    { id: "ok",   label: "Healthy",         count: kpis.all.length - kpis.low.length - kpis.outOfStock.length, accent: "text-green" },
  ];

  /* ─── Column headers ─── */
  const COL_HEADS = [
    { col: "sku",       label: "SKU / Code",    w: "w-[120px]" },
    { col: "name",      label: "Product",        w: "flex-1" },
    { col: "stockLevel",label: "Stock Level",    w: "w-[180px]" },
    { col: "unitCost",  label: "Unit Cost",      w: "w-[110px]" },
    { col: "unitPrice", label: "Sell Price",     w: "w-[110px]" },
    { col: "actions",   label: "",               w: "w-[120px]" },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-bg-app">
      <ConfirmModal />

      {/* ── Page Header ── */}
      <div className="shrink-0 px-5 pt-5 pb-4 bg-surface border-b border-border-default">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KPI icon={IC.box}    label="Total Products"      value={kpis.all.length}          sub="in catalog"         color="var(--color-brand)"       bg="var(--color-brand-soft)" />
          <KPI icon={IC.warn}   label="Low / Critical"      value={kpis.low.length}           sub={`${kpis.outOfStock.length} out of stock`} color="var(--color-amber)"  bg="var(--color-amber-soft)" />
          <KPI icon={IC.fire}   label="Out of Stock"        value={kpis.outOfStock.length}    sub="needs reorder"      color="var(--color-red)"         bg="#fef2f2" />
          <KPI icon={IC.stats}  label="Inventory Value"     value={fmtShort(kpis.totalVal)}   sub="at cost price"      color="var(--color-green)"       bg="var(--color-green-soft)" />
        </div>

        {/* Tabs + Actions Row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 bg-bg-app rounded-lg p-1 border border-border-default">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === t.id
                    ? "bg-white text-text-primary shadow-sm border border-border-default"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[9px] font-extrabold ${activeTab === t.id ? (t.accent || "text-brand") : (t.accent || "text-text-muted")}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Ico d={IC.search} size={13} color="var(--color-text-muted)" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search SKU, name..."
                className="pl-8 pr-3 py-1.5 text-[12px] border border-border-default rounded-lg bg-bg-app text-text-primary focus:outline-none focus:border-brand w-[200px]"
              />
            </div>
            <Btn variant="primary" size="sm" className="!px-4" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Ico d={IC.plus} size={13} /> Add Product
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              {COL_HEADS.map(h => (
                <th
                  key={h.col}
                  className={`${thCls} ${h.w}`}
                  onClick={() => h.col !== "actions" && toggleSort(h.col)}
                  style={{ cursor: h.col !== "actions" ? "pointer" : "default" }}
                >
                  <div className="flex items-center gap-1">
                    {h.label}
                    {h.col !== "actions" && sort.col === h.col && (
                      <Ico d={sort.dir === "asc" ? IC.sortU : IC.sortD} size={9} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!paged.length && (
              <tr><td colSpan={6} className="py-24 text-center">
                <div className="flex flex-col items-center gap-3 opacity-40">
                  <Ico d={IC.box} size={40} />
                  <div className="text-sm font-bold">
                    {activeTab === "all" ? "No products yet" : `No products in \"${TABS.find(t=>t.id===activeTab)?.label}\" category`}
                  </div>
                  {activeTab === "all" && (
                    <Btn variant="secondary" size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
                      <Ico d={IC.plus} size={11} /> Add First Product
                    </Btn>
                  )}
                </div>
              </td></tr>
            )}

            {paged.map((p, i) => {
              const stock    = p.stockLevel || 0;
              const safety   = p.safetyStock || 0;
              const isOut    = stock === 0;
              const isLow    = stock <= safety;
              const rowBg    = i % 2 === 0 ? "bg-white" : "bg-[#fafbff]";
              const stockColor = isOut ? "text-red font-extrabold" : isLow ? "text-amber font-bold" : "text-emerald-600 font-bold";
              const statusBadge = isOut
                ? <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase bg-red-50 text-red border border-red-200 rounded-full px-2 py-0.5">Out of Stock</span>
                : isLow
                ? <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase bg-amber-50 text-amber border border-amber-200 rounded-full px-2 py-0.5"><Ico d={IC.warn} size={9} /> Low Stock</span>
                : null;

              return (
                <tr key={p.id} className={`${rowBg} hover:bg-brand-soft/20 transition-colors group`}>
                  {/* SKU */}
                  <td className={`${tdCls} w-[120px]`}>
                    <span className="font-mono text-[11px] font-bold text-brand bg-brand-soft/60 px-2 py-0.5 rounded">{p.sku}</span>
                  </td>

                  {/* Name + Desc */}
                  <td className={tdCls}>
                    <div className="flex items-start gap-2">
                      <div>
                        <div className="font-semibold text-text-primary text-[13px]">{p.name}</div>
                        {p.desc && <div className="text-[10px] text-text-muted truncate max-w-[300px]">{p.desc}</div>}
                        {statusBadge && <div className="mt-1">{statusBadge}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Stock w/ bar */}
                  <td className={`${tdCls} w-[180px]`}>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className={`text-[15px] ${stockColor}`}>{stock}</span>
                      <span className="text-[10px] text-text-muted uppercase font-semibold">{p.uom || "—"}</span>
                    </div>
                    <StockBar stock={stock} safety={safety} max={maxStock} />
                    <div className="text-[9px] text-text-muted mt-1">Safety min: {safety}</div>
                  </td>

                  {/* Cost */}
                  <td className={`${tdCls} w-[110px]`}>
                    <div className="font-mono text-[11px] text-text-muted">{fmt(p.unitCost || 0)}</div>
                  </td>

                  {/* Price */}
                  <td className={`${tdCls} w-[110px]`}>
                    <div className="font-mono text-[12px] font-bold text-text-primary">{fmt(p.unitPrice || 0)}</div>
                    {p.unitCost > 0 && p.unitPrice > 0 && (
                      <div className="text-[9px] text-green font-semibold">
                        +{Math.round(((p.unitPrice - p.unitCost) / p.unitCost) * 100)}% margin
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className={`${tdCls} w-[120px] text-right`}>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Btn
                        size="sm" variant="blue" className="!px-2 !py-1 text-[10px]"
                        title="Adjust Stock"
                        onClick={() => setAdjusting(p)}
                      >
                        <Ico d={IC.archive} size={10} /> Stock
                      </Btn>
                      <Btn size="sm" variant="ghost" className="!p-1.5" title="Edit product" onClick={() => { setEditItem(p); setShowForm(true); }}>
                        <Ico d={IC.edit} size={11} />
                      </Btn>
                      <Btn
                        size="sm" variant="ghost" className="!p-1.5 hover:text-red hover:bg-red-soft"
                        title="Delete"
                        onClick={() => ask(`Delete "${p.name}" (${p.sku})?`, () => deleteProduct(p.id), { danger: true, confirmLabel: "Delete Product" })}
                      >
                        <Ico d={IC.trash} size={11} />
                      </Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Summary Footer */}
          {paged.length > 0 && (
            <tfoot>
              <tr className="bg-brand-soft/40 border-t border-brand-mid">
                <td colSpan={2} className="px-3 py-2 text-[10px] font-bold text-text-secondary uppercase">
                  Showing {paged.length} of {filtered.length} items
                </td>
                <td className="px-3 py-2 text-[10px] font-bold text-text-muted">
                  {filtered.filter(p => (p.stockLevel||0) <= (p.safetyStock||0)).length} need attention
                </td>
                <td className="px-3 py-2 font-mono text-[11px] font-bold text-text-muted">
                  {fmtShort(filtered.reduce((s,p) => s + (p.stockLevel||0)*(p.unitCost||0), 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination
        total={filtered.length} page={page} perPage={perPage}
        onChange={setPage} onPerPageChange={setPerPage}
        perPageOptions={[25, 50, 100, "All"]}
      />

      {/* ── Add/Edit Product Modal ── */}
      {showForm && (
        <Modal title={editItem ? `Edit — ${editItem.name}` : "Add New Product"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="flex flex-col gap-4 p-1 min-w-[420px]">
            {/* Identification */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase mb-2 border-b pb-1">Product Identity</div>
              <div className="grid grid-cols-2 gap-3">
                <FIn label="SKU / Code" name="sku" defaultValue={editItem?.sku} required placeholder="e.g. PRD-001" />
                <FIn label="Product Name" name="name" defaultValue={editItem?.name} required placeholder="Full product name" />
              </div>
              <div className="mt-3">
                <FIn label="Description / Spec" name="desc" defaultValue={editItem?.desc} placeholder="Specs, manufacturer, or notes..." />
              </div>
            </div>

            {/* Stock */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase mb-2 border-b pb-1">Stock & Unit</div>
              <div className="grid grid-cols-3 gap-3">
                <FIn label="UOM" name="uom" defaultValue={editItem?.uom} placeholder="pcs / kg / box" />
                <FIn label="Initial Stock" name="stockLevel" type="number" defaultValue={editItem?.stockLevel || 0} />
                <FIn label="Safety Min" name="safetyStock" type="number" defaultValue={editItem?.safetyStock || 0} placeholder="Reorder point" />
              </div>
            </div>

            {/* Pricing */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase mb-2 border-b pb-1">Pricing</div>
              <div className="grid grid-cols-2 gap-3">
                <FIn label="Unit Cost (IDR)" name="unitCost" type="number" defaultValue={editItem?.unitCost || 0} />
                <FIn label="Sell Price (IDR)" name="unitPrice" type="number" defaultValue={editItem?.unitPrice || 0} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border-default">
              <Btn type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn type="submit" variant="primary" className="!px-6">
                <Ico d={IC.save} size={12} /> {editItem ? "Save Changes" : "Add to Catalog"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Adjust Stock Modal ── */}
      {adjusting && (
        <AdjustStockModal
          product={adjusting}
          onSave={handleAdjust}
          onClose={() => setAdjusting(null)}
        />
      )}
    </div>
  );
}
