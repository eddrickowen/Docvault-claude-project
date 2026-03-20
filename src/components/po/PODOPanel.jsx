/**
 * PODOPanel - Delivery Order detail panel for PO
 * Displays list of delivery orders with print and delete functionality
 */
import { useState } from "react";
import PropTypes from "prop-types";
import { Btn, Ico, IC, Modal } from "../ui";
import { DOPrintTemplate } from "../forms";
import { fmtDate } from "../../lib/helpers";
import { VENDOR_NAME } from "../../lib/constants";

const doThCls = "py-[5px] px-[10px] text-[9px] font-bold text-text-secondary text-left border-b border-border-default uppercase";

export function PODOPanel({ dos, poId, po, items, onDeleteDO }) {
  const poDos = (dos || []).filter((d) => d.poId === poId);
  const [printDO, setPrintDO] = useState(null);

  if (!poDos.length) {
    return <span className="text-[11px] text-text-muted">Belum ada DO</span>;
  }

  return (
    <>
      {printDO && (
        <>
          <DOPrintTemplate
            doData={printDO}
            po={po}
            items={items}
            vendorName={VENDOR_NAME}
          />
          <Modal
            open
            onClose={() => setPrintDO(null)}
            title={`Preview Surat Jalan ${printDO.doNo}`}
            wide
          >
            <div className="text-[11px] text-text-muted mb-3">
              Layout DO akan ikut tercetak ketika Anda membuka dialog print (Ctrl+P).
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setPrintDO(null)}>
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
          </Modal>
        </>
      )}
      <div className="flex flex-col gap-1.5">
        {poDos.map((d) => {
          const driver = d.fieldValues?.driverName;
          const plate  = d.fieldValues?.vehiclePlate;
          return (
            <div key={d.id} className="bg-surface border border-border-default rounded-[7px] overflow-hidden">
              <div className="flex items-center gap-2.5 py-2 px-3 bg-brand-soft border-b border-brand-mid">
                <Ico d={IC.truck} size={13} color="var(--color-brand)" />
                <span className="font-mono font-bold text-xs text-brand">{d.doNo}</span>
                <span className="text-[10px] text-text-secondary">Dibuat: {fmtDate(d.createdAt)}</span>
                {d.deliveryDate && d.deliveryDate !== d.createdAt && (
                  <span className="text-[10px] text-text-secondary">· Kirim: {fmtDate(d.deliveryDate)}</span>
                )}
                {driver && (
                  <span className="text-[10px] text-text-muted">🚗 {driver}{plate ? ` · ${plate}` : ""}</span>
                )}
                <div className="ml-auto flex gap-1.5">
                  <Btn size="sm" variant="blue" onClick={() => setPrintDO(d)}>
                    <Ico d={IC.print} size={10} /> Cetak
                  </Btn>
                  {onDeleteDO && (
                    <Btn size="sm" variant="danger" onClick={() => onDeleteDO(d.id)}>
                      <Ico d={IC.trash} size={10} /> Hapus
                    </Btn>
                  )}
                </div>
              </div>
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-alt">
                    {["Item", "Qty Kirim", "HS Code", "Catatan"].map((h) => (
                      <th key={h} className={doThCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(d.lines || []).map((line) => {
                    const item = items.find((i) => i.id === line.itemId);
                    return (
                      <tr key={line.itemId} className="border-b border-border-default">
                        <td className="py-1.5 px-[10px] text-[11px] font-semibold truncate max-w-[180px] hover:overflow-visible hover:whitespace-normal" title={item?.itemName || line.itemId}>
                          {item?.itemName || line.itemId}
                        </td>
                        <td className="py-1.5 px-[10px] text-[11px] font-mono font-bold text-brand">
                          {line.qtyDelivered} {item?.unit || ""}
                        </td>
                        <td className="py-1.5 px-[10px] text-[10px] font-mono text-text-secondary">
                          {line.hsCode || "–"}
                        </td>
                        <td className="py-1.5 px-[10px] text-[10px] text-text-muted truncate max-w-[120px] hover:overflow-visible hover:whitespace-normal" title={line.notes || ""}>
                          {line.notes || "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </>
  );
}

PODOPanel.propTypes = {
  dos: PropTypes.arrayOf(PropTypes.object).isRequired,
  poId: PropTypes.string.isRequired,
  po: PropTypes.object.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onDeleteDO: PropTypes.func
};
