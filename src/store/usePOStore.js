/**
 * usePOStore — Main Zustand store for DocVault.
 *
 * This file is the SINGLE ENTRY POINT for all app state.
 * Business logic is split into focused slice files under ./slices/:
 *
 *   syncPOStatuses.js  — pure function: keeps PO ↔ item statuses consistent
 *   initSlice.js       — bootstrap: load all data from PocketBase + real-time subscriptions
 *   poSlice.js         — Purchase Order CRUD (add, update, delete, bulk ops)
 *   itemSlice.js       — Line item CRUD + auto stock adjustment
 *   supplierSlice.js   — Supplier master data CRUD
 *   doSlice.js         — Delivery Order CRUD
 *   settingsSlice.js   — App settings, companies, zones, HS codes, UOM
 *   productSlice.js    — Product catalog CRUD
 *   undoSlice.js       — Client-side undo/redo (in-memory snapshots)
 *
 * USAGE in components:
 *   import { usePOStore } from "../store/usePOStore";
 *
 *   // Select only what you need to avoid unnecessary re-renders
 *   const pos = usePOStore(s => s.pos);
 *   const addPO = usePOStore(s => s.addPO);
 *
 *   // Or destructure multiple values (component re-renders on any change)
 *   const { pos, items, suppliers } = usePOStore();
 */

import { create } from "zustand";
import { createInitSlice }     from "./slices/initSlice";
import { createPOSlice }       from "./slices/poSlice";
import { createItemSlice }     from "./slices/itemSlice";
import { createSupplierSlice } from "./slices/supplierSlice";
import { createDOSlice }       from "./slices/doSlice";
import { createSettingsSlice } from "./slices/settingsSlice";
import { createProductSlice }  from "./slices/productSlice";
import { createUndoSlice }     from "./slices/undoSlice";

export const usePOStore = create((set, get) => ({
  /* ── State ─────────────────────────────────────────────────────────
   * Declare all state here so the shape is visible in one place.
   * Methods that mutate this state live in the slice files above.
   * ──────────────────────────────────────────────────────────────── */

  // Core data (loaded from PocketBase on init)
  pos:       [],  // Purchase Orders
  items:     [],  // Line items (each belongs to one PO via poId)
  suppliers: [],  // Supplier master records
  dos:       [],  // Delivery Orders (Surat Jalan)
  products:  [],  // Product / inventory catalog

  // Reference data (loaded from settings collection)
  companies: [],  // Company name list (used in dropdowns)
  zoneTypes: [],  // Zone type list (e.g. "Zona 1", "Luar Kota")
  hsDB:      [],  // HS code database [{ code, desc }]
  uom:       [],  // Unit of measure options [{ v, l }]
  settings:  {},  // App config (ppnRate, overdueDays, doFormat, etc.)

  // App state
  _loaded:        false,  // True once init() has completed
  _toast:         null,   // Active toast: { id, msg } | null
  jumpTargetPOId: null,   // Cross-page navigation: jump to this PO on next render
  triggerNewPO:   false,  // Cross-page signal: open "New PO" form

  // Undo/redo (in-memory only, resets on page reload)
  history:      [],  // Array of snapshots: [{ pos, items, suppliers, dos, label, timestamp }]
  historyIndex: -1,  // Points to the "current" snapshot; -1 = nothing to undo

  /* ── Utility actions (kept here — too small for their own slice) ─ */

  toast: (msg) => {
    const id = Date.now();
    set({ _toast: { id, msg } });
    // Auto-dismiss after 2.5s (matches useToast display duration)
    setTimeout(() => set((s) => (s._toast?.id === id ? { _toast: null } : {})), 2500);
  },

  setJumpTargetPO:  (id)  => set({ jumpTargetPOId: id }),
  setTriggerNewPO:  (val) => set({ triggerNewPO: val }),

  /* ── Slices ─────────────────────────────────────────────────────── */
  ...createInitSlice(set, get),
  ...createPOSlice(set, get),
  ...createItemSlice(set, get),
  ...createSupplierSlice(set, get),
  ...createDOSlice(set, get),
  ...createSettingsSlice(set, get),
  ...createProductSlice(set, get),
  ...createUndoSlice(set, get),
}));
