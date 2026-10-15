import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Modal, Btn, Ico, IC, FGrid, FF, FIn, FTa, FSel, NumInput, Divider, SBadge, SearchInput } from "../ui";
import { SmartDate } from "../shared";
import { ItemForm } from "./ItemForm";
import { uid, today, fmt, itemNet, itemBuy } from "../../lib/helpers";
import { INIT_PO_STATUS, ITEM_STATUS, mkItem, PPN_RATE, UOM_OPTIONS } from "../../lib/constants";
import { usePOStore } from "../../store/usePOStore";

/* ─── Quick Add Row ─────────────────────────────────────────────────────────
 *  A lightweight, keyboard-driven inline row for fast item entry.
 *  Fields: [Product / Name] [Qty] [Unit] [Price] [Add]
 *  - Enter or Tab-past-Price = add item & reset
 *  - Esc = cancel / clear
 *  - Ctrl+Enter on row = add and move focus back to name field
 ────────────────────────────────────────────────────────────────────────── */
const BLANK_QUICK = { name: "", qty: 1, unit: "pcs", price: 0 };

function QuickAddRow({ products, onAdd }) {
  const [q, setQ]         = useState(BLANK_QUICK);
  const [justAdded, setJustAdded] = useState(false);
  const nameRef = useRef(null);

  const canAdd = q.name.trim().length > 0;

  const productOptions = useMemo(
    () => products.map(p => ({ v: p.name, l: `[${p.sku}] ${p.name}` })),
    [products]
  );
  const productMap = useMemo(
    () => new Map(products.map(p => [p.name, p])),
    [products]
  );

  const commit = useCallback(() => {
    if (!canAdd) return;
    onAdd(mkItem({
      id:        uid(),
      itemName:  q.name.trim(),
      qty:       Number(q.qty) || 1,
      unit:      q.unit,
      unitPrice: Number(q.price) || 0,
      status:    "pending",
    }));
    setQ(BLANK_QUICK);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 500);
    setTimeout(() => nameRef.current?.focus(), 0);
  }, [q, canAdd, onAdd]);

  return (
    <div className={`flex flex-col gap-1 px-3 py-2.5 border-t transition-colors duration-300 ${justAdded ? "bg-green-soft border-green-mid" : "bg-brand-soft/30 border-brand-mid"}`}>
      <div className={`text-[9px] uppercase font-extrabold mb-1 tracking-widest ${justAdded ? "text-green" : "text-brand"}`}>
        {justAdded ? "✓ ITEM DITAMBAHKAN" : "⚡ Quick Add — Tab through fields, Enter to add"}
      </div>
      <div className="flex items-center gap-2">
        {/* Product / Item Name */}
        <div className="flex-[2] relative">
          {products.length > 0 ? (
            // If there's a product catalog, show searchable picker
            <SearchInput
              placeholder="Item name or pick from catalog…"
              options={productOptions}
              onChange={(val) => {
                const prod = productMap.get(val);
                setQ(prev => ({
                  ...prev,
                  name:  val,
                  unit:  prod?.uom  || prev.unit,
                  price: prod?.unitPrice || prev.price,
                }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setQ(BLANK_QUICK);
              }}
            />
            ) : (
              <input
                ref={nameRef}
                value={q.name}
              onChange={e => setQ(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => {
                if (e.key === "Enter")  { commit(); }
                if (e.key === "Escape") { setQ(BLANK_QUICK); }
              }}
              placeholder="Item name…"
              autoFocus
              className="w-full border border-border-strong rounded-lg px-2.5 py-[7px] text-sm bg-white focus:outline-none focus:border-brand"
            />
          )}
        </div>

        {/* Qty */}
        <input
          type="number"
          min={0}
          value={q.qty}
          onChange={e => setQ(p => ({ ...p, qty: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setQ(BLANK_QUICK); }}
          className="w-[64px] border border-border-strong rounded-lg px-2.5 py-[7px] text-sm text-center bg-white focus:outline-none focus:border-brand"
          placeholder="Qty"
        />

        {/* Unit */}
        <select
          value={q.unit}
          onChange={e => setQ(p => ({ ...p, unit: e.target.value }))}
          className="w-[72px] border border-border-strong rounded-lg px-1.5 py-[7px] text-sm bg-white focus:outline-none focus:border-brand cursor-pointer"
        >
          {UOM_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        {/* Price */}
        <input
          type="number"
          min={0}
          value={q.price || ""}
          onChange={e => setQ(p => ({ ...p, price: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setQ(BLANK_QUICK); }}
          className="w-[120px] border border-border-strong rounded-lg px-2.5 py-[7px] text-sm text-right bg-white focus:outline-none focus:border-brand"
          placeholder="Harga (Rp)"
        />

        {/* Subtotal preview */}
        {canAdd && (
          <div className="text-[10px] font-bold text-brand font-mono whitespace-nowrap min-w-[90px] text-right">
            = {fmt((Number(q.qty) || 0) * (Number(q.price) || 0))}
          </div>
        )}

        {/* Add button */}
        <Btn
          variant="primary"
          size="sm"
          className="!px-4 shrink-0"
          disabled={!canAdd}
          onClick={commit}
        >
          <Ico d={IC.plus} size={12} /> Add
        </Btn>
      </div>
    </div>
  );
}

/* ─── Clone Helper ──────────────────────────────────────────────────────── */
function cloneItem(item) {
  return mkItem({ ...item, id: uid(), doNos: [], deliveryDate: "", invoiceNo: "", status: "pending" });
}

/**
 * POForm — create or edit a PO header + its line items.
 * Includes Quick-Add inline row, Clone, and Save-&-Add-Another.
 */
export function POForm({ initial, companies, items, suppliers, dos, zoneTypes, settings, hsDB = [], onSave, onClose, onAddSupplier }) {
  const products = usePOStore(s => s.products);

  const blank = {
    id: "", quoteRef: "", orderNo: "", company: "", orderDate: today(),
    prNo: "", notes: "", folder: "", status: "confirmed", priority: "normal",
    totalLocked: false, manualExPPN: 0, manualPPN: 0, zoneType: "",
  };
  const [f, setF] = useState(initial || blank);
  const [draftItems, setDraftItems] = useState(() =>
    initial?.id ? items.filter((i) => i.poId === initial.id) : []
  );
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [addAnother, setAddAnother] = useState(false);
  const [addAnotherKey, setAddAnotherKey] = useState(0);

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  // Compute totals
  const rate = typeof settings?.ppnRate !== "undefined" ? Number(settings.ppnRate) : PPN_RATE;
  const tots = useMemo(() => {
    if (f.totalLocked) {
      const ex = Number(f.manualExPPN) || 0;
      const ppn = Number(f.manualPPN) || Math.round(ex * rate);
      return { exPPN: ex, ppn, total: ex + ppn };
    }
    const ex = draftItems.reduce((s, i) => s + itemNet(i), 0);
    return { exPPN: ex, ppn: Math.round(ex * rate), total: Math.round(ex * (1 + rate)) };
  }, [f, draftItems, rate]);

  const handleSave = useCallback(() => {
    if (!f.company.trim() || !f.orderDate) return;
    const newId = f.id || uid();
    onSave({ ...f, id: newId }, draftItems.map((i) => ({ ...i, poId: newId })));
  }, [f, draftItems, onSave]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // Handle item save from full ItemForm — supports "save & add another"
  const handleItemSave = (item) => {
    if (editItem) {
      setDraftItems((p) => p.map((x) => (x.id === item.id ? item : x)));
      setEditItem(null);
    } else {
      setDraftItems((p) => [...p, item]);
      if (addAnother) {
        // Increment key to unmount/remount ItemForm with fresh state, modal stays open
        setAddAnotherKey((k) => k + 1);
      } else {
        setShowAddItem(false);
      }
    }
  };

  return (
    <Modal open onClose={onClose} title={initial?.id ? `Edit PO – ${initial.orderNo}` : "Tambah PO Baru"} xwide>
      <FGrid cols={2}>
        <Divider label="Informasi PO" />
        <FF label="No. PO / Order" required>
          <FIn value={f.orderNo} onChange={set("orderNo")} placeholder="PTAM/PO/NT/24/00001" autoFocus={!initial?.id} />
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
        <FF label="Zone (Default untuk semua item)">
          <FSel value={f.zoneType} onChange={set("zoneType")} options={(zoneTypes || []).map((z) => ({ v: z, l: z }))} placeholder="— Tidak ada —" />
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
            <input type="checkbox" checked={f.totalLocked} onChange={(e) => setF((p) => ({ ...p, totalLocked: e.target.checked }))} />
            <span>Kunci total manual (override kalkulasi otomatis dari item)</span>
          </label>
        </FF>
        {f.totalLocked && (
          <>
            <FF label="Total Ex PPN (Rp)">
              <NumInput value={f.manualExPPN || 0} onChange={set("manualExPPN")} min={0} />
            </FF>
            <FF label={`PPN (Rp) · ${(rate * 100).toFixed(0)}% = ${fmt(Math.round((f.manualExPPN || 0) * rate))}`}>
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

      {/* ── Item List ─────────────────────────────────────────────────────── */}
      <div className="mt-4 border border-border-default rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center py-2.5 px-3.5 bg-surface-alt border-b border-border-default">
          <span className="text-xs font-bold text-text-primary">
            Items ({draftItems.length})
            {draftItems.length > 0 && (
              <span className="ml-2 font-mono text-[10px] text-brand font-normal">
                subtotal: {fmt(tots.exPPN)}
              </span>
            )}
          </span>
          <Btn size="sm" variant="ghost" onClick={() => { setAddAnother(false); setShowAddItem(true); }}>
            <Ico d={IC.list} size={11} /> Full Form
          </Btn>
        </div>

        {/* Item rows */}
        {!draftItems.length && (
          <div className="py-4 text-center text-text-muted text-xs">
            Belum ada item. Gunakan Quick Add di bawah atau Full Form.
          </div>
        )}

        {draftItems.map((item, i) => {
          const main = (item.supplierAssignments || []).find((a) => a.role === "main");
          const net  = itemNet(item);
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 py-2 px-3.5 ${i < draftItems.length - 1 ? "border-b border-border-default" : ""} ${i % 2 === 0 ? "bg-white" : "bg-surface-alt"} group hover:bg-brand-soft/20 transition-colors`}
            >
              {/* Index number */}
              <div className="text-[10px] font-bold text-text-muted w-5 shrink-0 text-center">{i + 1}</div>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate text-text-primary">{item.itemName}</div>
                <div className="text-[10px] text-text-secondary mt-0.5 flex gap-2">
                  <span>{item.qty} {item.unit}</span>
                  <span className="font-mono font-bold text-brand">{fmt(net)}</span>
                  {main ? <span className="text-text-muted">Beli: {fmt(itemBuy(item))}</span> : null}
                </div>
              </div>

              {/* Status */}
              <SBadge status={item.status} cfg={ITEM_STATUS} />

              {/* Hover actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Clone item */}
                <Btn size="sm" variant="ghost" title="Clone item" className="!p-1.5"
                  onClick={() => setDraftItems((p) => {
                    const idx = p.findIndex(x => x.id === item.id);
                    const cloned = cloneItem(item);
                    const next = [...p];
                    next.splice(idx + 1, 0, cloned);
                    return next;
                  })}
                >
                  <Ico d={IC.copy} size={11} />
                </Btn>
                {/* Edit */}
                <Btn size="sm" variant="ghost" className="!p-1.5" onClick={() => setEditItem(item)}>
                  <Ico d={IC.edit} size={11} />
                </Btn>
                {/* Delete */}
                <Btn size="sm" variant="danger" className="!p-1.5"
                  onClick={() => setDraftItems((p) => p.filter((x) => x.id !== item.id))}
                >
                  <Ico d={IC.trash} size={11} />
                </Btn>
              </div>
            </div>
          );
        })}

        {/* ── Quick Add Row ── */}
        <QuickAddRow
          products={products || []}
          onAdd={(item) => setDraftItems((p) => [...p, item])}
        />
      </div>

      {/* ── Modals ── */}
      {showAddItem && (
        <Modal open onClose={() => setShowAddItem(false)} title="Tambah Item" wide>
          <div className="pb-2 border-b border-border-default mb-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={addAnother}
                onChange={e => setAddAnother(e.target.checked)}
              />
              Save & Add Another
            </label>
          </div>
          <ItemForm
            key={addAnotherKey}
            poId={f.id || "draft"}
            zoneTypes={zoneTypes}
            suppliers={suppliers}
            dos={dos}
            hsDB={hsDB}
            onAddSupplier={onAddSupplier}
            onSave={handleItemSave}
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
            onSave={handleItemSave}
            onClose={() => setEditItem(null)}
          />
        </Modal>
      )}

      {/* ── Footer ── */}
      <div className="flex justify-between items-center gap-2 pt-4 mt-4 border-t border-border-default">
        <div className="text-[10px] text-text-muted">
          {draftItems.length > 0
            ? `${draftItems.length} item · Total: ${fmt(tots.total)} inc PPN`
            : "Ctrl+Enter to save"}
        </div>
        <div className="flex gap-2">
          <Btn onClick={onClose} variant="secondary">Batal</Btn>
          <Btn onClick={handleSave} disabled={!f.company || !f.orderDate}>
            <Ico d={IC.save} size={12} /> Simpan PO
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
