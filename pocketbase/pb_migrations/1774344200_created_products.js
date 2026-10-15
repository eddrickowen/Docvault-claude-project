/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create products (inventory) collection.
 *
 * Rewrites the original migration which used the deprecated "schema" array
 * format. This version uses the current "fields" format so PocketBase
 * correctly creates all custom fields.
 *
 * If the collection already exists (from the broken first run), PocketBase
 * will skip creation — run the rollback first via the Admin UI if needed:
 *   http://localhost:8090/_/ → Collections → products → Delete
 */
migrate((app) => {
  // If collection already exists (possibly broken from old migration), delete it first
  try {
    const existing = app.findCollectionByNameOrId("products");
    if (existing) app.delete(existing);
  } catch (_) { /* didn't exist, continue */ }

  const collection = new Collection({
    "id":     "pbc_products_01",
    "name":   "products",
    "type":   "base",
    "system": false,
    "fields": [
      {
        "id": "text_sku", "name": "sku", "type": "text",
        "required": true, "presentable": false, "hidden": false,
        "min": null, "max": null, "pattern": ""
      },
      {
        "id": "text_name", "name": "name", "type": "text",
        "required": true, "presentable": true, "hidden": false,
        "min": null, "max": null, "pattern": ""
      },
      {
        "id": "text_desc", "name": "desc", "type": "text",
        "required": false, "presentable": false, "hidden": false,
        "min": null, "max": null, "pattern": ""
      },
      {
        "id": "text_uom", "name": "uom", "type": "text",
        "required": false, "presentable": false, "hidden": false,
        "min": null, "max": null, "pattern": ""
      },
      {
        "id": "num_stockLevel", "name": "stockLevel", "type": "number",
        "required": false, "presentable": false, "hidden": false,
        "min": null, "max": null, "onlyInt": false
      },
      {
        "id": "num_safetyStock", "name": "safetyStock", "type": "number",
        "required": false, "presentable": false, "hidden": false,
        "min": null, "max": null, "onlyInt": false
      },
      {
        "id": "num_unitCost", "name": "unitCost", "type": "number",
        "required": false, "presentable": false, "hidden": false,
        "min": null, "max": null, "onlyInt": false
      },
      {
        "id": "num_unitPrice", "name": "unitPrice", "type": "number",
        "required": false, "presentable": false, "hidden": false,
        "min": null, "max": null, "onlyInt": false
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX idx_products_sku ON products (sku)"
    ],
    "listRule":   "@request.auth.id != \"\"",
    "viewRule":   "@request.auth.id != \"\"",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  });

  return app.save(collection);

}, (app) => {
  try {
    const col = app.findCollectionByNameOrId("products");
    if (col) app.delete(col);
  } catch (_) {}
});
