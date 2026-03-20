import { useState } from "react";
import { createPortal } from "react-dom";
import { Modal, Btn, Ico, IC, FF, FIn, FTa } from "../ui";
import { SmartDate, HSCodeInput } from "../shared";
import { NumInput } from "../ui";
import {
  uid, today, getQtyDel, getQtyRem, fmtDate, formatDO, nextDOSeq,
} from "../../lib/helpers";
import { DEFAULT_DO_FIELDS } from "../../lib/constants";
import { DOPrintTemplate } from "./DOPrintTemplate";
import { usePOStore } from "../../store/usePOStore";

const thCls = "p-[8px] text-[11px] font-bold bg-surface-alt uppercase tracking-[.05em] border-b-2 border-border-strong text-left whitespace-nowrap";
const tdCls = "p-[7px_8px] text-[13px] border-b border-border-default";

/**
 * DOGeneratorModal — generate a Surat Jalan (Delivery Order) for a PO.
 * Includes a print-ready layout rendered off-screen.
 */
export function DOGeneratorModal({ po, preSelect = new Set(), items, dos, settings, onClose, onSaveDO }) {
  const { settings: storeSettings } = usePOStore();
  const poItems = items.filter((i) => i.poId === po.id);
  const fields = (settings.doFields || DEFAULT_DO_FIELDS).filter((f) => f.enabled);

  const [form, setForm] = useState({
    doNo: formatDO(nextSeq(dos, "doNo")),
    deliveryDate: today(),
    fieldValues: Object.fromEntries(fields.map((f) => [f.key, ""])),
  });

  const [lines, setLines] = useState(() =>
    poItems.map((i) => {
      const isSelected = preSelect.size > 0 ? preSelect.has(i.id) : getQtyRem(i, dos) > 0;
      return {
        itemId: i.id,
        selected: isSelected,
        qtyDelivered: isSelected ? getQtyRem(i, dos) : 0,
        hsCode: i.hsCode || "",
        notes: "",
      };
    })
  );

  const setFV = (k) => (v) => setForm((p) => ({ ...p, fieldValues: { ...p.fieldValues, [k]: v } }));
  const setLine = (id, p) => setLines((prev) => prev.map((l) => (l.itemId === id ? { ...l, ...p } : l)));
  const sel = lines.filter((l) => l.selected && l.qtyDelivered > 0);

  const buildDO = () => ({
    id: uid(),
    doNo: form.doNo,
    poId: po.id,
    createdAt: today(),
    deliveryDate: form.deliveryDate,
    fieldValues: form.fieldValues,
    lines: sel,
  });

  const handleSave = () => {
    if (!sel.length) return;
    onSaveDO(buildDO());
    onClose();
  };

  const [previewDO, setPreviewDO] = useState(null);

  const handlePrintSave = () => {
    if (!sel.length) return;
    const built = buildDO();
    onSaveDO(built);
    setPreviewDO(built);
  };

  return (
    <Modal open onClose={onClose} title="Buat Surat Jalan (DO)" xwide noPad>
      {/* Form area (hidden when printing) */}
      <div className="np p-[16px_20px] border-b border-border-default">
        <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))" }}>
          <FF label="No. Surat Jalan">
            <FIn
              value={form.doNo}
              onChange={(v) => setForm((p) => ({ ...p, doNo: v }))}
              style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-brand)" }}
            />
          </FF>
          <FF label="Tanggal Kirim">
            <SmartDate value={form.deliveryDate} onChange={(v) => setForm((p) => ({ ...p, deliveryDate: v }))} />
          </FF>
          {fields.map((f) => (
            <FF key={f.key} label={f.label}>
              {f.type === "textarea" ? (
                <FTa value={form.fieldValues[f.key] || ""} onChange={setFV(f.key)} rows={1} />
              ) : (
                <FIn value={form.fieldValues[f.key] || ""} onChange={setFV(f.key)} placeholder={f.label + "..."} />
              )}
            </FF>
          ))}
        </div>

        <div className="text-[11px] font-bold text-text-primary mb-2">
          Item yang Dikirim <span className="text-text-muted font-normal">({sel.length} dipilih)</span>
        </div>

        <div className="border border-border-default rounded-[7px] overflow-hidden mb-3.5">
          <table className="w-full border-collapse" style={{ minWidth: 850 }}>
            <thead>
              <tr>
                <th className={thCls} style={{ width: 36, position: "sticky", left: 0, background: "var(--color-surface-alt)", zIndex: 2, boxShadow: "3px 0 6px rgba(0,0,0,0.05)" }}>
                  <input
                    type="checkbox"
                    checked={lines.every((l) => l.selected)}
                    onChange={(e) => setLines((p) => p.map((l) => ({ ...l, selected: e.target.checked })))}
                  />
                </th>
                {["Item", "HS Code", "Qty PO", "Sdh Kirim", "Sisa", "Kirim Skrg", "Catatan"].map((h) => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {poItems.map((item, i) => {
                const line = lines.find((l) => l.itemId === item.id) || { selected: false, qtyDelivered: 0, hsCode: "", notes: "" };
                const qd = getQtyDel(item.id, dos);
                const qr = getQtyRem(item, dos);
                return (
                  <tr key={item.id} style={{ background: line.selected ? "#eff6ff" : i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td className={tdCls}>
                      <input type="checkbox" checked={line.selected} onChange={() => setLine(item.id, { selected: !line.selected })} />
                    </td>
                    <td className={`${tdCls} font-semibold truncate max-w-[160px]`} title={item.itemName}>{item.itemName}</td>
                    <td className={tdCls}>
                      <HSCodeInput
                        value={line.hsCode || ""}
                        onChange={(v) => setLine(item.id, { hsCode: v })}
                        placeholder={item.hsCode || "HS code..."}
                        className="text-[10px] py-1 px-[7px] w-[180px]"
                      />
                    </td>
                    <td className={`${tdCls} text-text-secondary`}>{item.qty} {item.unit}</td>
                    <td className={`${tdCls} font-${qd > 0 ? "bold" : "normal"}`} style={{ color: qd > 0 ? "var(--color-green)" : "var(--color-text-muted)" }}>{qd}</td>
                    <td className={`${tdCls} font-bold`} style={{ color: qr === 0 ? "var(--color-text-muted)" : "var(--color-brand)" }}>{qr}</td>
                    <td className={tdCls}>
                      <NumInput
                        value={line.qtyDelivered}
                        min={0}
                        max={item.qty}
                        onChange={(v) => setLine(item.id, { qtyDelivered: Math.min(item.qty, Math.max(0, v)) })}
                        style={{ width: 70, background: line.selected ? "#fff" : "var(--color-surface-alt)" }}
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        value={line.notes}
                        onChange={(e) => setLine(item.id, { notes: e.target.value })}
                        placeholder="Catatan..."
                        className="w-full bg-surface border border-border-strong rounded-[7px] px-[7px] py-1 text-[10px] text-text-primary outline-none focus:border-brand"
                        style={{ width: 110 }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <Btn onClick={onClose} variant="secondary">Batal</Btn>
          <Btn onClick={handleSave} disabled={!sel.length} variant="blue">
            <Ico d={IC.save} size={12} /> Simpan Saja
          </Btn>
          <Btn onClick={handlePrintSave} disabled={!sel.length}>
            <Ico d={IC.print} size={12} /> Simpan &amp; Preview Cetak
          </Btn>
        </div>
      </div>

      {previewDO && (
        <>
          <DOPrintTemplate
            doData={previewDO}
            po={po}
            items={items}
            vendorName={storeSettings.vendorName}
            vendorAddr={storeSettings.vendorAddr}
            vendorContact={storeSettings.vendorContact}
          />
          {createPortal(
            <Modal
              open
              onClose={() => setPreviewDO(null)}
              title={`Preview Surat Jalan ${previewDO.doNo}`}
              wide
            >
              <div className="text-[11px] text-text-muted mb-3">
                Preview layout akan ikut tercetak saat Anda membuka dialog print (Ctrl+P).
              </div>
              <div className="flex justify-end gap-2">
                <Btn variant="secondary" onClick={() => setPreviewDO(null)}>
                  Tutup Preview
                </Btn>
                <Btn
                  variant="blue"
                  onClick={() => {
                    window.print();
                  }}
                >
                  <Ico d={IC.print} size={12} /> Buka Dialog Print
                </Btn>
              </div>
            </Modal>,
            document.body
          )}
        </>
      )}
    </Modal>
  );
}
