/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Security — User Roles + Tightened Collection Rules
 *
 * 1. Adds a `role` field (admin | member) to the users auth collection.
 *    After this migration runs, set your own account to admin via:
 *      http://localhost:8090/_/ → Collections → users → [your record] → role = admin
 *
 * 2. Tightens delete rules: only admin can delete records.
 *    Settings writes also require admin.
 *    All read/create/update remain open to any authenticated user.
 */

const AUTH  = '@request.auth.id != ""';
const ADMIN = '@request.auth.role = "admin"';

const DATA_COLS     = ["pos", "items", "dos", "suppliers", "companies", "zone_types", "hs_codes", "products"];
const SETTINGS_COL  = "settings";

migrate((app) => {
  // ── 1. Add role field to users collection ────────────────────────────────
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  // Append the role field without touching existing fields
  unmarshal({
    schema: [
      {
        name:     "role",
        type:     "select",
        required: false,
        options: { maxSelect: 1, values: ["admin", "member"] },
      },
    ],
  }, users);
  return app.save(users);

  // ── 2. Tighten delete rules on main data collections ─────────────────────
  for (const name of DATA_COLS) {
    const col = app.findCollectionByNameOrId(name);
    unmarshal({ listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: ADMIN }, col);
    app.save(col);
  }

  // ── 3. Lock settings writes to admin ─────────────────────────────────────
  const settings = app.findCollectionByNameOrId(SETTINGS_COL);
  unmarshal({ listRule: AUTH, viewRule: AUTH, createRule: ADMIN, updateRule: ADMIN, deleteRule: ADMIN }, settings);
  return app.save(settings);

}, (app) => {
  // Rollback: restore all rules to any-auth
  for (const name of [...DATA_COLS, SETTINGS_COL]) {
    const col = app.findCollectionByNameOrId(name);
    unmarshal({ listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: AUTH }, col);
    app.save(col);
  }
  // Remove role field
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  unmarshal({ schema: users.schema.filter((f) => f.name !== "role") }, users);
  return app.save(users);
});
