/**
 * settingsSlice — App configuration and reference data.
 *
 * Methods:
 *   saveSettings(settings)    — persist full settings object to PocketBase
 *   updateSettings(updates)   — patch-update settings (merges with existing)
 *   saveCompanies(list)       — update company list in local state
 *   saveZoneTypes(list)       — update zone type list in local state
 *   addCompany(name)          — add a single company to DB + state
 *   addZoneType(name)         — add a single zone type to DB + state
 *   upsertZoneType(name)      — add zone type only if it doesn't already exist
 *   saveHsDB(list)            — update HS code list in local state
 *   upsertHSCode(code, desc)  — add HS code only if it doesn't already exist
 *   saveUom(list)             — persist UOM list to PocketBase settings record
 *
 * HOW SETTINGS ARE STORED IN POCKETBASE:
 *   The `settings` collection uses a key-value schema:
 *     key = "app_settings" → value = { overdueDays, ppnRate, ... }
 *     key = "uom"          → value = [{ v: "pcs", l: "Pieces" }, ...]
 *   All other settings (companies, zones, hs_codes) have dedicated collections.
 */

import { collections, pbError } from "../../lib/pocketbase";

export function createSettingsSlice(set, get) {
  return {
    /* ── App Settings ───────────────────────────────────────────── */

    saveSettings: async (settings) => {
      try {
        const existing = await collections.settings()
          .getFirstListItem('key="app_settings"').catch(() => null);

        if (existing) {
          await collections.settings().update(existing.id, { key: "app_settings", value: settings });
        } else {
          await collections.settings().create({ key: "app_settings", value: settings });
        }
        set({ settings });
      } catch (error) {
        console.error("Failed to save settings:", error);
        get().toast(pbError(error, "simpan settings"));
      }
    },

    updateSettings: async (updates) => {
      try {
        const merged = { ...get().settings, ...updates };
        await get().saveSettings(merged);
        return true;
      } catch (error) {
        console.error("Failed to update settings:", error);
        return false;
      }
    },

    /* ── Companies ──────────────────────────────────────────────── */

    saveCompanies: async (companies) => {
      // Local-only update; the canonical list comes from init() on reload
      set({ companies });
    },

    addCompany: async (compObj) => {
      try {
        const name = typeof compObj === "string" ? compObj : compObj.name;
        const record = await collections.companies().create({ name });
        set((s) => ({ companies: [...s.companies, record.name] }));
      } catch (error) {
        console.error("Failed to add company:", error);
      }
    },

    /* ── Zone Types ─────────────────────────────────────────────── */

    saveZoneTypes: async (zoneTypes) => {
      // Local-only update; canonical list comes from init() on reload
      set({ zoneTypes });
    },

    addZoneType: async (zoneObj) => {
      try {
        const name = typeof zoneObj === "string" ? zoneObj : zoneObj.name;
        const saved = await collections.zoneTypes().create({ name });
        set((s) => ({ zoneTypes: [...s.zoneTypes, saved.name] }));
      } catch (error) {
        console.error("Failed to add zone type:", error);
      }
    },

    upsertZoneType: async (name) => {
      if (!name) return;
      try {
        const alreadyExists = get().zoneTypes.some(
          (z) => z.toLowerCase() === name.toLowerCase()
        );
        if (!alreadyExists) {
          const saved = await collections.zoneTypes().create({ name });
          set((s) => ({ zoneTypes: [...s.zoneTypes, saved.name] }));
        }
      } catch {
        // Ignore duplicate errors from server
      }
    },

    /* ── HS Codes ───────────────────────────────────────────────── */

    saveHsDB: async (hsDB) => {
      set({ hsDB });
    },

    upsertHSCode: async (code, desc = "") => {
      if (!code) return;
      try {
        const alreadyExists = get().hsDB.some((h) => h.code === code);
        if (!alreadyExists) {
          const saved = await collections.hsCodes().create({ code, desc });
          set((s) => ({ hsDB: [...s.hsDB, { code: saved.code, desc: saved.desc }] }));
        }
      } catch {
        // Ignore duplicate errors from server
      }
    },

    /* ── UOM ────────────────────────────────────────────────────── */

    saveUom: async (uom) => {
      try {
        const existing = await collections.settings()
          .getFirstListItem('key="uom"').catch(() => null);

        if (existing) {
          await collections.settings().update(existing.id, { key: "uom", value: uom });
        } else {
          await collections.settings().create({ key: "uom", value: uom });
        }
        set({ uom });
      } catch (error) {
        console.error("Failed to save UOM:", error);
      }
    },
  };
}
