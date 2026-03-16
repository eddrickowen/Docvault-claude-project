import { useState } from "react";
import { Btn, Ico, IC, FF, FIn, NumInput } from "../ui";
import { SupplierSelect } from "../shared";
import { SupplierFormModal } from "./SupplierFormModal";
import { uid, fmt } from "../../lib/helpers";
import { mkAsgn } from "../../lib/constants";

/**
 * SupplierAssignments — manage main/backup supplier assignments for an item.
 * Shows price comparison table when ≥2 suppliers have prices.
 */
export function SupplierAssignments({ assignments, qty, onChange, suppliers, onAddSupplier }) {
  const [addNew, setAddNew] = useState(false);

  const add = () =>
    onChange([
      ...assignments,
      { ...mkAsgn(), id: "sa" + uid(), role: assignments.length === 0 ? "main" : "backup" },
    ]);
  const upd = (id, p) => onChange(assignments.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const del = (id) => onChange(assignments.filter((a) => a.id !== id));
  const setMain = (id) =>
    onChange(assignments.map((a) => ({ ...a, role: a.id === id ? "main" : a.role === "main" ? "backup" : a.role })));

  const tpu = (a) => (a.pricePerUnit || 0) + (a.shippingTotal || 0) / Math.max(Number(qty) || 1, 1);
  const withP = assignments.filter((a) => a.supplierId && (a.pricePerUnit || 0) > 0);
  const sorted = [...withP].sort((a, b) => tpu(a) - tpu(b));

  return (
    <div>
      {!assignments.length && (
        <div className="p-[14px] bg-surface-alt rounded-lg border border-dashed border-border-strong text-center mb-2.5 text-text-muted text-xs">
          Belum ada supplier untuk item ini.
        </div>
      )}

      {assignments.map((a) => {
        const isM = a.role === "main";
        const t = tpu(a);
        return (
          <div
            key={a.id}
            className={`border-2 rounded-lg mb-2.5 overflow-hidden ${isM ? "border-brand" : "border-border-default"}`}
          >
            {/* Header row */}
            <div className={`flex items-center gap-2 py-[9px] px-3 border-b ${isM ? "bg-brand-soft border-brand-mid" : "bg-surface-alt border-border-default"}`}>
              <div className="flex gap-[3px] shrink-0">
                <button
                  type="button"
                  onClick={() => setMain(a.id)}
                  className={`py-[3px] px-2.5 rounded-full border text-[10px] font-bold cursor-pointer ${isM ? "border-brand bg-brand text-white" : "border-border-strong bg-transparent text-text-secondary"}`}
                >
                  ● Utama
                </button>
                <button
                  type="button"
                  onClick={() => upd(a.id, { role: "backup" })}
                  className={`py-[3px] px-2.5 rounded-full border text-[10px] font-bold cursor-pointer ${!isM ? "border-text-secondary bg-surface-alt text-text-secondary" : "border-border-strong bg-transparent text-text-muted"}`}
                >
                  ○ Backup
                </button>
              </div>
              <SupplierSelect
                value={a.supplierId}
                onChange={(v) => upd(a.id, { supplierId: v })}
                suppliers={suppliers}
                onAddNew={() => setAddNew(true)}
              />
              <Btn size="sm" variant="danger" onClick={() => del(a.id)}>
                <Ico d={IC.trash} size={10} />
              </Btn>
            </div>

            {/* Price fields */}
            {a.supplierId && (
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <FF label="Harga Beli /Unit (Rp)">
                    <NumInput value={a.pricePerUnit || 0} onChange={(v) => upd(a.id, { pricePerUnit: v })} min={0} />
                  </FF>
                  <FF label="Ongkir Total (Rp)">
                    <NumInput value={a.shippingTotal || 0} onChange={(v) => upd(a.id, { shippingTotal: v })} min={0} />
                  </FF>
                  <FF label="Efektif /Unit">
                    <FIn
                      value={fmt(t)}
                      readOnly
                      style={{ fontSize: 11, fontWeight: 700, color: isM ? "var(--color-brand)" : "var(--color-text-primary)" }}
                    />
                  </FF>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FF label="Link / URL">
                    <div className="flex gap-1.5 items-center">
                      <FIn value={a.link || ""} onChange={(v) => upd(a.id, { link: v })} placeholder="https://..." />
                      {a.link && (
                        <a href={a.link} target="_blank" rel="noreferrer" className="text-brand shrink-0">
                          <Ico d={IC.link} size={11} color="var(--color-brand)" />
                        </a>
                      )}
                    </div>
                  </FF>
                  <FF label="Catatan">
                    <FIn value={a.notes || ""} onChange={(v) => upd(a.id, { notes: v })} placeholder="Info..." />
                  </FF>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Btn size="sm" variant="blue" onClick={add}>
        <Ico d={IC.plus} size={11} /> Tambah Supplier
      </Btn>

      {/* Price comparison table */}
      {sorted.length >= 2 && (
        <div className="mt-3 rounded-lg border border-border-default overflow-hidden">
          <div className="py-2 px-3 bg-surface-alt border-b border-border-default flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[.06em]">Perbandingan Harga</span>
            <span className="text-[9px] text-text-muted">({sorted.length} supplier)</span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-alt">
                {["#", "Supplier", "Harga/Unit", "Ongkir", "Efektif/Unit", "Selisih", ""].map((h) => (
                  <th key={h} className="py-[5px] px-2.5 text-[9px] font-bold text-text-secondary text-left border-b border-border-default uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((a, i) => {
                const s = suppliers.find((x) => x.id === a.supplierId);
                const t = tpu(a);
                const cheapest = tpu(sorted[0]);
                const diff = t - cheapest;
                const pct = cheapest > 0 ? ((diff / cheapest) * 100).toFixed(1) : 0;
                return (
                  <tr key={a.id} className={i === 0 ? "bg-green-soft" : i % 2 === 0 ? "bg-white" : "bg-surface-alt"}>
                    <td className="py-[6px] px-2.5 text-center">
                      {i === 0
                        ? <span className="text-[9px] font-bold text-green bg-green-mid rounded-full px-[6px] py-px">★</span>
                        : <span className="text-[9px] text-text-muted font-mono">#{i + 1}</span>}
                    </td>
                    <td className="py-[6px] px-2.5 text-[11px] font-semibold max-w-[130px] truncate" title={s?.name}>{s?.name || "–"}</td>
                    <td className="py-[6px] px-2.5 font-mono text-[11px] text-text-primary whitespace-nowrap">{fmt(a.pricePerUnit || 0)}</td>
                    <td className="py-[6px] px-2.5 font-mono text-[11px] text-text-secondary whitespace-nowrap">{a.shippingTotal > 0 ? fmt(a.shippingTotal) : "–"}</td>
                    <td className={`py-[6px] px-2.5 font-mono font-bold text-[12px] whitespace-nowrap ${i === 0 ? "text-green" : "text-text-primary"}`}>{fmt(t)}</td>
                    <td className="py-[6px] px-2.5 whitespace-nowrap">
                      {i === 0
                        ? <span className="text-[10px] text-green font-semibold">Termurah</span>
                        : <span className="text-[10px] text-red font-mono font-semibold">+{fmt(diff)} <span className="text-[9px] opacity-70">({pct}%)</span></span>}
                    </td>
                    <td className="py-[6px] px-2.5">
                      {a.role === "main" && <span className="text-[9px] font-bold text-brand bg-brand-soft border border-brand-mid rounded px-1.5 py-px">UTAMA</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addNew && (
        <SupplierFormModal
          onSave={(s) => { onAddSupplier?.(s); setAddNew(false); }}
          onClose={() => setAddNew(false)}
        />
      )}
    </div>
  );
}
