import { useState, useMemo, Fragment } from "react";
import { Btn, Ico, IC, TagChip, SBadge, FIn, FSel } from "../components/ui";
import { SupplierFormModal } from "../components/forms";
import { useConfirm } from "../hooks";
import { usePOStore } from "../store/usePOStore";
import { itemNet, fmt, fmtShort, buildPoMap } from "../lib/helpers";
import { ITEM_STATUS } from "../lib/constants";
import { thCls, tdCls } from "../lib/tableStyles";

/* ── Class constants ── */
const tabBtnActive = "py-[5px] px-3.5 rounded-[5px] border-none font-semibold text-[11px] cursor-pointer capitalize bg-surface text-text-primary shadow-sm";
const tabBtnIdle   = "py-[5px] px-3.5 rounded-[5px] border-none font-semibold text-[11px] cursor-pointer capitalize bg-transparent text-text-muted";

export function SupplierPage({ onJump }) {
  const { suppliers, items, pos, addSupplier, updateSupplier, archiveSupplier, deleteSupplier, toast } = usePOStore();

  const [tab,      setTab]      = useState("aktif");
  const [search,   setSearch]   = useState("");
  const [tagFilter,setTagFilter]= useState("");
  const [exp,      setExp]      = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editSup,  setEditSup]  = useState(null);
  const [bulkSel,  setBulkSel]  = useState(new Set());
  const [expGrp,   setExpGrp]   = useState(new Set());
  const { ask, ConfirmModal }   = useConfirm();

  const list = suppliers.filter((s) =>
    (tab === "aktif" ? !s.deletedAt : s.deletedAt) &&
    (!search || 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.city?.toLowerCase().includes(search.toLowerCase()) ||
      s.country?.toLowerCase().includes(search.toLowerCase()) ||
      s.tags?.some((t) => t.includes(search.toLowerCase()))) &&
    (!tagFilter || s.tags?.includes(tagFilter))
  );
  const allTags = [...new Set(suppliers.flatMap((s) => s.tags || []))].sort();

  const poById = useMemo(() => buildPoMap(pos), [pos]);

  const supItems = (id) => items.filter((i) => (i.supplierAssignments || []).some((a) => a.supplierId === id));
  const supAsgn  = (item, supId) => (item.supplierAssignments || []).find((a) => a.supplierId === supId);

  const handleBulkArchive = () => ask(
    `Arsipkan ${bulkSel.size} supplier?`,
    () => { [...bulkSel].forEach((id) => archiveSupplier(id)); setBulkSel(new Set()); toast(`✓ ${bulkSel.size} supplier diarsipkan`); },
    { confirmLabel: "Ya, Arsipkan" }
  );

  return (
    <div className="flex flex-col h-full w-full">
      <ConfirmModal />

      {/* Toolbar */}
      <div className="flex gap-2 py-3 px-4 border-b border-border-default flex-wrap items-center shrink-0 bg-surface">
        <div className="flex gap-0 bg-bg-app rounded-md p-0.5 border border-border-default">
          {["aktif", "arsip"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? tabBtnActive : tabBtnIdle}>{t}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[150px] max-w-[280px]">
          <FIn value={search} onChange={setSearch} placeholder="Cari supplier..." className="pl-7 pr-2 py-1" />
          <Ico d={IC.search} size={13} color="var(--color-text-muted)" className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        {allTags.length > 0 && (
          <FSel value={tagFilter} onChange={setTagFilter} placeholder="Filter tag..." options={allTags} className="!py-1 w-[140px]" />
        )}
        <Btn size="sm" onClick={() => { setEditSup(null); setShowForm(true); }}>
          <Ico d={IC.plus} size={11} /> Tambah
        </Btn>
        {bulkSel.size > 0 && (
          <div className="flex gap-1.5 items-center py-1 px-2.5 bg-amber-soft border border-amber-mid rounded-md">
            <span className="text-[11px] text-amber font-semibold">{bulkSel.size} dipilih</span>
            <Btn size="sm" variant="amber" onClick={handleBulkArchive}><Ico d={IC.archive} size={10} /> Arsipkan</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setBulkSel(new Set())}><Ico d={IC.close} size={10} /></Btn>
          </div>
        )}
        <span className="text-[11px] text-text-muted ml-auto">{list.length} supplier</span>
      </div>

      {/* Cards */}
      <div className="overflow-y-auto flex-1 p-4">
        {!list.length && <div className="py-10 text-center text-text-muted">Tidak ada supplier.</div>}
        <div className="grid grid-cols-2 gap-4">
          {list.map((s) => {
            const isExp       = exp === s.id;
            const sitems      = supItems(s.id);
            const mainItems   = sitems.filter((i) => supAsgn(i, s.id)?.role === "main");
            const backupItems = sitems.filter((i) => supAsgn(i, s.id)?.role === "backup");
            const totalBeli   = mainItems.reduce((sum, i) => { const a = supAsgn(i, s.id); return sum + (a?.pricePerUnit || 0) * (i.qty || 0) + (a?.shippingTotal || 0); }, 0);
            const totalJual   = mainItems.reduce((sum, i) => sum + itemNet(i), 0);
            const cardBorder  = isExp ? "border-brand" : bulkSel.has(s.id) ? "border-amber-mid" : "border-border-default";

            return (
              <div key={s.id} className={`bg-surface rounded-[10px] shadow-sm overflow-hidden border-2 ${cardBorder}`}>
                <div
                  className={`py-3 px-4 cursor-pointer flex items-start gap-2.5 ${isExp ? "bg-brand-soft" : ""}`}
                  onClick={() => setExp((v) => v === s.id ? null : s.id)}
                >
                  <input
                    type="checkbox" checked={bulkSel.has(s.id)} onClick={(e) => e.stopPropagation()}
                    onChange={() => { const ns = new Set(bulkSel); ns.has(s.id) ? ns.delete(s.id) : ns.add(s.id); setBulkSel(ns); }}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-[13px] text-text-primary truncate max-w-[220px]">{s.name}</div>
                      <Ico d={isExp ? IC.chevD : IC.chevR} size={13} color="var(--color-text-muted)" />
                    </div>
                    {s.contact && <div className="text-[10px] text-text-secondary mt-0.5 font-medium">{s.contact}</div>}
                    {(s.city || s.country) && (
                      <div className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1.5">
                        <Ico d={IC.truck} size={10} color="var(--color-text-muted)" />
                        {s.city}{s.city && s.country ? ", " : ""}{s.country}
                      </div>
                    )}
                    {s.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.tags.map((t) => <TagChip key={t} label={t} />)}
                      </div>
                    )}
                    <div className="flex gap-2.5 mt-2 text-[10px] text-text-secondary">
                      <span>Utama: <strong className="text-brand">{mainItems.length}</strong></span>
                      <span>Backup: <strong className="text-text-secondary">{backupItems.length}</strong></span>
                      {totalBeli > 0 && <span>Beli: <strong className="text-orange">{fmtShort(totalBeli)}</strong></span>}
                    </div>
                  </div>
                </div>

                {isExp && (
                  <div className="border-t border-border-default">
                    <div className="grid grid-cols-2 gap-2 py-2.5 px-4 bg-surface-alt border-b border-border-default">
                      {s.phone   && <div className="text-[10px] text-text-secondary"><span className="text-text-muted mr-1">📞</span>{s.phone}</div>}
                      {s.email   && <div className="text-[10px] text-text-secondary"><span className="text-text-muted mr-1">✉</span>{s.email}</div>}
                      {s.address && <div className="text-[10px] text-text-secondary col-span-2"><span className="text-text-muted mr-1">📍</span>{s.address}</div>}
                      {s.notes   && <div className="text-[10px] text-text-muted italic col-span-2">{s.notes}</div>}
                    </div>

                    {sitems.length > 0 && (
                      <div className="py-2.5 pb-0">
                        <div className="text-[10px] font-bold text-text-secondary px-4 pb-1.5 uppercase tracking-[.06em]">Item dari Supplier Ini ({sitems.length})</div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-[11px] min-w-[1000px]">
                            <thead>
                              <tr className="bg-surface-alt">
                                {["Nama Item","PO","Customer","Role","Harga Beli/unit","Ongkir","Total Beli","Harga Jual","Net","Margin","Status"].map((h) => (
                                  <th key={h} className={thCls}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const grouped = Object.values(sitems.reduce((acc, i) => {
                                  const k = (i.itemName || "(Tanpa Nama)").trim().toUpperCase();
                                  if (!acc[k]) acc[k] = { name: i.itemName, items: [], totalB: 0, totalJ: 0, qty: 0 };
                                  acc[k].items.push(i);
                                  const a = supAsgn(i, s.id);
                                  if (a?.role === "main") {
                                    acc[k].totalB += (a.pricePerUnit || 0) * (i.qty || 0) + (a.shippingTotal || 0);
                                    acc[k].totalJ += itemNet(i);
                                  }
                                  acc[k].qty += Number(i.qty) || 0;
                                  return acc;
                                }, {})).sort((a,b) => a.name.localeCompare(b.name));

                                return grouped.map((g) => {
                                  // If only one transaction for this item name, render as a normal row (no expand toggle).
                                  if (g.items.length <= 1) {
                                    const item = g.items[0];
                                    const po = poById[item.poId];
                                    const a = supAsgn(item, s.id);
                                    const isMain = a?.role === "main";
                                    const totalB = (a?.pricePerUnit || 0) * (item.qty || 0) + (a?.shippingTotal || 0);
                                    const mg = isMain ? itemNet(item) - totalB : null;
                                    const mgCls = mg === null ? "text-text-muted" : mg >= 0 ? "text-green" : "text-red";
                                    return (
                                      <tr key={item.id} className="bg-white border-b border-border-default">
                                        <td className={tdCls}>
                                          <div className="font-semibold truncate max-w-[260px]" title={item.itemName}>{item.itemName}</div>
                                          <div className="text-[9px] text-text-muted font-normal">{item.qty} {item.unit}</div>
                                        </td>
                                        <td className={`${tdCls} font-mono text-[10px] text-brand truncate max-w-[130px]`} title={po?.orderNo}>
                                          {po?.orderNo
                                            ? <span className="cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); onJump?.("po", po.id); }}>{po.orderNo}</span>
                                            : "–"}
                                        </td>
                                        <td className={`${tdCls} text-[10px] truncate max-w-[120px]`} title={po?.company}>{po?.company || "–"}</td>
                                        <td className={tdCls}>
                                          <span className={`text-[9px] font-bold rounded-[3px] px-1.5 py-px uppercase ${isMain ? "text-brand bg-brand-soft" : "text-text-secondary bg-bg-app"}`}>{a?.role || "–"}</span>
                                        </td>
                                        <td className={`${tdCls} font-mono whitespace-nowrap`}>{fmt(a?.pricePerUnit || 0)}</td>
                                        <td className={`${tdCls} font-mono text-text-secondary whitespace-nowrap`}>{(a?.shippingTotal || 0) > 0 ? fmt(a.shippingTotal) : "–"}</td>
                                        <td className={`${tdCls} font-mono font-bold whitespace-nowrap ${isMain ? "text-orange" : "text-text-muted"}`}>{isMain ? fmt(totalB) : "–"}</td>
                                        <td className={`${tdCls} font-mono whitespace-nowrap`}>{fmt(item.unitPrice)}</td>
                                        <td className={`${tdCls} font-mono font-bold text-brand whitespace-nowrap`}>{fmt(itemNet(item))}</td>
                                        <td className={`${tdCls} font-mono font-bold whitespace-nowrap ${mgCls}`}>{mg === null ? "–" : fmt(mg)}</td>
                                        <td className={tdCls}><SBadge status={item.status} cfg={ITEM_STATUS} /></td>
                                      </tr>
                                    );
                                  }

                                  const gKey = `${s.id}_${g.name}`;
                                  const isGExp = expGrp.has(gKey);
                                  const toggleGExp = () => {
                                    const ns = new Set(expGrp);
                                    isGExp ? ns.delete(gKey) : ns.add(gKey);
                                    setExpGrp(ns);
                                  };

                                  return (
                                    <Fragment key={gKey}>
                                      <tr className="bg-[#f0f4f8] cursor-pointer hover:bg-brand-soft border-b border-border-default transition-colors" onClick={toggleGExp}>
                                        <td className={`${tdCls} font-bold text-text-primary`} colSpan={6}>
                                          <div className="flex items-center gap-2">
                                            <Ico d={isGExp ? IC.chevD : IC.chevR} size={12} color="var(--color-brand)" />
                                            <span className="truncate max-w-[280px]">{g.name}</span>
                                            <span className="text-[10px] text-text-secondary font-normal ml-2 tracking-wide block bg-white px-1.5 py-0.5 rounded border border-border-strong">
                                              {g.items.length} Transaksi · Qty: {g.qty}
                                            </span>
                                          </div>
                                        </td>
                                        <td className={`${tdCls} font-mono font-bold text-orange whitespace-nowrap`}>{g.totalB > 0 ? fmt(g.totalB) : "–"}</td>
                                        <td className={tdCls} />
                                        <td className={`${tdCls} font-mono font-bold text-brand whitespace-nowrap`}>{g.totalJ > 0 ? fmt(g.totalJ) : "–"}</td>
                                        <td className={`${tdCls} font-mono font-bold whitespace-nowrap ${g.totalJ - g.totalB >= 0 ? "text-green" : "text-red"}`}>{g.totalJ > 0 && g.totalB > 0 ? fmt(g.totalJ - g.totalB) : "–"}</td>
                                        <td className={tdCls} />
                                      </tr>
                                      {isGExp && g.items.map((item, idx) => {
                                        const po     = poById[item.poId];
                                        const a      = supAsgn(item, s.id);
                                        const isMain = a?.role === "main";
                                        const totalB = (a?.pricePerUnit || 0) * (item.qty || 0) + (a?.shippingTotal || 0);
                                        const mg     = isMain ? itemNet(item) - totalB : null;
                                        const rowBg  = idx % 2 === 0 ? "bg-white" : "bg-surface-alt";
                                        const mgCls  = mg === null ? "text-text-muted" : mg >= 0 ? "text-green" : "text-red";
                                        return (
                                          <tr key={item.id} className={rowBg}>
                                            <td className={tdCls}>
                                              <div className="pl-5 text-[9px] text-text-muted font-normal">{item.qty} {item.unit}</div>
                                            </td>
                                            <td className={`${tdCls} font-mono text-[10px] text-brand truncate max-w-[130px]`} title={po?.orderNo}>
                                              {po?.orderNo
                                                ? <span className="cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); onJump?.("po", po.id); }}>{po.orderNo}</span>
                                                : "–"}
                                            </td>
                                            <td className={`${tdCls} text-[10px] truncate max-w-[120px]`} title={po?.company}>{po?.company || "–"}</td>
                                            <td className={tdCls}>
                                              <span className={`text-[9px] font-bold rounded-[3px] px-1.5 py-px uppercase ${isMain ? "text-brand bg-brand-soft" : "text-text-secondary bg-bg-app"}`}>{a?.role || "–"}</span>
                                            </td>
                                            <td className={`${tdCls} font-mono whitespace-nowrap`}>{fmt(a?.pricePerUnit || 0)}</td>
                                            <td className={`${tdCls} font-mono text-text-secondary whitespace-nowrap`}>{(a?.shippingTotal || 0) > 0 ? fmt(a.shippingTotal) : "–"}</td>
                                            <td className={`${tdCls} font-mono font-bold whitespace-nowrap ${isMain ? "text-orange" : "text-text-muted"}`}>{isMain ? fmt(totalB) : "–"}</td>
                                            <td className={`${tdCls} font-mono whitespace-nowrap`}>{fmt(item.unitPrice)}</td>
                                            <td className={`${tdCls} font-mono font-bold text-brand whitespace-nowrap`}>{fmt(itemNet(item))}</td>
                                            <td className={`${tdCls} font-mono font-bold whitespace-nowrap ${mgCls}`}>{mg === null ? "–" : fmt(mg)}</td>
                                            <td className={tdCls}><SBadge status={item.status} cfg={ITEM_STATUS} /></td>
                                          </tr>
                                        );
                                      })}
                                    </Fragment>
                                  );
                                });
                              })()}
                            </tbody>
                            {mainItems.length > 0 && (
                              <tfoot>
                                <tr className="bg-brand-soft">
                                  <td colSpan={6} className="py-1.5 px-[10px] text-[10px] font-bold text-brand">TOTAL (item utama)</td>
                                  <td className="py-1.5 px-[10px] font-mono font-bold text-orange whitespace-nowrap">{fmt(totalBeli)}</td>
                                  <td />
                                  <td className="py-1.5 px-[10px] font-mono font-bold text-brand whitespace-nowrap">{fmt(totalJual)}</td>
                                  <td className={`py-1.5 px-[10px] font-mono font-bold whitespace-nowrap ${totalJual - totalBeli >= 0 ? "text-green" : "text-red"}`}>{fmt(totalJual - totalBeli)}</td>
                                  <td />
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    )}
                    {!sitems.length && <div className="py-3 px-4 text-[11px] text-text-muted italic">Belum ada item dari supplier ini.</div>}

                    <div className="flex gap-1.5 py-2.5 px-4 border-t border-border-default flex-wrap">
                      <Btn size="sm" variant="blue" onClick={() => { setEditSup(s); setShowForm(true); }}><Ico d={IC.edit} size={10} /> Edit</Btn>
                      {tab === "aktif"
                        ? <Btn size="sm" variant="amber" onClick={() => { archiveSupplier(s.id); toast(`✓ ${s.name} diarsipkan`); }}><Ico d={IC.archive} size={10} /> Arsipkan</Btn>
                        : <Btn size="sm" variant="success" onClick={() => { updateSupplier({ ...s, deletedAt: null }); toast(`✓ ${s.name} dipulihkan`); }}><Ico d={IC.restore} size={10} /> Pulihkan</Btn>}
                      {sitems.length === 0 && (
                        <Btn size="sm" variant="danger" onClick={() => ask(`Hapus supplier "${s.name}" secara permanen?`, () => { deleteSupplier(s.id); toast(`✓ ${s.name} dihapus`); }, { danger: true, confirmLabel: "Hapus Permanen" })}>
                          <Ico d={IC.trash} size={10} /> Hapus
                        </Btn>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <SupplierFormModal
          initial={editSup}
          onSave={(s) => { editSup ? updateSupplier(s) : addSupplier(s); setShowForm(false); toast(`✓ Supplier ${s.name} disimpan`); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
