/**
 * supplierSlice — Supplier master data CRUD.
 *
 * Methods:
 *   addSupplier(supplier)     — create or update a supplier record
 *   updateSupplier(supplier)  — update supplier fields
 *   archiveSupplier(id)       — soft delete: sets deletedAt = today, keeps record in DB
 *   deleteSupplier(id)        — hard delete: permanently removes the record
 *
 * WHY soft delete (archiveSupplier)?
 *   Items may reference a supplier by ID in supplierAssignments.
 *   Hard-deleting would orphan those references. Archiving hides the
 *   supplier from dropdowns while preserving data integrity.
 */

import { collections, cleanRecord, pbError } from "../../lib/pocketbase";
import { today } from "../../lib/helpers";
import { logAct } from "../useActivityStore";

export function createSupplierSlice(set, get) {
  return {
    addSupplier: async (supplier) => {
      try {
        const existing = supplier.id && get().suppliers.find((s) => s.id === supplier.id);
        const saved = existing
          ? await collections.suppliers().update(supplier.id, cleanRecord(supplier))
          : await collections.suppliers().create(cleanRecord(supplier));

        set((s) => {
          const newSup = s.suppliers.find((x) => x.id === saved.id)
            ? s.suppliers.map((x) => (x.id === saved.id ? saved : x))
            : [...s.suppliers, saved];
          return { suppliers: newSup };
        });

        logAct({
          type:       existing ? "supplier_updated" : "supplier_added",
          title:      `${existing ? "Updated" : "New"} Supplier: ${saved.name}`,
          entityId:   saved.id,
          entityType: "supplier",
        });

      } catch (error) {
        console.error("Failed to save supplier:", error);
        get().toast("⚠️ Gagal menyimpan supplier: " + error.message);
      }
    },

    updateSupplier: async (supplier) => {
      try {
        const updated = await collections.suppliers().update(supplier.id, supplier);
        set((s) => ({ suppliers: s.suppliers.map((x) => (x.id === supplier.id ? updated : x)) }));
      } catch (error) {
        console.error("Failed to update supplier:", error);
        get().toast("⚠️ Gagal update supplier: " + error.message);
      }
    },

    archiveSupplier: async (id) => {
      try {
        // Soft delete — record stays in DB, hidden from active dropdowns via deletedAt filter
        const updated = await collections.suppliers().update(id, { deletedAt: today() });
        set((s) => ({ suppliers: s.suppliers.map((sup) => (sup.id === id ? updated : sup)) }));
      } catch (error) {
        console.error("Failed to archive supplier:", error);
        get().toast("⚠️ Gagal arsip supplier: " + error.message);
      }
    },

    deleteSupplier: async (id) => {
      try {
        await collections.suppliers().delete(id);
        set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) }));
      } catch (error) {
        console.error("Failed to delete supplier:", error);
        get().toast(pbError(error, "hapus supplier"));
      }
    },
  };
}
