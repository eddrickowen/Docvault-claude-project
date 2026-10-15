/**
 * productSlice — Product / Inventory catalog CRUD.
 *
 * Methods:
 *   addProduct(product)     — create a new product in the catalog
 *   updateProduct(product)  — update product fields (name, price, stock, etc.)
 *   deleteProduct(id)       — permanently remove a product
 *
 * NOTE on stock levels:
 *   stockLevel is adjusted automatically by itemSlice.updateItem() when an
 *   item's status changes to/from "delivered". Direct stock edits via this
 *   slice are for manual corrections only (e.g. physical count adjustments).
 *
 * FIELDS (from PocketBase `products` collection):
 *   sku, name, desc, uom, stockLevel, safetyStock, unitCost, unitPrice
 */

import { collections, cleanRecord, pbError } from "../../lib/pocketbase";
import { logAct } from "../useActivityStore";

export function createProductSlice(set, get) {
  return {
    addProduct: async (product) => {
      try {
        const saved = await collections.products().create(cleanRecord(product));
        set((s) => ({ products: [...s.products, saved] }));
        logAct({
          type:       "product_added",
          title:      `New Product: ${saved.name}`,
          detail:     `SKU: ${saved.sku}`,
          entityId:   saved.id,
          entityType: "product",
        });
      } catch (error) {
        console.error("Failed to add product:", error);
        get().toast("⚠️ Gagal tambah produk: " + error.message);
      }
    },

    updateProduct: async (product) => {
      try {
        const updated = await collections.products().update(product.id, cleanRecord(product));
        set((s) => ({ products: s.products.map((x) => (x.id === product.id ? updated : x)) }));
        logAct({
          type:       "product_updated",
          title:      `Product Updated: ${updated.name}`,
          entityId:   updated.id,
          entityType: "product",
        });
      } catch (error) {
        console.error("Failed to update product:", error);
        get().toast("⚠️ Gagal update produk: " + error.message);
      }
    },

    deleteProduct: async (id) => {
      try {
        const product = get().products.find((p) => p.id === id);
        await collections.products().delete(id);
        set((s) => ({ products: s.products.filter((x) => x.id !== id) }));
        logAct({
          type:       "product_deleted",
          title:      `Product Deleted: ${product?.name || id}`,
          entityId:   id,
          entityType: "product",
        });
      } catch (error) {
        console.error("Failed to delete product:", error);
        get().toast(pbError(error, "hapus produk"));
      }
    },
  };
}
