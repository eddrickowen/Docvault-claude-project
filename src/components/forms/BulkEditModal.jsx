import { useState } from "react";
import { Modal, Btn, Ico, IC, FGrid, FF, FSel, FIn } from "../ui";
import { SmartDate } from "../shared";
import { BulkSupplierAssignments } from "./BulkSupplierAssignments";

export function BulkEditModal({ items, zoneTypes, suppliers, onAddSupplier, onClose, onSave }) {
  const [flags, setFlags] = useState({
    zoneType: false,
    deliveryDate: false,
    invoiceNo: false,
    doNo: false,
    suppliers: false,
  });

  const [form, setForm] = useState({
    zoneType: "",
    deliveryDate: "",
    invoiceNo: "",
    doNo: "",
    supplierAssignments: [],
  });

  const toggle = (k) => setFlags(p => ({ ...p, [k]: !p[k] }));
  const setV = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    // Only pass along fields that were checked
    const payload = {};
    if (flags.zoneType) payload.zoneType = form.zoneType;
    if (flags.deliveryDate) payload.deliveryDate = form.deliveryDate;
    if (flags.invoiceNo) payload.invoiceNo = form.invoiceNo;
    if (flags.doNo) payload.doNo = form.doNo;
    if (flags.suppliers) payload.supplierAssignments = form.supplierAssignments;

    onSave(payload);
  };

  const hasAny = Object.values(flags).some(Boolean);

  return (
    <Modal open onClose={onClose} title={`Bulk Edit (${items.length} items)`} wide>
      <div className="flex flex-col gap-4">
        <div className="bg-brand-soft border border-brand-mid rounded-[6px] p-2.5 text-[11px] text-brand font-semibold flex items-start gap-2">
          <Ico d={IC.warn} size={14} className="shrink-0 mt-0.5" />
          <span>Centang field yang ingin diubah masal. Field yang tidak dicentang akan diabaikan (data lama tetap aman).</span>
        </div>

        <FGrid cols={1} gap={3}>
          {/* Zone Type */}
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={flags.zoneType} onChange={() => toggle("zoneType")} className="mt-6 cursor-pointer" />
            <div className="flex-1">
              <FF label="Zone Type">
                <FSel 
                  value={form.zoneType} 
                  onChange={(v) => { setV("zoneType", v); setFlags(p => ({...p, zoneType: true})); }}
                  options={zoneTypes.map((z) => ({ v: z, l: z }))} 
                  placeholder="-- Pilih Zone --"
                  disabled={!flags.zoneType}
                />
              </FF>
            </div>
          </div>

          {/* Delivery Date */}
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={flags.deliveryDate} onChange={() => toggle("deliveryDate")} className="mt-6 cursor-pointer" />
            <div className="flex-1">
              <FF label="Tanggal Delivery">
                <SmartDate 
                  value={form.deliveryDate} 
                  onChange={(v) => { setV("deliveryDate", v); setFlags(p => ({...p, deliveryDate: true})); }}
                  disabled={!flags.deliveryDate}
                />
              </FF>
            </div>
          </div>

          {/* Invoice No */}
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={flags.invoiceNo} onChange={() => toggle("invoiceNo")} className="mt-6 cursor-pointer" />
            <div className="flex-1">
              <FF label="No. Invoice">
                <FIn 
                  value={form.invoiceNo} 
                  onChange={(v) => { setV("invoiceNo", v); setFlags(p => ({...p, invoiceNo: true})); }}
                  placeholder="INV/..."
                  disabled={!flags.invoiceNo}
                />
              </FF>
            </div>
          </div>

          {/* DO Number */}
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={flags.doNo} onChange={() => toggle("doNo")} className="mt-6 cursor-pointer" />
            <div className="flex-1">
              <FF label="No. DO (Ditambahkan / Append)" hint="DO lama tidak akan dihapus">
                <FIn 
                  value={form.doNo} 
                  onChange={(v) => { setV("doNo", v); setFlags(p => ({...p, doNo: true})); }}
                  placeholder="DO/..."
                  disabled={!flags.doNo}
                />
              </FF>
            </div>
          </div>

          {/* Suppliers */}
          <div className="flex items-start gap-3 border-t border-border-default pt-4 mt-1">
            <input type="checkbox" checked={flags.suppliers} onChange={() => toggle("suppliers")} className="mt-1 cursor-pointer" />
            <div className="flex-1">
              <span className="text-[11px] font-bold text-text-secondary block mb-3">Supplier Assignments (Override/Append Total)</span>
              {flags.suppliers ? (
                <BulkSupplierAssignments
                  assignments={form.supplierAssignments}
                  items={items}
                  onChange={(v) => setV("supplierAssignments", v)}
                  suppliers={suppliers}
                  onAddSupplier={onAddSupplier}
                />
              ) : (
                <div className="text-[11px] text-text-muted italic bg-surface-alt p-3 rounded-md border border-border-default" onClick={() => toggle("suppliers")}>
                  Centang box di kiri untuk menimpa atau menambah assignment supplier pada {items.length} item ini.
                </div>
              )}
            </div>
          </div>
        </FGrid>

        <div className="flex justify-end gap-2 pt-3 border-t border-border-default mt-2">
          <Btn onClick={onClose} variant="secondary">Batal</Btn>
          <Btn disabled={!hasAny} onClick={handleSubmit} variant="blue">
            <Ico d={IC.save} size={12} /> Terapkan Massal
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
