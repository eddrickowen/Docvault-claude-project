import { useState } from "react";
import { Btn, Ico, IC, FF, FIn, NumInput } from "../ui";
import { SupplierSelect } from "../shared";
import { SupplierFormModal } from "./SupplierFormModal";
import { uid, fmt } from "../../lib/helpers";

/**
 * BulkSupplierAssignments — specialized assignment UI for Bulk operations.
 * Allows assigning multiple suppliers to a batch of items, where EACH item
 * can have its own individual price and shipping cost for EACH selected supplier.
 */
export function BulkSupplierAssignments({ assignments, items, onChange, suppliers, onAddSupplier }) {
  const [addNew, setAddNew] = useState(false);

  const add = () => {
    const newId = "sa" + uid();
    // Initialize price map for all selected items to 0
    const initPrices = Object.fromEntries(items.map(i => [i.id, { pricePerUnit: 0, shippingTotal: 0 }]));
    onChange([
      ...assignments,
      { id: newId, role: assignments.length === 0 ? "main" : "backup", supplierId: "", prices: initPrices, link: "", notes: "" },
    ]);
  };

  const upd = (id, p) => onChange(assignments.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const del = (id) => onChange(assignments.filter((a) => a.id !== id));
  const setMain = (id) =>
    onChange(assignments.map((a) => ({ ...a, role: a.id === id ? "main" : a.role === "main" ? "backup" : a.role })));

  const updatePrice = (asgnId, itemId, field, val) => {
    onChange(assignments.map((a) => {
      if (a.id !== asgnId) return a;
      return {
        ...a,
        prices: {
          ...a.prices,
          [itemId]: { ...(a.prices[itemId] || { pricePerUnit: 0, shippingTotal: 0 }), [field]: val }
        }
      };
    }));
  };

  return (
    <div>
      {!assignments.length && (
        <div className="p-[14px] bg-surface-alt rounded-lg border border-dashed border-border-strong text-center mb-2.5 text-text-muted text-xs">
          Belum ada supplier yang ditambahkan untuk batch item ini.
        </div>
      )}

      {assignments.map((a) => {
        const isM = a.role === "main";
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

            {/* Individual Prices per Item mapping */}
            {a.supplierId && (
              <div className="p-3">
                <div className="border border-border-default rounded-md overflow-hidden mb-3">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-alt border-b border-border-default text-[9px] font-bold uppercase text-text-secondary tracking-[.04em]">
                      <tr>
                        <th className="py-1.5 px-2.5 w-[40%]">Item</th>
                        <th className="py-1.5 px-2.5">Harga Beli / Unit (Rp)</th>
                        <th className="py-1.5 px-2.5">Ongkir Total (Rp)</th>
                        <th className="py-1.5 px-2.5">Efektif / Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const itemPrice = a.prices[item.id] || { pricePerUnit: 0, shippingTotal: 0 };
                        const efektif = (itemPrice.pricePerUnit || 0) + ((itemPrice.shippingTotal || 0) / Math.max(Number(item.qty) || 1, 1));
                        return (
                          <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-surface-alt"}>
                            <td className="py-1.5 px-2.5 border-t border-border-default">
                              <div className="text-[11px] font-semibold text-text-primary leading-tight">{item.itemName}</div>
                              <div className="text-[9px] text-text-muted font-mono">{item.qty} {item.unit}</div>
                            </td>
                            <td className="py-1 px-2.5 border-t border-border-default align-top">
                              <NumInput 
                                value={itemPrice.pricePerUnit} 
                                onChange={(v) => updatePrice(a.id, item.id, "pricePerUnit", v)} 
                                className="!py-1"
                              />
                            </td>
                            <td className="py-1 px-2.5 border-t border-border-default align-top">
                              <NumInput 
                                value={itemPrice.shippingTotal} 
                                onChange={(v) => updatePrice(a.id, item.id, "shippingTotal", v)} 
                                className="!py-1"
                              />
                            </td>
                            <td className="py-1.5 px-2.5 border-t border-border-default align-top">
                              <div className="text-[11px] font-bold text-text-primary mt-1 font-mono">
                                {fmt(efektif)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FF label="Link / URL (Berlaku untuk semua item di atas)">
                    <div className="flex gap-1.5 items-center">
                      <FIn value={a.link || ""} onChange={(v) => upd(a.id, { link: v })} placeholder="https://..." />
                      {a.link && (
                        <a href={a.link} target="_blank" rel="noreferrer" className="text-brand shrink-0">
                          <Ico d={IC.link} size={11} color="var(--color-brand)" />
                        </a>
                      )}
                    </div>
                  </FF>
                  <FF label="Catatan Supplier">
                    <FIn value={a.notes || ""} onChange={(v) => upd(a.id, { notes: v })} placeholder="Info tambahan..." />
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

      {addNew && (
        <SupplierFormModal
          onSave={(s) => { onAddSupplier?.(s); setAddNew(false); }}
          onClose={() => setAddNew(false)}
        />
      )}
    </div>
  );
}
