/**
 * initSlice — app bootstrap and PocketBase real-time subscriptions.
 *
 * Responsibilities:
 *   - init(): load all collections from PocketBase in parallel on app start
 *   - _subscribeToRealtime(): open WebSocket listeners for live updates
 *   - _unsubscribeRealtime(): clean up all listeners (call on logout)
 *
 * IMPORTANT: _unsubscribeRealtime must be called before any bulk
 * operation (bulk delete, bulk import) to avoid thousands of real-time
 * events freezing the UI. Re-subscribe after the operation completes.
 */

import { pb, collections, dbHelpers } from "../../lib/pocketbase";
import { logger } from "../../lib/logger";
import {
  INIT_POS, INIT_ITEMS, INIT_SUPPLIERS, INIT_DOS,
  INIT_COMPANIES, INIT_ZONE_TYPES, INIT_SETTINGS, INIT_HS_DB, UOM_OPTIONS,
  EMPTY_STORE_STATE,
} from "../../lib/constants";
import { syncPOStatuses } from "./syncPOStatuses";

export function createInitSlice(set, get) {
  return {
    /* ── Bootstrap ─────────────────────────────────────────────────── */

    init: async () => {
      if (!pb.authStore.isValid) {
        logger.warn("Init skipped: not authenticated");
        return;
      }
      logger.log("Loading data from PocketBase...");

      try {
        // Fetch all collections concurrently for fast startup
        const [
          pos, items, suppliers, dos,
          companies, zoneTypes, hsDB, products,
          settingsRows, uomRow,
        ] = await Promise.all([
          dbHelpers.getAll("pos"),
          dbHelpers.getAll("items"),
          dbHelpers.getAll("suppliers"),
          dbHelpers.getAll("dos"),
          dbHelpers.getAll("companies"),
          dbHelpers.getAll("zone_types"),
          dbHelpers.getAll("hs_codes"),
          dbHelpers.getAll("products"),
          collections.settings().getFullList().catch(() => []),
          collections.settings().getFirstListItem('key="uom"').catch(() => null),
        ]);

        // Settings is stored as a JSON blob under key "app_settings"
        const settingsRecord = settingsRows.find((r) => r.key === "app_settings");
        const settings = settingsRecord?.value || INIT_SETTINGS;

        // UOM is stored as a separate settings record under key "uom"
        const uom = uomRow?.value || UOM_OPTIONS;

        set({
          pos,
          items,
          suppliers,
          dos,
          products,
          companies:  companies.map((c) => c.name || c),
          zoneTypes:  zoneTypes.map((z) => z.name || z),
          hsDB:       hsDB.map((h) => ({ code: h.code, desc: h.desc })),
          settings,
          uom,
          _loaded: true,
        });

        logger.log("Data loaded:", { pos: pos.length, items: items.length });

        // Ensure no duplicate subscriptions before opening new ones
        get()._unsubscribeRealtime();
        get()._subscribeToRealtime();

      } catch (error) {
        console.error("Failed to load data:", error);
        get().toast("⚠️ Gagal terhubung ke server. Menggunakan mode offline.");

        // Fallback to empty/demo state so the app still renders
        set({
          pos: INIT_POS, items: INIT_ITEMS, suppliers: INIT_SUPPLIERS,
          dos: INIT_DOS, companies: INIT_COMPANIES, zoneTypes: INIT_ZONE_TYPES,
          settings: INIT_SETTINGS, hsDB: INIT_HS_DB, uom: UOM_OPTIONS,
          _loaded: true,
        });
      }
    },

    /* ── Real-time Subscriptions ────────────────────────────────────── */

    _subscribeToRealtime: () => {
      logger.log("Opening real-time subscriptions...");

      // Generic handler factory — handles create/update/delete for any collection
      // Items need special treatment because they trigger PO status sync
      pb.collection("pos").subscribe("*", (e) => {
        set((s) => {
          if (e.action === "create") return { pos: [...s.pos, e.record] };
          if (e.action === "update") return { pos: s.pos.map((p) => p.id === e.record.id ? e.record : p) };
          if (e.action === "delete") return { pos: s.pos.filter((p) => p.id !== e.record.id) };
        });
      });

      pb.collection("items").subscribe("*", (e) => {
        set((s) => {
          let newItems = s.items;
          if (e.action === "create") newItems = [...s.items, e.record];
          if (e.action === "update") newItems = s.items.map((i) => i.id === e.record.id ? e.record : i);
          if (e.action === "delete") newItems = s.items.filter((i) => i.id !== e.record.id);
          // Item changes may require PO status recalculation
          const synced = syncPOStatuses(s.pos, newItems);
          return { items: synced.items, pos: synced.pos };
        });
      });

      pb.collection("suppliers").subscribe("*", (e) => {
        set((s) => {
          if (e.action === "create") return { suppliers: [...s.suppliers, e.record] };
          if (e.action === "update") return { suppliers: s.suppliers.map((x) => x.id === e.record.id ? e.record : x) };
          if (e.action === "delete") return { suppliers: s.suppliers.filter((x) => x.id !== e.record.id) };
        });
      });

      pb.collection("dos").subscribe("*", (e) => {
        set((s) => {
          if (e.action === "create") return { dos: [...s.dos, e.record] };
          if (e.action === "update") return { dos: s.dos.map((d) => d.id === e.record.id ? e.record : d) };
          if (e.action === "delete") return { dos: s.dos.filter((d) => d.id !== e.record.id) };
        });
      });

      pb.collection("products").subscribe("*", (e) => {
        set((s) => {
          if (e.action === "create") return { products: [...s.products, e.record] };
          if (e.action === "update") return { products: s.products.map((p) => p.id === e.record.id ? e.record : p) };
          if (e.action === "delete") return { products: s.products.filter((p) => p.id !== e.record.id) };
        });
      });

      logger.log("Real-time subscriptions active");
    },

    _unsubscribeRealtime: () => {
      logger.log("Closing real-time subscriptions...");
      ["pos", "items", "suppliers", "dos", "products"].forEach((col) => {
        pb.collection(col).unsubscribe().catch(() => {});
      });
    },

    /**
     * logout — full teardown before clearing auth.
     *
     * Call this BEFORE pb.authStore.clear() so subscriptions are always
     * closed while the connection is still valid. Resets all store data so
     * the app is in a clean state if the page is ever reused without a reload.
     */
    logout: () => {
      get()._unsubscribeRealtime();
      set({ ...EMPTY_STORE_STATE, _loaded: false });
      logger.log("Store cleared on logout");
    },
  };
}
