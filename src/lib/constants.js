/* ══ Application Constants ══════════════════════════════════════ */

export const VENDOR_NAME = "PT. API DISTRIBUSI INDONESIA";
export const VENDOR_ADDR = "Jl. Industri Raya No.123, Medan, Sumatera Utara";
export const VENDOR_CONTACT = "Tel: +62-61-XXXX-XXXX  |  po@apidistribusi.co.id";

export const PPN_RATE = 0.11;
export const PAGE_SIZE = 50;

export const UNITS = [
  "pcs","set","roll","meter","kg","liter","box","unit","lot","batang","lembar","drum","koli","sheet",
];

/* ── DO Template Fields ── */
export const DEFAULT_DO_FIELDS = [
  { key: "driverName",    label: "Nama Supir",  enabled: true,  type: "text" },
  { key: "vehiclePlate",  label: "No. Polisi",  enabled: true,  type: "text" },
  { key: "personInCharge", label: "PIC",         enabled: false, type: "text" },
  { key: "sealNo",        label: "No. Seal",    enabled: false, type: "text" },
  { key: "remarks",       label: "Keterangan",  enabled: true,  type: "textarea" },
];

/* ── Excel/TSV Copy Columns ── */
export const DEFAULT_EXCEL_ITEM_COLS = [
  { key: "itemName",     label: "Nama Item",     enabled: true },
  { key: "qty",          label: "Qty",           enabled: true },
  { key: "unit",         label: "Unit",          enabled: true },
  { key: "hsCode",       label: "HS Code",       enabled: true },
  { key: "unitPrice",    label: "Harga Jual",    enabled: false },
  { key: "net",          label: "Net",           enabled: true },
  { key: "buy",          label: "Total Beli",    enabled: false },
  { key: "margin",       label: "Margin",        enabled: false },
  { key: "status",       label: "Status",        enabled: true },
  { key: "deliveryDate", label: "Tgl Delivery",  enabled: false },
  { key: "invoiceNo",    label: "Invoice No",    enabled: false },
  { key: "doNos",        label: "DO Nos",        enabled: false },
  { key: "zoneType",     label: "Zone",          enabled: false },
  { key: "poNo",         label: "No PO",         enabled: true },
  { key: "company",      label: "Perusahaan",    enabled: false },
  { key: "desc",         label: "Deskripsi",     enabled: false },
];

export const DEFAULT_EXCEL_PO_COLS = [
  { key: "orderNo",      label: "No PO",         enabled: true },
  { key: "quoteRef",     label: "Quote Ref",     enabled: true },
  { key: "company",      label: "Perusahaan",    enabled: true },
  { key: "orderDate",    label: "Tgl Order",     enabled: true },
  { key: "status",       label: "Status",        enabled: true },
  { key: "total",        label: "Total",         enabled: true },
  { key: "totalItems",   label: "Total Item",    enabled: true },
  { key: "delivered",    label: "Terkirim",      enabled: false },
  { key: "invoiced",     label: "Invoiced",      enabled: false },
  { key: "paid",         label: "Paid",          enabled: false },
  { key: "priority",     label: "Prioritas",     enabled: false },
  { key: "zoneType",     label: "Zone",          enabled: false },
];

export const INIT_SETTINGS = {
  overdueDays: 7,
  doFormat: "DO/{YYYY}/{NNN}",
  doFields: DEFAULT_DO_FIELDS,
  excelItemCols: DEFAULT_EXCEL_ITEM_COLS,
  excelPOCols: DEFAULT_EXCEL_PO_COLS,
  itemSearchConfig: {
    includeItemName: true,
    includeDescription: true,
    includeInvoice: true,
    includeDOs: true,
    includePONumber: true,
    includeCompany: true,
    includeZone: true,
    includeHSCode: true,
    includeMainSupplier: true,
  },
  
  // Organization Details
  vendorName: "PT. API DISTRIBUSI INDONESIA",
  vendorAddr: "Jl. Industri Raya No.123, Medan, Sumatera Utara",
  vendorContact: "Tel: +62-61-XXXX-XXXX  |  po@apidistribusi.co.id",

  // Global App Configs
  paginationSize: 50,
  currencySymbol: "Rp.",
  thousandSeparator: ".",
  decimalSeparator: ",",
};

/* ── Initial Data ── */
export const INIT_COMPANIES = [
  "PT. AGRO MURNI",
  "PT. SIMPANG KANAN LESTARINDO",
  "PT. SUMBER JAYA INDUSTRI OLEO",
  "PT. PACIFIC PALMINDO INDUSTRI",
  "PT. ABLE COMMODITIES INDONESIA",
  "PT. KENCANA INTI PERKASA",
  "PT. INNO WANGSA OIL & FATS",
];

export const INIT_ZONE_TYPES = [
  "Zone 1 – Lokal",
  "Zone 2 – Regional",
  "Zone 3 – Nasional",
  "Zone 4 – Import",
  "Boned Zone",
];

export const INIT_SUPPLIERS = [
  { id: "SUP001", name: "CV. Teknik Jaya",        contact: "Budi Santoso",  phone: "0812-3456-7890", email: "teknikjaya@email.com",  address: "Jl. Industri No.5, Medan",          tags: ["hydraulic","fitting","hose"],         notes: "Supplier lokal Medan",  createdAt: "2024-01-15", deletedAt: null },
  { id: "SUP002", name: "UD. Belt Nusantara",      contact: "Siti Rahayu",   phone: "0813-9876-5432", email: "belt@email.com",        address: "Jl. Pahlawan No.12, Medan",          tags: ["v-belt","belt","mechanical"],         notes: "Spesialis belt",        createdAt: "2024-02-01", deletedAt: null },
  { id: "SUP003", name: "PT. Flanges Indonesia",   contact: "Ahmad Fauzi",   phone: "0811-2233-4455", email: "flanges@email.com",     address: "Jl. Raya Industri No.88, Batam",     tags: ["flange","fitting","piping"],          notes: "Supplier flanges",      createdAt: "2024-02-15", deletedAt: null },
  { id: "SUP004", name: "PT. Pompa Sentosa",       contact: "Rudi Hermawan", phone: "0815-6677-8899", email: "pompa@email.com",       address: "Jl. Sisingamangaraja No.45, Medan",  tags: ["pump","impeller","centrifugal"],      notes: "Spesialis pompa",       createdAt: "2024-03-01", deletedAt: null },
  { id: "SUP005", name: "CV. Valve Indonesia",     contact: "Dewi Kusuma",   phone: "0817-1122-3344", email: "valve@email.com",       address: "Jl. Gatot Subroto No.22, Jakarta",   tags: ["valve","control valve","ball valve"], notes: "Supplier valve",        createdAt: "2024-03-10", deletedAt: null },
  { id: "SUP006", name: "PT. Grundfos Indonesia",  contact: "Joko Prabowo",  phone: "0818-9988-7766", email: "grundfos@email.com",    address: "Jl. TB Simatupang No.1, Jakarta",    tags: ["pump","dosing pump","industrial"],    notes: "Brand pump premium",    createdAt: "2024-04-01", deletedAt: null },
];

/* ── Status Configs ── */
export const INIT_PO_STATUS = {
  draft:       { label: "Draft",        color: "#64748b", bg: "#f1f5f9", ring: "#cbd5e1" },
  pending:     { label: "Pending",      color: "#b45309", bg: "#fef3c7", ring: "#fbbf24" },
  confirmed:   { label: "Confirmed",    color: "#1d4ed8", bg: "#dbeafe", ring: "#93c5fd" },
  revision:    { label: "Revision",     color: "#c2410c", bg: "#ffedd5", ring: "#fb923c" },
  on_hold:     { label: "On Hold",      color: "#6d28d9", bg: "#ede9fe", ring: "#a78bfa" },
  partial_del: { label: "Partial Del.", color: "#0369a1", bg: "#e0f2fe", ring: "#7dd3fc" },
  delivered:   { label: "Delivered",    color: "#1e40af", bg: "#dbeafe", ring: "#6b9ffd" },
  invoiced:    { label: "Invoiced",     color: "#0e7490", bg: "#cffafe", ring: "#67e8f9" },
  partial_pay: { label: "Partial Pay",  color: "#15803d", bg: "#dcfce7", ring: "#86efac" },
  paid:        { label: "Paid",         color: "#166534", bg: "#bbf7d0", ring: "#4ade80" },
  cancelled:   { label: "Cancelled",    color: "#991b1b", bg: "#fee2e2", ring: "#fca5a5" },
};

export const ITEM_STATUS = {
  pending:   { label: "Pending",   color: "#64748b", bg: "#f1f5f9", ring: "#cbd5e1" },
  ordered:   { label: "Ordered",   color: "#b45309", bg: "#fef3c7", ring: "#fbbf24" },
  partial:   { label: "Partial",   color: "#0369a1", bg: "#e0f2fe", ring: "#7dd3fc" },
  delivered: { label: "Delivered", color: "#166534", bg: "#bbf7d0", ring: "#4ade80" },
  invoiced:  { label: "Invoiced",  color: "#0e7490", bg: "#cffafe", ring: "#67e8f9" },
  paid:      { label: "Paid",      color: "#166534", bg: "#dcfce7", ring: "#86efac" },
  returned:  { label: "Returned",  color: "#c2410c", bg: "#ffedd5", ring: "#fb923c" },
  cancelled: { label: "Cancelled", color: "#991b1b", bg: "#fee2e2", ring: "#fca5a5" },
};

export const STATUS_RANK = {
  draft: 0, pending: 1, confirmed: 2, revision: 1, on_hold: 1,
  partial_del: 3, delivered: 4, invoiced: 5, partial_pay: 6, paid: 7, cancelled: 0,
};

/* ── CSV Import Mappings ── */
export const CSV_PO_ST = {
  complete: "paid", "do needed": "pending", cancel: "cancelled", urgent: "pending",
  masalah: "on_hold", "rev 1": "revision", p0: "draft", "inv blm print": "invoiced",
  "invoice request": "invoiced", "quick do": "pending", partial: "partial_del",
};

export const CSV_IT_ST = {
  complete: "paid", delivered: "delivered", delivering: "delivered", ongoing: "ordered",
  "ongoing or partial": "partial", ordered: "ordered", "ready in office": "ordered",
  shipped: "delivered", "stocked dumai": "ordered", "stocked office": "ordered",
};

/* ── Factory Functions ── */
export const mkItem = (o = {}) => ({
  id: "", poId: "", itemName: "", desc: "", qty: 1, unit: "pcs", unitPrice: 0,
  discount: 0, discountPct: 0, supplierAssignments: [], status: "pending",
  deliveryDate: "", doNos: [], invoiceNo: "", zoneType: "", hsCode: "", ...o,
});

export const mkAsgn = (o = {}) => ({
  id: "", supplierId: "", pricePerUnit: 0, shippingTotal: 0, role: "main",
  link: "", notes: "", ...o,
});

/* ── Initial PO & Item & DO seed data ── */
export const INIT_POS = [
  { id: "po001", quoteRef: "019/MIA/V/2024",       orderNo: "PTAM/PO/NT/24/00497",  company: "PT. AGRO MURNI",                orderDate: "2024-05-21", prNo: "PTAM/PR/00497", notes: "", folder: "", status: "paid",      priority: "normal", totalLocked: false, manualExPPN: 0,        manualPPN: 0 },
  { id: "po002", quoteRef: "1500/API/09/MDN/2024",  orderNo: "SJIO/REF/PO2411/372",  company: "PT. SUMBER JAYA INDUSTRI OLEO", orderDate: "2024-11-26", prNo: "",              notes: "", folder: "", status: "paid",      priority: "normal", totalLocked: true,  manualExPPN: 1778600,  manualPPN: 195646 },
  { id: "po003", quoteRef: "1529/API/10/MDN/2024",  orderNo: "SJIO/PROJ/PO2410/074", company: "PT. SUMBER JAYA INDUSTRI OLEO", orderDate: "2024-10-16", prNo: "",              notes: "", folder: "", status: "invoiced",  priority: "urgent", totalLocked: true,  manualExPPN: 27748250, manualPPN: 3052307 },
  { id: "po004", quoteRef: "1295/API/05/MDN/2024",  orderNo: "SKL/PO/NT/24/00478",   company: "PT. SIMPANG KANAN LESTARINDO",  orderDate: "2024-05-28", prNo: "",              notes: "", folder: "", status: "confirmed", priority: "normal", totalLocked: false, manualExPPN: 0,        manualPPN: 0 },
  { id: "po005", quoteRef: "1530/API/10/MDN/2024",  orderNo: "SJIO/PROJ/PO2410/068", company: "PT. SUMBER JAYA INDUSTRI OLEO", orderDate: "2024-10-13", prNo: "",              notes: "QUOTATION PRJ", folder: "", status: "pending", priority: "urgent", totalLocked: false, manualExPPN: 0, manualPPN: 0 },
];

export const INIT_ITEMS = [
  mkItem({ id: "item001", poId: "po001", itemName: 'Hydraulic Hose 1"',     desc: "High pressure hose",          qty: 10, unit: "meter", unitPrice: 285000,  supplierAssignments: [mkAsgn({ id: "sa001", supplierId: "SUP001", pricePerUnit: 220000, shippingTotal: 0,     role: "main" })],                                                                                                                     status: "delivered", deliveryDate: "2024-06-01", doNos: ["DO/2024/001"], invoiceNo: "INV/TJ/2024/045", zoneType: "Zone 1 – Lokal",   hsCode: "3917.32.00" }),
  mkItem({ id: "item002", poId: "po001", itemName: 'Hydraulic Fitting 1"',  desc: "Male/female coupling",        qty: 20, unit: "pcs",   unitPrice: 45000,   supplierAssignments: [mkAsgn({ id: "sa002", supplierId: "SUP001", pricePerUnit: 32000, shippingTotal: 0,      role: "main" }), mkAsgn({ id: "sa003", supplierId: "SUP003", pricePerUnit: 31000, shippingTotal: 50000, role: "backup", notes: "Cek stok dulu" })], status: "delivered", deliveryDate: "2024-06-01", doNos: ["DO/2024/001"], invoiceNo: "INV/TJ/2024/045", zoneType: "Zone 1 – Lokal",   hsCode: "7307.99.90" }),
  mkItem({ id: "item003", poId: "po002", itemName: "Pump Impeller",          desc: "Centrifugal pump impeller",   qty: 2,  unit: "pcs",   unitPrice: 750000,  supplierAssignments: [mkAsgn({ id: "sa004", supplierId: "SUP004", pricePerUnit: 580000, shippingTotal: 25000, role: "main" })],                                                                                                                     status: "paid",      deliveryDate: "2024-12-01", doNos: ["DO/2411/001"], invoiceNo: "INV/PS/2411/021", zoneType: "Zone 3 – Nasional", hsCode: "8413.91.90" }),
  mkItem({ id: "item004", poId: "po003", itemName: "Control Valve DN50",     desc: "Ball valve flanged DN50 PN16", qty: 4, unit: "pcs",   unitPrice: 1250000, supplierAssignments: [mkAsgn({ id: "sa005", supplierId: "SUP005", pricePerUnit: 950000, shippingTotal: 0,     role: "main", link: "https://valve.co.id/dn50" }), mkAsgn({ id: "sa006", supplierId: "SUP003", pricePerUnit: 980000, role: "backup" })],   status: "invoiced",  deliveryDate: "2024-10-20", doNos: ["DO/2410/011"], invoiceNo: "INV/VI/2410/055", zoneType: "Zone 2 – Regional", hsCode: "8481.20.00" }),
  mkItem({ id: "item005", poId: "po004", itemName: "Coupling Flange DN80",   desc: "PN16 slip-on flange CS",      qty: 8,  unit: "pcs",   unitPrice: 275000,  supplierAssignments: [mkAsgn({ id: "sa007", supplierId: "SUP003", pricePerUnit: 200000, shippingTotal: 15000, role: "main" })],                                                                                                                     status: "ordered",   zoneType: "Zone 1 – Lokal",   hsCode: "7307.91.00" }),
  mkItem({ id: "item006", poId: "po005", itemName: "Chemical Dosing Pump",   desc: "Dosing pump 50 L/h",          qty: 2,  unit: "unit",  unitPrice: 4500000, supplierAssignments: [mkAsgn({ id: "sa008", supplierId: "SUP006", pricePerUnit: 3800000, shippingTotal: 150000, role: "main", link: "https://grundfos.com" }), mkAsgn({ id: "sa009", supplierId: "SUP004", pricePerUnit: 3900000, role: "backup" })],       status: "pending",   hsCode: "8413.81.90" }),
];

export const INIT_DOS = [
  { id: "do001", doNo: "DO/2024/001", poId: "po001", createdAt: "2024-06-01", deliveryDate: "2024-06-01", fieldValues: { driverName: "Budi Santoso", vehiclePlate: "BK 1234 AB", remarks: "Pengiriman batch pertama" }, lines: [{ itemId: "item001", qtyDelivered: 10, hsCode: "3917.32.00", notes: "" }, { itemId: "item002", qtyDelivered: 20, hsCode: "7307.99.90", notes: "" }] },
  { id: "do002", doNo: "DO/2411/001", poId: "po002", createdAt: "2024-12-01", deliveryDate: "2024-12-01", fieldValues: { driverName: "Joko Prabowo", vehiclePlate: "BK 5678 CD", remarks: "" }, lines: [{ itemId: "item003", qtyDelivered: 2, hsCode: "8413.91.90", notes: "" }] },
  { id: "do003", doNo: "DO/2410/011", poId: "po003", createdAt: "2024-10-20", deliveryDate: "2024-10-20", fieldValues: { driverName: "Ahmad", vehiclePlate: "B 9901 ZZ", remarks: "" }, lines: [{ itemId: "item004", qtyDelivered: 4, hsCode: "8481.20.00", notes: "" }] },
];

/* ── HS Code placeholder database ── */
export const INIT_HS_DB = []; // user manages via Settings
