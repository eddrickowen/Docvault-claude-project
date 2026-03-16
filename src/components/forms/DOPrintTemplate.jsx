/**
 * DOPrintTemplate — Print-ready Surat Jalan layout.
 * Format: Continuous Form Half-Page (9.5" × 5.5" / ~241mm × 140mm).
 * Rendered hidden in DOM; shown via @media print when id="pa".
 * Replaces window.document.write approach.
import { fmtDate } from "../../lib/helpers";
import { createPortal } from "react-dom";

/* ── Class constants ── */
const printHdr  = "text-[8px] font-bold text-[#9ca3af] uppercase tracking-[.06em] mb-[5px]";
const printCell = "py-[5px] px-[6px] text-[9px] border-b border-[#e5e7eb]";
const printTh   = "py-[5px] px-[6px] text-[8px] font-bold bg-[#f3f4f6] uppercase tracking-[.05em] border-b-2 border-[#d1d5db] text-left";
const sigBox    = "text-center";

export function DOPrintTemplate({ doData, po, items, vendorName, vendorAddr, vendorContact }) {
  if (!doData || !po) return null;

  const sel = doData.lines ?? [];
  const fields = Object.entries(doData.fieldValues ?? {}).filter(([, v]) => v);

  return createPortal(
    /* id="pa" makes it visible during print via index.css */
    <div
      id="pa"
      className="hidden print:block bg-white text-[#111]"
      style={{ fontFamily: "Arial, sans-serif", width: "100%", padding: "10mm 12mm 8mm", margin: "0 auto" }}
    >
      {/* ── Header ── */}
      <div className="flex justify-between items-start pb-[10px] mb-[12px] border-b-[3px] border-[#1e3a5f]">
        <div>
          <div className="text-[16px] font-black text-[#1e3a5f]">{vendorName || "PT. API DISTRIBUSI INDONESIA"}</div>
          {vendorAddr    && <div className="text-[9px] text-[#6b7280] mt-[2px]">{vendorAddr}</div>}
          {vendorContact && <div className="text-[9px] text-[#6b7280]">{vendorContact}</div>}
        </div>
        <div className="text-right">
          <div className="text-[15px] font-black text-[#1e3a5f] tracking-[.05em]">SURAT JALAN</div>
          <div className="text-[12px] font-bold font-mono text-[#374151] mt-[2px]">{doData.doNo}</div>
          <div className="text-[9px] text-[#6b7280] mt-[2px]">Tgl: {fmtDate(doData.deliveryDate)}</div>
        </div>
      </div>

      {/* ── Recipient + fields ── */}
      <div className="grid grid-cols-2 gap-[10px] mb-[12px]">
        <div className="bg-[#f9fafb] rounded-[5px] p-[9px_11px] border border-[#e5e7eb]">
          <div className={printHdr}>Kepada</div>
          <div className="text-[11px] font-bold">{po.company}</div>
          <div className="text-[9px] text-[#6b7280] mt-[2px]">Ref PO: {po.orderNo}</div>
        </div>
        {fields.length > 0 && (
          <div className="bg-[#f9fafb] rounded-[5px] p-[9px_11px] border border-[#e5e7eb]">
            <table className="w-full border-collapse">
              <tbody>
                {fields.map(([key, val]) => (
                  <tr key={key}>
                    <td className="text-[8px] text-[#6b7280] py-[2px] w-[70px] capitalize">{key.replace(/([A-Z])/g, " $1")}</td>
                    <td className="text-[8px] py-[2px] px-[3px]">:</td>
                    <td className="text-[9px] font-semibold">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Items table ── */}
      <table className="w-full border-collapse mb-[10px]">
        <thead>
          <tr>
            {["No.", "Nama Barang", "Keterangan", "HS Code", "Qty", "Satuan", "Catatan"].map((h) => (
              <th key={h} className={printTh}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sel.map((line, idx) => {
            const item = items.find((i) => i.id === line.itemId);
            const rowBg = idx % 2 === 0 ? "#fff" : "#f9fafb";
            return (
              <tr key={line.itemId} style={{ background: rowBg }}>
                <td className={`${printCell} text-center`}>{idx + 1}</td>
                <td className={`${printCell} font-semibold`}>{item?.itemName}</td>
                <td className={`${printCell} text-[#6b7280]`}>{item?.desc || "–"}</td>
                <td className={`${printCell} font-mono`}>{line.hsCode || "–"}</td>
                <td className={`${printCell} font-bold text-center`}>{line.qtyDelivered}</td>
                <td className={printCell}>{item?.unit}</td>
                <td className={`${printCell} text-[#6b7280]`}>{line.notes || "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Remarks ── */}
      {doData.fieldValues?.remarks && (
        <div className="bg-[#fffbeb] rounded-[5px] p-[7px_10px] border border-[#fde68a] text-[9px] text-[#92400e] mb-[12px]">
          <strong>Keterangan:</strong> {doData.fieldValues.remarks}
        </div>
      )}

      {/* ── Signature blocks ── */}
      <div className="grid grid-cols-4 gap-[12px] mt-[20px]">
        {["Pengirim", "Pengemudi", "Penerima", "Mengetahui"].map((l) => (
          <div key={l} className={sigBox}>
            <div className="border-b border-[#9ca3af] h-[36px] mb-[5px]" />
            <div className="text-[8px] text-[#6b7280] font-bold">{l}</div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="mt-[10px] pt-[7px] border-t border-[#e5e7eb] text-[7px] text-[#9ca3af] text-center">
        Dicetak · {doData.doNo} · {new Date().toLocaleString("id-ID")}
      </div>
    </div>,
    document.body
  );
}
