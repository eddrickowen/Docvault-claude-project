import { useState, useEffect, useMemo } from "react";
import { Modal, Btn, Ico, IC, FGrid, FF, FIn, FTa, FSel, NumInput, Divider, SBadge, SearchInput } from "../ui";
import { SmartDate } from "../shared";
import { ItemForm } from "./ItemForm";
import { uid, today, fmt, itemNet, itemBuy } from "../../lib/helpers";
import { INIT_PO_STATUS, ITEM_STATUS, mkItem } from "../../lib/constants";

/**
 * POForm — create or edit a PO header + its line items.
 */
export function POForm({ initial, companies, items, suppliers, dos, zoneTypes, settings, hsDB = [], onSave, onClose, onAddSupplier }) {
  const blank = {
    id: "", quoteRef: "", orderNo: "", company: "", orderDate: today(),
    prNo: "", notes: "", folder: "", status: "confirmed", priority: "normal",
    totalLocked: false, manualExPPN: 0, manualPPN: 0,
  };
  const [f, setF] = useState(initial || blank);
  const [draftItems, setDraftItems] = useState(() =>
    initial?.id ? items.filter((i) => i.poId === initial.id) : []
  );
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  // Compute totals directly from draftItems (bypass poId filter for new POs)
  const tots = useMemo(() => {
    if (f.totalLocked) {
      const ex = Number(f.manualExPPN) || 0;
      const ppn = Number(f.manualPPN) || Math.round(ex * 0.11);
      return { exPPN: ex, ppn, total: ex + ppn };
    }
    const ex = draftItems.reduce((s, i) => s + itemNet(i), 0);
    return { exPPN: ex, ppn: Math.round(ex * 0.11), total: Math.round(ex * 1.11) };
  }, [f, draftItems]);

  const handleSave = () => {
    if (!f.company.trim() || !f.orderDate) return;
    const newId = f.id || uid();
    // Ensure all draft items carry the final PO id
    const finalItems = draftItems.map((i) => ({ ...i, poId: newId }));
    onSave({ ...f, id: newId }, finalItems);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [f, draftItems]);

  return (
    <Modal open onClose={onClose} title={initial?.id ? `Edit PO – ${initial.orderNo}` : "Tambah PO Baru"} xwide>
      <FGrid cols={2}>
        <Divider label="Informasi PO" />
        <FF label="No. PO / Order" required>
          <FIn value={f.orderNo} onChange={set("orderNo")} placeholder="PTAM/PO/NT/24/00001" />
        </FF>
        <FF label="Quote Ref">
          <FIn value={f.quoteRef} onChange={set("quoteRef")} placeholder="019/MIA/V/2024" />
        </FF>
        <FF label="Perusahaan" required span={2}>
          <SearchInput
            value={f.company}
            onChange={set("company")}
            options={companies.map((c) => ({ v: c, l: c }))}
            placeholder="Ketik nama perusahaan (tab untuk pilih)..."
          />
        </FF>
        <FF label="Tanggal Order">
          <SmartDate value={f.orderDate} onChange={set("orderDate")} />
        </FF>
        <FF label="PR No.">
          <FIn value={f.prNo} onChange={set("prNo")} placeholder="PTAM/PR/00001" />
        </FF>
        <FF label="Status PO">
          <FSel value={f.status} onChange={set("status")} options={Object.entries(INIT_PO_STATUS).map(([k, v]) => ({ v: k, l: v.label }))} />
        </FF>
        <FF label="Prioritas">
          <FSel value={f.priority} onChange={set("priority")} options={[{ v: "normal", l: "Normal" }, { v: "urgent", l: "Urgent" }, { v: "low", l: "Low" }]} />
        </FF>
        <FF label="Folder / Link" span={2}>
          <FIn value={f.folder} onChange={set("folder")} placeholder="https://drive.google.com/..." />
        </FF>
        <FF label="Catatan" span={2}>
          <FTa value={f.notes} onChange={set("notes")} rows={2} placeholder="Catatan PO..." />
        </FF>

        <Divider label="Total" />
        <FF label={
          <span className="flex items-center gap-1.5">
            Lock Total Manual
            <Ico d={f.totalLocked ? IC.lock : IC.unlock} size={11} color={f.totalLocked ? "var(--color-amber)" : "var(--color-text-muted)"} />
          </span>
        } span={2}>
          <label className="flex items-center gap-2 cursor-pointer text-xs mt-0.5">
            <input
              type="checkbox"
              checked={f.totalLocked}
              onChange={(e) => setF((p) => ({ ...p, totalLocked: e.target.checked }))}
            />
            <span>Kunci total manual (override kalkulasi otomatis dari item)</span>
          </label>
        </FF>

        {f.totalLocked && (
          <>
            <FF label="Total Ex PPN (Rp)">
              <NumInput value={f.manualExPPN || 0} onChange={set("manualExPPN")} min={0} />
            </FF>
            <FF label={`PPN (Rp) · 11% = ${fmt(Math.round((f.manualExPPN || 0) * 0.11))}`}>
              <NumInput value={f.manualPPN || 0} onChange={set("manualPPN")} min={0} />
            </FF>
          </>
        )}
        <FF label="Total Ex PPN">
          <FIn value={fmt(tots.exPPN)} readOnly style={{ fontWeight: 700, color: "var(--color-brand)" }} />
        </FF>
        <FF label="Total Inc PPN">
          <FIn value={fmt(tots.total)} readOnly style={{ fontWeight: 700, color: "var(--color-green)" }} />
        </FF>
      </FGrid>

      {/* Draft Items */}
      <div className="mt-4 border border-border-default rounded-lg overflow-hidden">
        <div className="flex justify-between items-center py-2.5 px-3.5 bg-surface-alt border-b border-border-default">
          <span className="text-xs font-bold text-text-primary">Items ({draftItems.length})</span>
          <Btn size="sm" variant="blue" onClick={() => setShowAddItem(true)}>
            <Ico d={IC.plus} size={11} /> Tambah Item
          </Btn>
        </div>
        {!draftItems.length && (
          <div className="p-5 text-center text-text-muted text-xs">Belum ada item.</div>
        )}
        {draftItems.map((item, i) => {
          const main = (item.supplierAssignments || []).find((a) => a.role === "main");
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 py-2.5 px-3.5 ${i < draftItems.length - 1 ? "border-b border-border-default" : ""} ${i % 2 === 0 ? "bg-white" : "bg-surface-alt"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{item.itemName}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">
                  {item.qty} {item.unit} · {fmt(itemNet(item))}{main ? ` · Beli: ${fmt(itemBuy(item))}` : ""}
                </div>
              </div>
              <SBadge status={item.status} cfg={ITEM_STATUS} />
              <Btn size="sm" variant="ghost" onClick={() => setEditItem(item)}>
                <Ico d={IC.edit} size={11} />
              </Btn>
              <Btn size="sm" variant="danger" onClick={() => setDraftItems((p) => p.filter((x) => x.id !== item.id))}>
                <Ico d={IC.trash} size={11} />
              </Btn>
            </div>
          );
        })}
      </div>

      {showAddItem && (
        <Modal open onClose={() => setShowAddItem(false)} title="Tambah Item" wide>
          <ItemForm
            poId={f.id || "draft"}
            zoneTypes={zoneTypes}
            suppliers={suppliers}
            dos={dos}
            hsDB={hsDB}
            onAddSupplier={onAddSupplier}
            onSave={(item) => { setDraftItems((p) => [...p, item]); setShowAddItem(false); }}
            onClose={() => setShowAddItem(false)}
          />
        </Modal>
      )}

      {editItem && (
        <Modal open onClose={() => setEditItem(null)} title="Edit Item" wide>
          <ItemForm
            initial={editItem}
            poId={f.id || "draft"}
            zoneTypes={zoneTypes}
            suppliers={suppliers}
            dos={dos}
            hsDB={hsDB}
            onAddSupplier={onAddSupplier}
            onSave={(item) => { setDraftItems((p) => p.map((x) => (x.id === item.id ? item : x))); setEditItem(null); }}
            onClose={() => setEditItem(null)}
          />
        </Modal>
      )}

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border-default">
        <Btn onClick={onClose} variant="secondary">Batal</Btn>
        <Btn onClick={handleSave} disabled={!f.company || !f.orderDate}>
          <Ico d={IC.save} size={12} /> Simpan PO
        </Btn>
      </div>
    </Modal>
  );
}
