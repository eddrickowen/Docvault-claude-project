/**
 * HelpModal — Keyboard shortcuts + feature quick-reference.
 *
 * Triggered by the ? button in the topbar or by pressing ? on the keyboard.
 * Designed for non-technical users who need a cheat sheet for the app.
 */

import { useEffect } from "react";
import { Modal } from "./Modal";
import { exportCSV } from "../../lib/helpers";

/* ── Data ──────────────────────────────────────────────────────────────── */

const SHORTCUTS = [
  { keys: ["N"],           desc: "Buat PO baru" },
  { keys: ["I"],           desc: "Buka halaman Inventory / Stock" },
  { keys: ["/"],           desc: "Fokus ke kotak pencarian" },
  { keys: ["Ctrl", "Z"],   desc: "Undo (batalkan aksi terakhir)" },
  { keys: ["Ctrl", "Y"],   desc: "Redo (ulangi aksi yang dibatalkan)" },
  { keys: ["Esc"],         desc: "Batalkan pilihan massal (bulk select)" },
  { keys: ["?"],           desc: "Buka panduan ini" },
];

const TIPS = [
  {
    icon: "▶",
    title: "Expand baris PO",
    desc: "Klik baris mana saja untuk melihat item, DO, dan detail lengkap PO.",
  },
  {
    icon: "☑",
    title: "Pilih massal",
    desc: "Centang checkbox di kiri baris untuk memilih beberapa PO sekaligus. Tersedia aksi: ubah status, hapus, copy ke clipboard.",
  },
  {
    icon: "▲▼",
    title: "Sort & Filter kolom",
    desc: "Klik header kolom untuk sort. Klik ikon ▾ di header untuk filter by value, rentang tanggal, atau teks.",
  },
  {
    icon: "🚚",
    title: "Buat Surat Jalan (DO)",
    desc: "Klik ikon truk di baris PO, atau dari panel item yang sudah di-expand.",
  },
  {
    icon: "📥",
    title: "Import CSV / TSV",
    desc: 'Klik tombol "Import CSV / TSV" di toolbar Purchase Orders. File harus memiliki kolom: No PO, Perusahaan, Nama Item (minimal).',
  },
  {
    icon: "📋",
    title: "Copy ke Excel",
    desc: "Tombol Copy TSV menyalin data tabel ke clipboard — langsung paste ke Excel atau Google Sheets.",
  },
  {
    icon: "↶",
    title: "Undo / Redo",
    desc: "Ctrl+Z membatalkan aksi terakhir (hapus, edit status, dll). Hanya berlaku selama sesi ini — reset saat halaman di-refresh.",
  },
];

const IMPORT_COLS = [
  { col: "No PO",       req: true,  note: "Nomor PO. Baris dengan No PO kosong akan meneruskan PO sebelumnya." },
  { col: "Perusahaan",  req: true,  note: "Nama perusahaan / buyer." },
  { col: "Nama Item",   req: true,  note: "Nama barang. Baris ini wajib ada agar item tersimpan." },
  { col: "Tgl Order",   req: false, note: "Format: YYYY-MM-DD, DD/MM/YYYY, atau nama bulan (Jan, Feb…)." },
  { col: "Qty",         req: false, note: "Jumlah. Default 1 jika kosong." },
  { col: "Satuan",      req: false, note: "pcs, unit, box, kg, dll." },
  { col: "Harga Satuan",req: false, note: "Angka tanpa titik/koma ribuan, atau format Rp." },
  { col: "Status Item", req: false, note: "ordered / delivered / invoiced / paid." },
  { col: "Tgl Kirim",   req: false, note: "Tanggal delivery. Format sama seperti Tgl Order." },
  { col: "No Invoice",  req: false, note: "Nomor invoice jika sudah ada." },
  { col: "HS Code",     req: false, note: "Kode HS tarif bea cukai." },
  { col: "Zona",        req: false, note: "Zona pengiriman." },
];

/* ── Sub-components ────────────────────────────────────────────────────── */

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 bg-surface border border-border-strong rounded text-[10px] font-mono font-bold text-text-primary leading-none">
      {children}
    </kbd>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[.08em] mb-2 mt-4 first:mt-0">
        {title}
      </div>
      {children}
    </div>
  );
}

const TEMPLATE_HEADERS = IMPORT_COLS.map((c) => c.col);
const TEMPLATE_SAMPLE  = ["PO-2025-001", "PT. Contoh Jaya", "Kabel NYY 3x2.5mm", "2025-01-15", "100", "meter", "45000", "ordered", "", "", "8544.42", "Zona A"];

function downloadTemplate() {
  exportCSV(TEMPLATE_HEADERS, [TEMPLATE_SAMPLE], "Template_Import_PO.csv");
}

/* ── Main component ────────────────────────────────────────────────────── */

export function HelpModal({ onClose }) {
  // Also close on Escape (Modal handles this, but be explicit)
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Modal title="Panduan & Shortcut" onClose={onClose} width={720}>
      <div className="flex gap-6 overflow-hidden" style={{ maxHeight: "70vh" }}>

        {/* ── Left column: shortcuts + tips ── */}
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 min-w-0">

          <Section title="Keyboard Shortcut">
            <div className="flex flex-col gap-1">
              {SHORTCUTS.map(({ keys, desc }) => (
                <div key={keys.join("+")} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-surface-alt">
                  <div className="flex gap-1 shrink-0">
                    {keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        <Kbd>{k}</Kbd>
                        {i < keys.length - 1 && <span className="text-[10px] text-text-muted">+</span>}
                      </span>
                    ))}
                  </div>
                  <span className="text-[12px] text-text-secondary flex-1">{desc}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Tips Penggunaan">
            <div className="flex flex-col gap-2">
              {TIPS.map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-3 py-2 px-2 rounded hover:bg-surface-alt items-start">
                  <span className="text-[14px] w-5 text-center shrink-0 mt-px">{icon}</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-text-primary">{title}</div>
                    <div className="text-[11px] text-text-secondary leading-relaxed mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Divider ── */}
        <div className="w-px bg-border-default shrink-0" />

        {/* ── Right column: import format ── */}
        <div className="w-[260px] shrink-0 overflow-y-auto flex flex-col gap-3">
          <Section title="Format Kolom Import CSV">
            <p className="text-[11px] text-text-secondary leading-relaxed mb-2">
              Baris pertama harus berupa header. Nama kolom tidak case-sensitive dan dapat dipetakan secara manual saat import.
            </p>
            <button
              onClick={downloadTemplate}
              className="w-full mb-3 px-2 py-1.5 rounded text-[11px] font-semibold bg-brand-soft border border-brand-mid text-brand hover:bg-brand hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              ⬇ Download Template CSV
            </button>
            <div className="flex flex-col gap-0.5">
              {IMPORT_COLS.map(({ col, req, note }) => (
                <div key={col} className="py-1.5 px-2 rounded hover:bg-surface-alt">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-text-primary font-mono">{col}</span>
                    {req
                      ? <span className="text-[9px] font-bold text-red bg-red-soft border border-red-mid px-1 py-px rounded">WAJIB</span>
                      : <span className="text-[9px] text-text-muted bg-surface border border-border-default px-1 py-px rounded">opsional</span>
                    }
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 leading-snug">{note}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>

      </div>
    </Modal>
  );
}
