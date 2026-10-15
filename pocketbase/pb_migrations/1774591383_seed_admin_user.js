/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Seed default admin user.
 *
 * Creates admin.api@gmail.com / admin123!45 if no users exist yet.
 * Skipped automatically if users are already in the database.
 *
 * IMPORTANT: Change the password after first login via
 *   http://localhost:8090/_/ → Collections → users → [record] → Edit
 */

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId("_pb_users_auth_");

  // Skip if any user already exists — don't overwrite existing accounts
  try {
    const existing = app.findRecordsByFilter("_pb_users_auth_", "id != ''", "", 1, 0);
    if (existing && existing.length > 0) {
      return; // already have users, nothing to do
    }
  } catch (e) {
    // findRecordsByFilter may throw on empty collections — safe to continue
  }

  const record = new Record(usersCol, {
    email:           "admin.api@gmail.com",
    password:        "admin123!45",
    passwordConfirm: "admin123!45",
    verified:        true,
  });

  return app.save(record);

}, (app) => {
  // Rollback: remove the seeded account
  try {
    const record = app.findFirstRecordByData("_pb_users_auth_", "email", "admin.api@gmail.com");
    if (record) app.delete(record);
  } catch (e) {
    // Record may not exist — ignore
  }
});
