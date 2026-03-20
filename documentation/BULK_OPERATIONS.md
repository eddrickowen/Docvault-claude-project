# Bulk Operations Documentation

This document explains how to implement and maintain high-performance bulk operations in DocVault using custom PocketBase hooks.

## 🚀 Bulk Delete System

To achieve deletions of 50-100+ records in under 2 seconds, we use a custom server-side endpoint that bypassed individual record processing.

### 1. The custom Hook: `bulk_delete.pb.js`
- **Location**: `C:/pocketbase/pb_hooks/bulk_delete.pb.js`
- **Route**: `POST /api/bulk-delete`
- **Performance Key**: Uses raw SQL `DELETE FROM ... WHERE poId IN (...)`.
- **Integrity**: Wrapped in `$app.dao().runInTransaction()` to ensure that if one delete fails, none are deleted (Rollback).

### 2. Implementation Pattern
When adding new bulk operations (e.g., bulk status update), follow this pattern:

#### Backend (JSVM)
```javascript
routerAdd("POST", "/api/bulk-action", (e) => {
    const data = $apis.requestInfo(e).data;
    const ids = data.ids;
    const idList = ids.map(id => `'${id}'`).join(',');

    $app.dao().runInTransaction((txDao) => {
        const db = txDao.db();
        // Use db.newQuery(...) for max speed
        db.newQuery(`UPDATE your_table SET status = 'xxx' WHERE id IN (${idList})`).execute();
    });
    return e.json(200, { success: true });
});
```

#### Frontend (Zustand)
```javascript
bulkAction: async (ids) => {
    const response = await pb.send("/api/bulk-action", {
        method: "POST",
        body: { ids } // SDK handles JSON stringify
    });
    // Update local state by filtering or mapping
}
```

---

## 🛠️ Troubleshooting & Troubleshooting

### Error: `Object has no member 'runInTransaction'`
- **Cause**: Trying to call `runInTransaction` on the `$app` object directly in PocketBase 0.22+.
- **Fix**: Use `$app.dao().runInTransaction()`.

### Error: `400 Bad Request (Missing ids)`
- **Cause**: Request body not being parsed or incorrectly formatted.
- **Fix**: Ensure `pb.send` uses `body: { ids }` (raw object) and the hook uses `$apis.requestInfo(e).data`.

---

## 📈 Future Ideas
- **Bulk Status Print**: Create a single PDF for 50 POs on the server.
- **Bulk Import Reconciliation**: Compare 100+ items against a CSV in a single SQL pass.

*Optimized for speed. Built for scale.* 🏎️🏢💎
