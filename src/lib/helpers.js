import { PPN_RATE, CSV_PO_ST, CSV_IT_ST } from "./constants";
import { usePOStore } from "../store/usePOStore";

/* ── ID & Date ── */
export const uid = () => {
  // PocketBase expects exactly 15 alphanumeric characters
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < 15; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};
export const today = () => new Date().toISOString().slice(0, 10);
export const diffDays = (d) => (d ? Math.floor((Date.now() - new Date(d)) / 864e5) : -1);

/* ── PO Checks ── */
// Overdue: Date > threshold AND status is ACTIVE (not terminal or draft)
export const isOverdue = (p, days = 7) =>
  !["received", "paid", "cancelled"].includes(p.status) && 
  p.orderDate && diffDays(p.orderDate) >= days;
export const isIncompletePO = (p) =>
  !p.orderNo || !p.orderNo.trim() || p.orderNo.trim() === "Order" ||
  !p.orderDate || p.orderDate === "dd/mm/yyyy" || !p.company || !p.company.trim();

export const validatePO = (p) => {
  const errors = [];
  if (!p.orderNo?.trim()) errors.push("No. PO wajib diisi");
  if (!p.company?.trim()) errors.push("Perusahaan wajib diisi");
  if (!p.orderDate) errors.push("Tanggal Order wajib diisi");
  return { valid: !errors.length, errors };
};

export const validateItem = (i) => {
  const errors = [];
  if (!i.itemName?.trim()) errors.push("Nama Item wajib diisi");
  if (!i.qty || i.qty <= 0) errors.push("Qty harus lebih dari 0");
  if (!i.unitPrice || i.unitPrice < 0) errors.push("Harga Jual tidak boleh negatif");
  return { valid: !errors.length, errors };
};

/* ── Parsing ── */
export const parseIDR = (s) => {
  if (!s && s !== 0) return 0;
  try {
    const st = usePOStore.getState().settings || {};
    const tSep = st.thousandSeparator || ".";
    const dSep = st.decimalSeparator || ",";
    let str = String(s);
    // Remove all thousand separators
    str = str.split(tSep).join("");
    // Replace decimal separator with period
    str = str.split(dSep).join(".");
    // Remove everything else except digits, dot, and minus
    return parseFloat(str.replace(/[^0-9.-]/g, "")) || 0;
  } catch(e) {
    // fallback
    return parseFloat(String(s).replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")) || 0;
  }
};

export const parseSmartDate = (raw) => {
  if (!raw || !raw.trim()) return "";
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[.\-\/]/);
  if (parts.length === 3) {
    let [d, m, y] = parts.map(Number);
    if (y < 100) y += y < 30 ? 2000 : 1900;
    if (d > 0 && m > 0 && m <= 12 && y > 1900)
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return "";
};

/* ── CSV Status Mapping ── */
export const mapPOSt = (s) => CSV_PO_ST[(s || "").toLowerCase().trim()] || "draft";
export const mapItemSt = (s) => CSV_IT_ST[(s || "").toLowerCase().trim()] || "pending";

/* ── DO Number Formatting ── */
export const formatDO = (seq) => {
  const n = new Date();
  const yy = String(n.getFullYear()).slice(2);
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  return `${seq}/DO/API/${mm}/${yy}`;
};

export const formatInvoice = (seq) => {
  const n = new Date();
  const yyyy = n.getFullYear();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  return `${seq}/API/MDN/${mm}/${yyyy}`;
};

export const nextSeq = (list, key) => {
  const nums = (list || []).map(x => {
    const parts = (x[key] || "").split("/");
    return Number(parts[0]);
  }).filter(n => !isNaN(n));
  return nums.length ? Math.max(...nums) + 1 : 1600; // Starting from a standard ERP offset if empty
};

export const nextDOSeq  = (dos) => nextSeq(dos, "doNo");
export const nextInvSeq = (items) => {
  const nums = items.map(i => {
    const parts = (i.invoiceNo || "").split("/");
    return Number(parts[0]);
  }).filter(n => !isNaN(n));
  return nums.length ? Math.max(...nums) + 1 : 1600;
};

/* ── Map Builders ── */
export const buildPoMap = (pos) => {
  const map = {};
  (pos || []).forEach((p) => { map[p.id] = p; });
  return map;
};

/* ── Quantity Helpers ── */
export const getQtyDel = (itemId, dos) =>
  (dos || []).reduce((s, d) => s + ((d.lines || []).find((l) => l.itemId === itemId)?.qtyDelivered || 0), 0);
export const getQtyRem = (item, dos) => Math.max(0, (item.qty || 0) - getQtyDel(item.id, dos));

/* ── Formatting ── */
export const fmt = (n) => {
  try {
    const st = usePOStore.getState().settings || {};
    const curr = typeof st.currencySymbol !== 'undefined' ? st.currencySymbol : "Rp.";
    const tSep = st.thousandSeparator || ".";
    const dSep = st.decimalSeparator || ",";

    if (n == null || isNaN(n)) return `${curr} –`.trim();
    
    let [intP, decP] = Number(n).toFixed(2).split(".");
    intP = intP.replace(/\B(?=(\d{3})+(?!\d))/g, tSep);
    
    const formattedNum = `${intP}${dSep}${decP}`;
    return curr ? `${curr} ${formattedNum}` : formattedNum;
  } catch(e) {
    return n != null && !isNaN(n)
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(n))
      : "Rp –";
  }
};

export const fmtShort = (n) => {
  try {
    const st = usePOStore.getState().settings || {};
    const curr = typeof st.currencySymbol !== 'undefined' ? st.currencySymbol : "Rp.";
    if (n == null || isNaN(n)) return `${curr} –`.trim();
    const v = Number(n);
    if (Math.abs(v) >= 1e12) return `${curr} ${(v / 1e12).toFixed(2)}T`.trim();
    if (Math.abs(v) >= 1e9) return `${curr} ${(v / 1e9).toFixed(2)}M`.trim();
    if (Math.abs(v) >= 1e6) return `${curr} ${(v / 1e6).toFixed(1)}Jt`.trim();
    return fmt(v);
  } catch(e) {
    if (n == null || isNaN(n)) return "Rp –";
    const v = Number(n);
    if (Math.abs(v) >= 1e12) return `Rp ${(v / 1e12).toFixed(2)}T`;
    if (Math.abs(v) >= 1e9) return `Rp ${(v / 1e9).toFixed(2)}M`;
    if (Math.abs(v) >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}Jt`;
    return fmt(v);
  }
};

export const fmtDate = (d) => {
  if (!d) return "–";
  try { return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { 
    if (typeof d === 'string' && d.includes("-")) return d.split("-").reverse().join("/");
    return d; 
  }
};

export const fmtPct = (v, t) => (t && t !== 0 ? `${((v / t) * 100).toFixed(1)}%` : "–");

/* ── Item Calculations ── */
export const itemNet = (i) => Math.max(0, (Number(i.unitPrice) || 0) * (Number(i.qty) || 0) - (Number(i.discount) || 0));
export const itemBuy = (i) => {
  const assigns = i.supplierAssignments || [];
  if (!assigns.length) return 0;
  // Prefer "main" supplier, fallback to the first one available
  const m = assigns.find((a) => a.role === "main") || assigns[0];
  const unitP = Number(m.pricePerUnit) || 0;
  const qty   = Number(i.qty) || 0;
  const ship  = Number(m.shippingTotal) || 0;
  return unitP * qty + ship;
};
export const itemMargin = (i) => { const b = itemBuy(i); return b > 0 ? itemNet(i) - b : null; };

/* ── PO Calculations ── */
export const getPOZone = (poId, items) => {
  const z = [...new Set(items.filter((i) => i.poId === poId && i.zoneType).map((i) => i.zoneType))];
  return !z.length ? "–" : z.length === 1 ? z[0] : "Mix";
};

export const calcPOTotals = (po, items) => {
  const st = usePOStore.getState().settings || {};
  const rate = typeof st.ppnRate !== 'undefined' ? Number(st.ppnRate) : PPN_RATE;

  if (po.totalLocked) {
    const ex = Number(po.manualExPPN) || 0;
    const ppn = Number(po.manualPPN) || Math.round(ex * rate);
    return { exPPN: ex, ppn, total: ex + ppn };
  }
  const ex = items.filter((i) => i.poId === po.id).reduce((s, i) => s + itemNet(i), 0);
  return { exPPN: ex, ppn: Math.round(ex * rate), total: Math.round(ex * (1 + rate)) };
};

export const getPOProgress = (poId, items) => {
  const p = items.filter((i) => i.poId === poId);
  const n = p.length;
  return {
    n,
    del: p.filter((i) => ["delivered", "invoiced", "paid"].includes(i.status)).length,
    inv: p.filter((i) => ["invoiced", "paid"].includes(i.status)).length,
    paid: p.filter((i) => i.status === "paid").length,
  };
};

/* ── Visual Helpers ── */
export const agingColor = (d) => (d < 0 ? "#64748b" : d < 3 ? "#059669" : d < 7 ? "#10b981" : d < 14 ? "#fbbf24" : d < 24 ? "#f59e0b" : d < 31 ? "#ea580c" : "#dc2626");
export const agingBg = (d) => (d < 0 ? "#f1f5f9" : d < 3 ? "#f0fdf4" : d < 7 ? "#ecfdf5" : d < 14 ? "#fffbeb" : d < 24 ? "#fff7ed" : d < 31 ? "#fff2e7" : "#fef2f2");

export const getAgingBucketsConfig = () => [
  { min: 0,  max: 3,  label: "0-3 Hari",  color: "#059669" },
  { min: 3,  max: 7,  label: "3-7 Hari",  color: "#10b981" },
  { min: 7,  max: 14, label: "7-14 Hari", color: "#fbbf24" },
  { min: 14, max: 24, label: "14-24 Hari", color: "#f59e0b" },
  { min: 24, max: 31, label: "24-31 Hari", color: "#ea580c" },
  { min: 31, max: Infinity, label: "> 31 Hari", color: "#dc2626" },
];

export const getAgingBucket = (days) => {
  if (days < 0) return null;
  const config = getAgingBucketsConfig();
  return config.find(b => days >= b.min && days < b.max) || config[config.length - 1];
};

/* ── Filter Helpers ── */
export const applyDateFilter = (val, f) => {
  if (!f) return true; if (!val) return false;
  if (f.from && val < f.from) return false;
  if (f.to && val > f.to) return false;
  return true;
};

export const applyNumFilter = (val, f) => {
  if (!f) return true;
  if (f.empty) return val == null || Number(val) === 0;
  if (val == null) return false;
  const n = Number(val) || 0;
  if (f.min != null && n < f.min) return false;
  if (f.max != null && n > f.max) return false;
  return true;
};

export const applyTextFilter = (val, f) => {
  if (!f) return true;
  return String(val || "").toLowerCase().includes(f.toLowerCase());
};

/* ── Export/Copy ── */
export const exportCSV = (headers, rows, fname) => {
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  Object.assign(document.createElement("a"), {
    href: "data:text/csv;charset=utf-8," + encodeURIComponent(csv),
    download: fname,
  }).click();
};

export const copyTSV = (headers, rows, done) => {
  const t = [headers, ...rows].map((r) => r.map((v) => String(v ?? "").replace(/\r?\n|\r/g, " ").replace(/\t/g, " ")).join("\t")).join("\n");
  navigator.clipboard.writeText(t).then(done).catch((err) => {
    console.error("Clipboard copy failed:", err);
  });
};
