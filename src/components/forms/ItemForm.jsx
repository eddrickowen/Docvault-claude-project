import { useState, useEffect, useCallback, useMemo } from "react";
import { Accordion, Btn, Ico, IC, FGrid, FF, FIn, FTa, FSel, NumInput, Divider, SearchInput } from "../ui";
import { SmartDate } from "../shared";
import { HSCodeInput } from "../shared";
import { SupplierAssignments } from "./SupplierAssignments";
import {
  uid, today, getQtyDel, fmt, itemNet, itemBuy,
} from "../../lib/helpers";
import { UOM_OPTIONS, ITEM_STATUS, mkItem } from "../../lib/constants";
import { usePOStore } from "../../store/usePOStore";

/**
 * ItemForm — create or edit a PO line item.
 * Uses Accordion sections for Detail, Price, Supplier, Delivery.
 */
export function ItemForm({ initial, poId, zoneTypes, suppliers, dos, hsDB = [], onSave, onClose, onAddSupplier }) {
  const products = usePOStore(s => s.products);
  const productOptions = useMemo(
    () => products.map(p => ({ v: p.id, l: `[${p.sku}] ${p.name}` })),
    [products]
  );
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const [f, setF] = useState(() => ({
    ...mkItem(),
    ...initial,
    supplierAssignments: initial?.supplierAssignments || [],
    doNos: initial?.doNos || [],
  }));

  const set = useCallback((k) => (v) => setF((p) => {
    const n = { ...p, [k]: v };
    if (k === "qty" || k === "unitPrice") {
      const g = (Number(k === "qty" ? v : p.qty) || 0) * (Number(k === "unitPrice" ? v : p.unitPrice) || 0);
      if (p.discountPct > 0) n.discount = Math.round(g * p.discountPct / 100);
    }
    if (k === "discount") {
      const g = (Number(p.qty) || 0) * (Number(p.unitPrice) || 0);
      n.discountPct = g > 0 ? +((parseFloat(v) || 0) / g * 100).toFixed(2) : 0;
    }
    if (k === "discountPct") {
      const g = (Number(p.qty) || 0) * (Number(p.unitPrice) || 0);
      n.discount = Math.round(g * (parseFloat(v) || 0) / 100);
    }
    if (k === "netTarget") {
      const netWant = parseFloat(v) || 0;
      const disc = Number(p.discount) || 0;
      const qty = Math.max(Number(p.qty) || 1, 1);
      const newUP = Math.ceil((netWant + disc) / qty);
      n.unitPrice = newUP;
      n.discount = Math.max(0, newUP * qty - netWant);
      n.discountPct = newUP * qty > 0 ? +((n.discount / (newUP * qty)) * 100).toFixed(2) : 0;
    }
    return n;
  }), []);

  const gross = (Number(f.qty) || 0) * (Number(f.unitPrice) || 0);
  const net = Math.max(0, gross - (Number(f.discount) || 0));
  const mainA = (f.supplierAssignments || []).find((a) => a.role === "main");
  const buyPU = mainA
    ? (mainA.pricePerUnit || 0) + (mainA.shippingTotal || 0) / Math.max(Number(f.qty) || 1, 1)
    : 0;
  const mgPU = (Number(f.unitPrice) || 0) - (Number(f.discount) || 0) / Math.max(Number(f.qty) || 1, 1) - buyPU;
  const qDel = f.id ? getQtyDel(f.id, dos || []) : 0;
  const supWarn = !(f.supplierAssignments || []).length;
  const needsDelivery = ["delivered", "invoiced", "paid"].includes(f.status);
  const delWarn = needsDelivery && !f.deliveryDate;
  const canSave = f.itemName.trim() && !delWarn;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        if (canSave) {
          e.preventDefault();
          onSave({ ...f, id: f.id || uid(), poId });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [f, canSave, poId, onSave]);

  return (
    <div>
      {/* Detail Item */}
      <Accordion title="Detail Item" icon={IC.box} defaultOpen warning={!f.itemName.trim()}>
        <FGrid cols={2}>
          <FF label="Pilih dari Master Produk" span={2}>
            <SearchInput
              autoFocus
              placeholder="Cari SKU atau Nama Produk..."
              options={productOptions}
              onChange={(productId) => {
                const prod = productMap.get(productId);
                if (!prod) return;
                setF(prev => ({
                  ...prev,
                  itemName: prod.name,
                  unitPrice: prod.unitPrice || prev.unitPrice,
                  unit: prod.uom || prev.unit,
                  desc: prod.desc || prev.desc,
                }));
              }}
            />
          </FF>
          <FF label="Nama Item" span={2} required>
            <FIn value={f.itemName} onChange={set("itemName")} placeholder="Nama item / part number" />
          </FF>
          <FF label="Qty">
            <NumInput value={f.qty} onChange={set("qty")} min={0} />
          </FF>
          <FF label="Unit">
            <FSel value={f.unit} onChange={set("unit")} options={UOM_OPTIONS} />
          </FF>
          <FF label="Harga Jual /Unit (Rp)">
            <NumInput 
              value={f.unitPrice} 
              onChange={set("unitPrice")} 
              min={0} 
              onKeyDown={(e) => e.key === "Enter" && canSave && onSave({ ...f, id: f.id || uid(), poId })} 
            />
          </FF>
          <FF label="Zone Type">
            <FSel value={f.zoneType} onChange={set("zoneType")} options={zoneTypes.map((z) => ({ v: z, l: z }))} />
          </FF>
          <Divider label="Info Tambahan (Optional)" />
          <FF label="Deskripsi" span={2}>
            <FTa value={f.desc} onChange={set("desc")} rows={2} placeholder="Keterangan..." />
          </FF>
          <FF label="HS Code">
            <HSCodeInput value={f.hsCode || ""} onChange={set("hsCode")} hsDB={hsDB} />
          </FF>
          <FF label="Net Total (Rp)" hint="override">
            <NumInput value={net} onChange={set("netTarget")} min={0} />
          </FF>
          <FF label="Keterangan / Notes" span={2}>
            <FTa value={f.notes} onChange={set("notes")} rows={2} placeholder="Catatan internal..." />
          </FF>
        </FGrid>
      </Accordion>

      {/* Harga & Diskon (Disederhanakan karena input utama sudah di atas) */}
      <Accordion title="Diskon & Margin" icon={IC.stats}>
        <FGrid cols={2}>
          <FF label="Discount (Rp)">
            <NumInput value={f.discount || 0} onChange={set("discount")} min={0} />
          </FF>
          <FF label="Discount (%)">
            <NumInput value={f.discountPct || 0} onChange={set("discountPct")} min={0} max={100} />
          </FF>
          <FF label="Gross">
            <FIn value={fmt(gross)} readOnly style={{ color: "var(--color-text-muted)" }} />
          </FF>
          <FF label="Net Ex PPN">
            <FIn value={fmt(net)} readOnly style={{ fontWeight: 700, color: "var(--color-brand)" }} />
          </FF>
          {buyPU > 0 && (
            <>
              <FF label="Harga Beli /Unit (Supplier Utama)">
                <FIn value={fmt(buyPU)} readOnly style={{ color: "var(--color-orange)" }} />
              </FF>
              <FF label={
                <span className="flex items-center gap-1">
                  Margin /Unit
                  {mgPU < 0 && <Ico d={IC.warn} size={11} color="var(--color-red)" />}
                </span>
              }>
                <FIn
                  value={fmt(mgPU)}
                  readOnly
                  style={{ fontWeight: 700, color: mgPU >= 0 ? "var(--color-green)" : "var(--color-red)" }}
                />
              </FF>
            </>
          )}
        </FGrid>
      </Accordion>

      {/* Supplier */}
      <Accordion
        title="Supplier"
        icon={IC.users}
        defaultOpen={!!(f.supplierAssignments || []).length}
        badge={(f.supplierAssignments || []).length || undefined}
        warning={supWarn}
      >
        <SupplierAssignments
          assignments={f.supplierAssignments || []}
          qty={f.qty || 1}
          onChange={(v) => setF((p) => ({ ...p, supplierAssignments: v }))}
          suppliers={suppliers}
          onAddSupplier={onAddSupplier}
        />
      </Accordion>

      {/* Pengiriman & Tracking */}
      <Accordion title="Pengiriman & Tracking" icon={IC.truck} defaultOpen={needsDelivery} forceOpen={delWarn} warning={delWarn}>
        <FGrid cols={2}>
          <FF label="Status Item">
            <FSel
              value={f.status}
              onChange={set("status")}
              options={Object.entries(ITEM_STATUS).map(([k, v]) => ({ v: k, l: v.label }))}
            />
          </FF>
          <FF label={
            <span className="flex items-center gap-1">
              Tgl Delivery
              {delWarn && <span className="text-red text-[10px]">⚠ Isi!</span>}
            </span>
          }>
            <SmartDate
              value={f.deliveryDate}
              onChange={set("deliveryDate")}
              className={delWarn ? "border-red" : ""}
            />
          </FF>
          <FF label="No. Invoice" span={2}>
            <FIn value={f.invoiceNo || ""} onChange={set("invoiceNo")} placeholder="INV/XXX/2024/001" />
          </FF>
          {qDel > 0 && (
            <FF label="Qty Terkirim (via DO)" span={2}>
              <div className="flex items-center gap-3 py-2 px-3 bg-green-soft rounded-md border border-green-mid">
                <span className="text-[13px] font-bold text-green">{qDel} / {f.qty || 0} {f.unit}</span>
                <span className="text-[11px] text-text-secondary">
                  terkirim · sisa {Math.max(0, (f.qty || 0) - qDel)} {f.unit}
                </span>
              </div>
            </FF>
          )}
          {(f.doNos || []).length > 0 && (
            <FF label="DO Numbers" span={2}>
              <div className="flex flex-wrap gap-1">
                {f.doNos.map((d) => (
                  <span key={d} className="text-[10px] font-mono bg-brand-soft border border-brand-mid rounded px-[7px] py-px text-brand">
                    {d}
                  </span>
                ))}
              </div>
            </FF>
          )}
        </FGrid>
      </Accordion>

      {delWarn && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] text-xs font-semibold">
          <Ico d={IC.warn} size={13} color="#c2410c" />
          Status <b>{f.status}</b> wajib mengisi Tanggal Delivery sebelum menyimpan.
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2.5">
        {onClose && <Btn onClick={onClose} variant="secondary">Batal</Btn>}
        <Btn
          onClick={() => canSave && onSave({ ...f, id: f.id || uid(), poId })}
          disabled={!canSave}
        >
          <Ico d={IC.save} size={12} /> Simpan Item
        </Btn>
      </div>
    </div>
  );
}
