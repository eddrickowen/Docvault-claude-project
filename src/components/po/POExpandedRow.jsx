/**
 * POExpandedRow - Expanded view of PO with items management
 * Shows PO items with bulk operations, editing, and DO management
 */
import { useState } from "react";
import PropTypes from "prop-types";
import { Btn, Ico, IC, Modal } from "../ui";
import { ItemTableRow } from "../shared";
import { ItemForm, SupplierFormModal, BulkEditModal } from "../forms";
import { PODOPanel } from "./PODOPanel";
import { usePOStore } from "../../store/usePOStore";
import { calcPOTotals, fmt, itemNet, itemMargin, copyTSV } from "../../lib/helpers";
import { ITEM_STATUS, DEFAULT_EXCEL_ITEM_COLS } from "../../lib/constants";
import { buildItemRowsByIds, getEnabledColumns } from "../../lib/exportHelpers";
import { mergeSupplierAssignments } from "../../lib/supplierHelpers";
import { stickyL, stickyR } from "../../lib/tableStyles";

const thCls   = "py-2 px-2 text-[11px] font-extrabold text-text-secondary text-left whitespace-nowrap border-b border-border-strong uppercase tracking-[.05em] bg-surface-alt cursor-pointer select-none sticky top-0 z-[10]";
const tdCls   = "py-2 px-2 border-b border-border-default text-[12px] align-middle";

export function POExpandedRow({
  po,
  items,
  suppliers,
  dos,
  zoneTypes,
  settings,
  hsDB = [],
  onUpdateItem,
  onUpdatePO,
  onAddItem,
  onOpenDO,
  onAddSupplier,
  onConfirmDelete,
  onDeleteDO
}) {
  const { toast } = usePOStore();
  const poItems = items.filter((i) => i.poId === po.id);
  const [showAdd, setShowAdd] = useState(false);
  const [showSupForm, setShowSupForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [doTab, setDoTab] = useState(false);
  const tots = calcPOTotals(po, items);
  const poDos = (dos || []).filter((d) => d.poId === po.id);
  const [bulkItems, setBulkItems] = useState(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  const toggleBulkItem = (id) => {
    const s = new Set(bulkItems);
    s.has(id) ? s.delete(id) : s.add(id);
    setBulkItems(s);
  };

  const handleBulkCopyItems = () => {
    const cols = getEnabledColumns(settings?.excelItemCols, DEFAULT_EXCEL_ITEM_COLS);
    const headers = cols.map(c => c.label);

    // Build poById map for this PO's items
    const poById = { [po.id]: po };
    const rows = buildItemRowsByIds(bulkItems, items, cols, poById);

    copyTSV(headers, rows, () => {
      toast(`✓ ${bulkItems.size} Item disalin!`);
      // Keeping items selected
    });
  };

  return (
    <div className="py-4 px-5 bg-[#fafcff] border-t border-border-default">
      {/* Summary bar */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="flex gap-3.5 text-[11px] text-text-secondary flex-wrap">
          <span>Ex PPN: <strong className="text-text-primary">{fmt(tots.exPPN)}</strong></span>
          <span>PPN: <strong className="text-text-primary">{fmt(tots.ppn)}</strong></span>
          <span>Total: <strong className="text-brand text-[13px]">{fmt(tots.total)}</strong></span>
          {po.folder && (
            <a
              href={po.folder}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-brand bg-brand-soft border border-brand-mid rounded-[5px] px-2 py-px no-underline font-semibold"
            >
              📁 Drive
            </a>
          )}
          <span className="text-[11px] text-text-muted">Zone:</span>
          <select
            value={po.zoneType || ""}
            onChange={(e) => {
              const v = e.target.value;
              onUpdatePO({ ...po, zoneType: v });
              poItems.forEach((item) => onUpdateItem({ ...item, zoneType: v }));
              toast(`✓ Zone "${v || "–"}" diterapkan ke ${poItems.length} item`);
            }}
            className="border border-border-default bg-surface rounded-[5px] text-[11px] px-2 py-0.5 font-semibold cursor-pointer focus:outline-none hover:border-brand-mid transition-colors"
          >
            <option value="">— Tidak ada —</option>
            {(zoneTypes || []).map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {bulkItems.size > 0 && (
            <>
              <select
                className="border border-border-default bg-surface rounded-[5px] text-xs px-2 py-1 font-semibold text-text-primary cursor-pointer hover:border-brand-mid transition-colors focus:outline-none"
                onChange={(e) => {
                  if (!e.target.value) return;
                  bulkItems.forEach(id => {
                    const i = items.find(x => x.id === id);
                    if (i) onUpdateItem({ ...i, status: e.target.value });
                  });
                  toast("✓ Status Item diupdate");
                  e.target.value = "";
                }}
              >
                <option value="">Ubah Status...</option>
                {Object.entries(ITEM_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <Btn size="sm" variant="blue" onClick={handleBulkCopyItems}>
                <Ico d={IC.copy} size={10} /> Copy {bulkItems.size} Item
              </Btn>
              <Btn size="sm" variant="blue" className="!px-3" onClick={() => setShowBulkEdit(true)}>
                <Ico d={IC.edit} size={11} /> Edit
              </Btn>
              <Btn
                size="sm"
                variant="danger"
                onClick={() => {
                  if (bulkItems.size > 0) {
                    onConfirmDelete([...bulkItems], () => setBulkItems(new Set()));
                  }
                }}
              >
                <Ico d={IC.trash} size={10} /> Hapus {bulkItems.size} Item
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setBulkItems(new Set())}>
                <Ico d={IC.close} size={10} />
              </Btn>
            </>
          )}
          <Btn size="sm" variant={doTab ? "blue" : "ghost"} onClick={() => setDoTab((v) => !v)}>
            <Ico d={IC.truck} size={11} color={doTab ? "var(--color-brand)" : "var(--color-text-secondary)"} /> DO ({poDos.length})
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => onOpenDO(po, bulkItems)}>
            <Ico d={IC.plus} size={11} /> Buat DO
          </Btn>
          <Btn size="sm" variant="blue" onClick={() => setShowAdd(true)}>
            <Ico d={IC.plus} size={11} /> Item
          </Btn>
        </div>
      </div>

      {doTab && (
        <div className="mb-3.5">
          <PODOPanel dos={dos} poId={po.id} po={po} items={items} onDeleteDO={onDeleteDO} />
        </div>
      )}

      {!poItems.length && (
        <div className="py-3.5 text-center text-text-muted text-xs bg-surface-alt rounded-md border border-dashed border-border-strong">
          Belum ada item.
        </div>
      )}

      {poItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className={`${thCls} w-8 ${stickyL} bg-surface-alt z-[2]`}>
                  <input
                    type="checkbox"
                    checked={poItems.length > 0 && poItems.every((i) => bulkItems.has(i.id))}
                    onChange={(e) => {
                      const s = new Set(bulkItems);
                      poItems.forEach((i) => e.target.checked ? s.add(i.id) : s.delete(i.id));
                      setBulkItems(s);
                    }}
                  />
                </th>
                <th className={thCls}>Item</th>
                <th className={thCls}>Qty/Unit</th>
                <th className={thCls}>Delivered</th>
                <th className={thCls}>Harga Jual</th>
                <th className={thCls}>Net</th>
                <th className={thCls}>Supplier Utama</th>
                <th className={thCls}>Margin</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Delivery</th>
                <th className={thCls}>Invoice</th>
                <th className={thCls}>Zone</th>
                <th className={thCls}>Aging</th>
                <th className={thCls}>Note</th>
                <th className={thCls}>DO</th>
                <th className={`${thCls} w-24 text-center ${stickyR} bg-surface-alt z-[2]`} />
              </tr>
            </thead>
            <tbody>
              {poItems.map((item, i) => (
                <ItemTableRow
                  key={item.id}
                  item={item}
                  po={po}
                  subIdx={i}
                  isSel={bulkItems.has(item.id)}
                  onToggleSel={() => toggleBulkItem(item.id)}
                  onUpdate={onUpdateItem}
                  onEdit={setEditItem}
                  onDelete={(it) => onConfirmDelete([it.id], () => {})}
                  suppliers={suppliers}
                  dos={dos}
                  zoneTypes={zoneTypes}
                  stickyL={stickyL}
                  stickyR={stickyR}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-brand-soft border-t border-brand-mid">
                <td colSpan={2} className={`${tdCls} font-bold text-[11px] text-text-secondary`}>TOTAL</td>
                <td className={`${tdCls} font-mono font-bold`}>
                  {poItems.reduce((s, i) => s + (Number(i.qty) || 0), 0)}
                </td>
                <td className={tdCls} />
                <td className={tdCls} />
                <td className={`${tdCls} font-mono font-bold text-brand`}>
                  {fmt(poItems.reduce((s, i) => s + itemNet(i), 0))}
                </td>
                <td className={tdCls} />
                <td className={`${tdCls} font-mono font-bold text-green`}>
                  {fmt(poItems.reduce((s, i) => {
                    const m = itemMargin(i);
                    return s + (m || 0);
                  }, 0))}
                </td>
                <td colSpan={8} className={tdCls} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <Modal open onClose={() => setShowAdd(false)} title="Tambah Item" wide>
          <ItemForm
            poId={po.id}
            zoneTypes={zoneTypes}
            suppliers={suppliers}
            dos={dos}
            hsDB={hsDB}
            onAddSupplier={onAddSupplier}
            onSave={(item) => {
              onAddItem(item);
              setShowAdd(false);
            }}
            onClose={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {editItem && (
        <Modal open onClose={() => setEditItem(null)} title="Edit Item" wide>
          <ItemForm
            initial={editItem}
            poId={po.id}
            zoneTypes={zoneTypes}
            suppliers={suppliers}
            dos={dos}
            hsDB={hsDB}
            onAddSupplier={onAddSupplier}
            onSave={(item) => {
              onUpdateItem(item);
              setEditItem(null);
            }}
            onClose={() => setEditItem(null)}
          />
        </Modal>
      )}

      {showSupForm && (
        <SupplierFormModal
          onSave={(s) => {
            onAddSupplier(s);
            setShowSupForm(false);
            toast("✓ Supplier ditambahkan");
          }}
          onClose={() => setShowSupForm(false)}
        />
      )}

      {showBulkEdit && (
        <BulkEditModal
          items={[...bulkItems].map(id => items.find(i => i.id === id)).filter(Boolean)}
          suppliers={suppliers}
          onAddSupplier={onAddSupplier}
          zoneTypes={zoneTypes.map(z => typeof z === 'object' ? z.name : z)}
          onClose={() => setShowBulkEdit(false)}
          onSave={(payload) => {
            [...bulkItems].forEach((id) => {
              const item = items.find((i) => i.id === id);
              if (!item) return;
              const n = { ...item };
              if ("zoneType" in payload) n.zoneType = payload.zoneType;
              if ("deliveryDate" in payload) n.deliveryDate = payload.deliveryDate;
              if ("invoiceNo" in payload) n.invoiceNo = payload.invoiceNo;
              if ("doNo" in payload) n.doNos = [...new Set([...(n.doNos || []), payload.doNo])];
              if ("supplierAssignments" in payload) {
                n.supplierAssignments = mergeSupplierAssignments(
                  n.supplierAssignments,
                  payload.supplierAssignments,
                  id
                );
              }
              onUpdateItem(n);
            });
            setShowBulkEdit(false);
            toast(`✓ Update massal diterapkan ke ${bulkItems.size} item`);
          }}
        />
      )}
    </div>
  );
}

POExpandedRow.propTypes = {
  po: PropTypes.object.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  suppliers: PropTypes.arrayOf(PropTypes.object).isRequired,
  dos: PropTypes.arrayOf(PropTypes.object).isRequired,
  zoneTypes: PropTypes.array.isRequired,
  settings: PropTypes.object,
  hsDB: PropTypes.array,
  onUpdateItem: PropTypes.func.isRequired,
  onUpdatePO: PropTypes.func.isRequired,
  onAddItem: PropTypes.func.isRequired,
  onOpenDO: PropTypes.func.isRequired,
  onAddSupplier: PropTypes.func.isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
  onDeleteDO: PropTypes.func.isRequired
};
