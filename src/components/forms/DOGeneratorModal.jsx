import { useState } from "react";
import { createPortal } from "react-dom";
import { Modal, Btn, Ico, IC, FF, FIn, FTa } from "../ui";
import { SmartDate, HSCodeInput } from "../shared";
import { NumInput } from "../ui";
import {
  uid, today, getQtyDel, getQtyRem, fmtDate, formatDO, nextDOSeq,
} from "../../lib/helpers";
import { DEFAULT_DO_FIELDS } from "../../lib/constants";

const thCls = "p-[8px] text-[11px] font-bold bg-surface-alt uppercase tracking-[.05em] border-b-2 border-border-strong text-left whitespace-nowrap";
const tdCls = "p-[7px_8px] text-[13px] border-b border-border-default";

/**
 * DOGeneratorModal — generate a Surat Jalan (Delivery Order) for a PO.
 * Includes a print-ready layout rendered off-screen.
 */
export function DOGeneratorModal({ po, preSelect = new Set(), items, dos, settings, onClose, onSaveDO }) {
  const poItems = items.filter((i) => i.poId === po.id);
  const fields = (settings.doFields || DEFAULT_DO_FIELDS).filter((f) => f.enabled);

  const [form, setForm] = useState({
    doNo: formatDO(settings.doFormat, nextDOSeq(dos)),
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
    id: "do" + uid(),
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

  const handlePrintSave = () => {
    if (!sel.length) return;
    onSaveDO(buildDO());
    setTimeout(() => window.print(), 200);
    setTimeout(() => onClose(), 300);
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
            <Ico d={IC.print} size={12} /> Simpan & Cetak
          </Btn>
        </div>
      </div>

      {/* PRINT AREA */}
      {createPortal(
        <div
          id="pa"
        style={{
          display: "none",
          background: "#fff",
          color: "#111",
          fontFamily: "Arial,sans-serif",
          padding: "18mm 16mm 12mm",
          minHeight: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 14, marginBottom: 16, borderBottom: "3px solid #1e3a5f" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1e3a5f" }}>{po.vendorName || "PT. API DISTRIBUSI INDONESIA"}</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{po.vendorAddr || ""}</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>{po.vendorContact || ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#1e3a5f", letterSpacing: ".05em" }}>SURAT JALAN</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: "#374151", marginTop: 2 }}>{form.doNo}</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Tgl: {fmtDate(form.deliveryDate)}</div>
          </div>
        </div>

        {/* Recipient + fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          <div style={{ background: "#f9fafb", borderRadius: 6, padding: "12px 14px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 5 }}>Kepada</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{po.company}</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>Ref PO: {po.orderNo}</div>
          </div>
          <div style={{ background: "#f9fafb", borderRadius: 6, padding: "12px 14px", border: "1px solid #e5e7eb" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {fields.filter((f) => form.fieldValues[f.key]).map((f) => (
                  <tr key={f.key}>
                    <td style={{ fontSize: 9, color: "#6b7280", padding: "2px 0", width: 65 }}>{f.label}</td>
                    <td style={{ fontSize: 9, padding: "2px 3px" }}>:</td>
                    <td style={{ fontSize: 10, fontWeight: 600 }}>{form.fieldValues[f.key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
          <thead>
            <tr>
              {["No.", "Nama Barang", "Keterangan", "HS Code", "Qty", "Satuan", "Catatan"].map((h) => (
                <th key={h} style={{ padding: "7px 8px", fontSize: 9, fontWeight: 700, background: "#f3f4f6", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "2px solid #d1d5db", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sel.map((line, idx) => {
              const item = items.find((i) => i.id === line.itemId);
              return (
                <tr key={line.itemId} style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ padding: "7px 8px", fontSize: 10, textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>{idx + 1}</td>
                  <td style={{ padding: "7px 8px", fontSize: 10, fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>{item?.itemName}</td>
                  <td style={{ padding: "7px 8px", fontSize: 9, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>{item?.desc || "–"}</td>
                  <td style={{ padding: "7px 8px", fontSize: 9, fontFamily: "monospace", borderBottom: "1px solid #e5e7eb" }}>{line.hsCode || "–"}</td>
                  <td style={{ padding: "7px 8px", fontSize: 12, fontWeight: 700, textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>{line.qtyDelivered}</td>
                  <td style={{ padding: "7px 8px", fontSize: 10, borderBottom: "1px solid #e5e7eb" }}>{item?.unit}</td>
                  <td style={{ padding: "7px 8px", fontSize: 9, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>{line.notes || "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {form.fieldValues?.remarks && (
          <div style={{ background: "#fffbeb", borderRadius: 6, padding: "9px 13px", border: "1px solid #fde68a", fontSize: 10, color: "#92400e", marginBottom: 16 }}>
            <strong>Keterangan:</strong> {form.fieldValues.remarks}
          </div>
        )}

        {/* Signature blocks */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginTop: 32 }}>
          {["Pengirim", "Pengemudi", "Penerima", "Mengetahui"].map((l) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #9ca3af", height: 44, marginBottom: 6 }} />
              <div style={{ fontSize: 9, color: "#6b7280", fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #e5e7eb", fontSize: 8, color: "#9ca3af", textAlign: "center" }}>
          Dicetak · {form.doNo} · {new Date().toLocaleString("id-ID")}
        </div>
      </div>,
      document.body
    )}
    </Modal>
  );
}
