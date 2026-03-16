import { useState } from "react";
import { Modal, Btn, Ico, IC, TagChip, FGrid, FF, FIn, FTa, Divider } from "../ui";
import { today } from "../../lib/helpers";
import { uid } from "../../lib/helpers";

/**
 * SupplierFormModal — create or edit a supplier record.
 */
export function SupplierFormModal({ initial, onSave, onClose }) {
  const blank = {
    id: "", name: "", contact: "", phone: "", email: "",
    address: "", tags: [], notes: "", createdAt: today(),
  };
  const [f, setF] = useState(initial || blank);
  const [ti, setTi] = useState("");

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const addTag = () => {
    const t = ti.trim().toLowerCase();
    if (t && !f.tags.includes(t)) {
      setF((p) => ({ ...p, tags: [...p.tags, t] }));
      setTi("");
    }
  };

  return (
    <Modal open onClose={onClose} title={initial?.id ? "Edit Supplier" : "Tambah Supplier"} wide>
      <FGrid cols={2}>
        <FF label="Nama Supplier" span={2} required>
          <FIn value={f.name} onChange={set("name")} placeholder="PT. Nama Supplier" />
        </FF>
        <FF label="Kontak">
          <FIn value={f.contact} onChange={set("contact")} placeholder="Nama PIC" />
        </FF>
        <FF label="Telepon">
          <FIn value={f.phone} onChange={set("phone")} placeholder="0812-3456-7890" />
        </FF>
        <FF label="Email">
          <FIn value={f.email} onChange={set("email")} placeholder="email@supplier.com" />
        </FF>
        <FF label="Alamat">
          <FIn value={f.address} onChange={set("address")} placeholder="Jl. Industri No.1" />
        </FF>
        <FF label="Catatan" span={2}>
          <FTa value={f.notes} onChange={set("notes")} rows={2} />
        </FF>
        <Divider label="Tags produk yang dijual" />
        <div className="col-span-2">
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
            {!f.tags.length && (
              <span className="text-[11px] text-text-muted italic">Belum ada tag.</span>
            )}
            {f.tags.map((t) => (
              <TagChip key={t} label={t} onRemove={() => setF((p) => ({ ...p, tags: p.tags.filter((x) => x !== t) }))} />
            ))}
          </div>
          <div className="flex gap-2">
            <FIn
              value={ti}
              onChange={setTi}
              placeholder="hydraulic, valve, pump..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            />
            <Btn size="sm" variant="blue" onClick={addTag}>
              <Ico d={IC.plus} size={11} /> Tag
            </Btn>
          </div>
        </div>
      </FGrid>
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border-default">
        <Btn onClick={onClose} variant="secondary">Batal</Btn>
        <Btn
          onClick={() => f.name.trim() && onSave({ ...f, id: f.id || ("SUP" + uid()) })}
          disabled={!f.name.trim()}
        >
          <Ico d={IC.save} size={12} /> Simpan
        </Btn>
      </div>
    </Modal>
  );
}
