# DocVault — ERP & Software Development Audit Report

> **App**: DocVault (Purchase Order Management System)  
> **Stack**: React + Zustand + IndexedDB (idb-keyval) + Vite  
> **Date**: 2026-03-18

---

## Summary Table

| Category | Issues Found | Priority |
|---|---|---|
| 🔴 Data Integrity & Business Logic | 8 | Critical |
| 🟠 State Management & Persistence | 5 | High |
| 🟡 ERP Domain Logic | 6 | High |
| 🟡 UI/UX & Usability | 8 | Medium |
| 🟢 Code Quality & Architecture | 7 | Medium |
| 🔵 Performance & Scalability | 5 | Medium |
| 🔵 Reporting & Export | 4 | Low–Medium |
| ⚪ Security & Compliance | 4 | Low |

---

## 🔴 Critical — Data Integrity & Business Logic

### 1. PO Status Sync Has Logical Gap: `"draft"` State Never Triggered
**File**: [usePOStore.js](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#L52-L101)

- [syncPOStatuses()](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#48-102) only promotes status, never demotes to `"draft"` — if a PO has **zero items**, it stays at its current status (e.g. `"confirmed"`) instead of reverting to `"draft"`.
- **Fix**: When `poItems.length === 0` after item deletion, reset PO status to `"draft"`.

### 2. Duplicate PO on [addPO](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#141-153): No Deduplication Guard for Items
**File**: [usePOStore.js](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#L142-L152)

- [addPO](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#141-153) with `draftItems` merges by item ID, but **if the same item ID appears in both `s.items` and `draftItems`**, the deduplication logic (`ids` Set) only keeps the new version. Old items for *other* POs are fine, but re-importing the **same PO** with partial items risks silently dropping existing items not in `draftItems`.
- **Fix**: Explicitly document or guard against partial upserts; warn user on re-import.

### 3. [deleteDO](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#263-281) Restores Item Status to `"ordered"` Unconditionally
**File**: [usePOStore.js](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#L274)

```js
const newStatus = total >= i.qty ? "delivered" : total > 0 ? "partial" : "ordered";
```
- If an item was previously `"invoiced"` or `"paid"`, deleting a DO retroactively demotes it to `"ordered"`.
- **Fix**: Only downgrade if `total === 0` AND current status is not `"invoiced"` / `"paid"`.

### 4. [saveDO](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#235-262) Does Not Check for Existing DO (No Idempotency)
**File**: [usePOStore.js](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#L236)

- [saveDO](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#235-262) always appends `doObj` to `dos` array — calling it twice with the same DO creates duplicates.
- **Fix**: Check for existing `doObj.id` before push; upsert semantics like [addPO](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#141-153).

### 5. [isIncompletePO](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#12-15) Flags POs With `orderNo === "Order"` — But Duplicated POs Start With That Value  
**File**: [helpers.js](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#L12-L14), [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#L764)

- Duplicate PO action sets `orderNo: "Order"` — these immediately appear as "Info Parsial" warnings on Dashboard. User must remember to change the number.
- **Fix**: On duplicate, generate a meaningful placeholder like `"COPY-${po.orderNo}"` or auto-open the edit form.

### 6. Margin Calculation Ignores Discount in Buy Price
**File**: [helpers.js](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#L188-L192)

- [itemBuy(i)](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#188-192) uses `pricePerUnit * qty + shippingTotal` — no discount is deducted from sell side in margin. [itemNet(i)](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#186-188) already applies discount for sell price, but buy-side costs like custom duties, taxes, or additional fees have no field.
- **Fix**: Consider adding `additionalCost` field to supplier assignment or at least document the scope of [itemBuy](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#188-192).

### 7. [parseSmartDate](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#81-94) Year Rollover Bug
**File**: [helpers.js](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#L88)

```js
if (y < 100) y += y < 50 ? 2000 : 1900;
```
- Year `"50"` resolves to `1950`, not `2050`. This threshold hasn't aged well — in 2026 a 2-digit `"26"` correctly maps to `2026`, but `"50"` = `1950` could corrupt imported delivery date data.
- **Fix**: Use `y < 30 ? 2000 : 1900` (industry-standard 30-year pivot) or require 4-digit years.

### 8. [uid()](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#4-6) Collision Risk Under Load
**File**: [helpers.js](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#L5)

```js
export const uid = () => "x" + Math.random().toString(36).slice(2, 9);
```
- 7-character base-36 string = ~78 billion combos, but when batch-importing hundreds of items rapidly, collision risk is non-trivial.
- **Fix**: Use `crypto.randomUUID()` or add timestamp prefix: `` `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}` ``.

---

## 🟠 High — State Management & Persistence

### 9. `useEffect` Dependency on `usePOStore.getState()` (Zustand Anti-Pattern)
**File**: [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#L453-L460)

```js
useEffect(() => {
  const trigger = usePOStore.getState().triggerNewPO;
  ...
}, [pos, usePOStore.getState().triggerNewPO]);
```
- `usePOStore.getState()` inside a dependency array is not reactive — it captures the value at render time. This effect may never re-trigger correctly.
- **Fix**: Subscribe via `const triggerNewPO = usePOStore(s => s.triggerNewPO)` and use that in the dep array.

### 10. [Settings.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/Settings.jsx) Reads UOM from `usePOStore.getState()` Inside Render
**File**: [Settings.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/Settings.jsx#L294)

```js
{(usePOStore.getState().uom || []).filter(...).map(...)}
```
- Calling `getState()` inside JSX render bypasses React's reactivity. UOM list won't auto-refresh after additions without a full re-render.
- **Fix**: Add `const uom = usePOStore(s => s.uom)` at component level and use that.

### 11. [toast()](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#131-137) Has a Race Condition for Rapid Toasts
**File**: [usePOStore.js](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#L132-L136)

- Only one toast can exist at a time via `_toast: { id, msg }`. Rapid consecutive toasts cancel each other out since only the latest [id](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#4-6) clears.
- **Fix**: Use a toast queue `_toasts: []` and shift items off on a timer, or use a proper toast library.

### 12. `idbSet` Errors Are Silently Swallowed
**File**: [usePOStore.js](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#L44-L46)

```js
function save(key, val) { idbSet(key, val).catch(() => {}); }
```
- Storage failures (quota exceeded, private browsing mode) are silently ignored. User data appears saved but isn't.
- **Fix**: At minimum, log errors to console. Ideally show a [toast("⚠ Data gagal disimpan — storage penuh?")](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#131-137).

### 13. No Data Migration / Schema Versioning
**File**: [usePOStore.js](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js)

- When new fields are added to data models (e.g. `tags`, `priority`, `discountPct`), existing IDB data has no upgrade path.
- **Fix**: Implement a `schemaVersion` key in IDB and run migration functions on load if version mismatch.

---

## 🟡 High — ERP Domain Logic

### 14. No Purchase Request (PR) Lifecycle Management
**File**: [constants.js](file:///c:/Users/Eddri/Music/docvault/src/lib/constants.js), [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx)

- `prNo` field exists on PO objects but is just a free-text string with no validation, link, or status tracking. In a real ERP, a PO should be traceable back to a PR with its own approval workflow.
- **Fix**: Add a PR reference lookup tab in Settings, or at minimum validate PR number format consistency.

### 15. No Payment Tracking Against Invoices
**File**: All pages

- Items can be marked `"paid"` but there's no Payment record entity — no payment date, payment amount, payment method, or partial payment tracking. "Paid" is just a status flag.
- **Fix**: Add a `payments[]` array to PO or Item, recording payment date, amount, and method. This enables AR aging reports.

### 16. DO Generator Doesn't Validate Over-Delivery
**File**: [DOGeneratorModal.jsx](file:///c:/Users/Eddri/Music/docvault/src/components/forms/DOGeneratorModal.jsx)

- A user can issue a DO with `qtyDelivered` exceeding the ordered `qty` on the item. The status correctly becomes `"delivered"`, but over-delivery is not flagged.
- **Fix**: Warn (or block) when `qtyDelivered > item.qty - alreadyDelivered`.

### 17. `STATUS_RANK` Assigns `revision` and `on_hold` Rank = 1 (Same as `pending`)
**File**: [constants.js](file:///c:/Users/Eddri/Music/docvault/src/lib/constants.js#L142-L145)

```js
export const STATUS_RANK = {
  draft: 0, pending: 1, confirmed: 2, revision: 1, on_hold: 1, ...
};
```
- In [syncPOStatuses](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#48-102), the cascade check `STATUS_RANK[po.status] > STATUS_RANK[item.status]` won't trigger for `revision` → `pending` since they share rank 1. Items in a `revision` PO are never cascaded.
- **Fix**: Assign unique and semantically meaningful ranks — e.g. `revision: 1.5, on_hold: 1.5`.

### 18. No Credit Limit / Client Risk Management
- There's no concept of a client credit limit, payment terms (NET 30, NET 60), or outstanding AR balance per company. This is standard in distribution ERP.
- **Fix (future feature)**: Add `paymentTerms` and `creditLimit` to company objects and show AR exposure on the dashboard.

### 19. Tax (PPN) Rate is Hardcoded
**File**: [constants.js](file:///c:/Users/Eddri/Music/docvault/src/lib/constants.js#L7)

```js
export const PPN_RATE = 0.11;
```
- The PPN rate is not user-configurable in Settings. Tax rates can change (Indonesia raised PPN from 10% to 11% in 2022, and further changes are planned).
- **Fix**: Move `PPN_RATE` to `INIT_SETTINGS` and expose it as a configurable field in the Settings → General tab.

---

## 🟡 Medium — UI/UX & Usability

### 20. Dashboard Overdue Alert is Capped at 5 — No "View All"
**File**: [Dashboard.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/Dashboard.jsx#L466)

```js
{overduePOs.slice(0, 5).map(...)}
```
- If 20+ POs are overdue, only 5 are shown with no indication of how many are hidden.
- **Fix**: Add `{overduePOs.length > 5 && <button>+{overduePOs.length - 5} lainnya</button>}`.

### 21. Urgent and Incomplete PO Panels Also Cap at 5 With No "View All"
**File**: [Dashboard.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/Dashboard.jsx#L490, L514)

- Same issue as above for the Urgent and Info Parsial panels.

### 22. No Keyboard Shortcut for Common Actions on POList
**File**: [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx)

- The empty state shows `N` to create a new PO, but the keyboard handler is missing. No shortcut handling is implemented anywhere.
- **Fix**: Add a `keydown` listener on the page: `N` → open PO form, `Escape` → close modal, `/` → focus search.

### 23. [fmtDate](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#178-183) Shows Raw ISO String on Format Error
**File**: [helpers.js](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#L178-L182)

```js
catch { return d; } // returns raw "2024-10-20" string
```
- Fallback shows an ISO string (`2024-10-20`) rather than a localized format.
- **Fix**: Fallback to a manual split: `d.split("-").reverse().join("/")` for `DD/MM/YYYY`.

### 24. Inline Editing in `InlineCell` Has No Cancel on `Escape`
**File**: [InlineCell.jsx](file:///c:/Users/Eddri/Music/docvault/src/components/shared/InlineCell.jsx)

- Users have no way to discard changes mid-edit without clicking away, which triggers a save.
- **Fix**: Handle `keydown Escape` to revert to original value without saving.

### 25. Pagination Resets to Page 1 on Any State Change
**File**: [useDataTable.js](file:///c:/Users/Eddri/Music/docvault/src/hooks/useDataTable.js)

- Likely every filter/sort triggers a `setPage(1)` reset. This is expected for filters, but after editing an item inline, the current page should be preserved.
- **Fix**: Only call `setPage(1)` inside `setSearch`, `setColF`, `setDateF`, `setNumF`, `setTextF` — not on [updateItem](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#192-198).

### 26. [SmartDate.jsx](file:///c:/Users/Eddri/Music/docvault/src/components/shared/SmartDate.jsx) Component Has No Year Input
**File**: [SmartDate.jsx](file:///c:/Users/Eddri/Music/docvault/src/components/shared/SmartDate.jsx)

- Review this component for usability. A free-text date field without a picker is prone to user error.
- **Fix**: Consider adding a `<input type="date">` fallback or a datepicker popup.

### 27. `SupplierPage` and [MarginAnalysis](file:///c:/Users/Eddri/Music/docvault/src/pages/MarginAnalysis.jsx#20-193) Have No Export to PDF or Print Mode
**File**: [SupplierPage.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/SupplierPage.jsx), [MarginAnalysis.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/MarginAnalysis.jsx)

- Only TSV/CSV export is available. Stakeholders often need printable reports.
- **Fix**: Add a `window.print()` button with a `@media print` stylesheet that hides sidebars/toolbars.

---

## 🟢 Medium — Code Quality & Architecture

### 28. [fmt](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#136-157) vs `fmtIDR` Naming Inconsistency (Legacy)
**File**: [helpers.js](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#L137)

- From previous conversations, [fmt](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#136-157) was renamed to `fmtIDR` in some contexts but the canonical export is still [fmt](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#136-157). This caused runtime errors previously. The name is misleading since [fmt](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#136-157) is now currency-symbol-agnostic (reads from settings).
- **Fix**: Rename [fmt](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#136-157) → `fmtCurrency` and update all imports. Deprecate any `fmtIDR` alias.

### 29. [itemRow](file:///c:/Users/Eddri/Music/docvault/src/pages/AllItems.jsx#144-168) Logic Duplicated Between [AllItems.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/AllItems.jsx) and [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx)
**File**: [AllItems.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/AllItems.jsx#L143-L167), [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#L140-L173)

- The item-to-TSV-row mapping switch statement is copy-pasted in both files.
- **Fix**: Extract `buildItemRow(item, po, cols)` into [helpers.js](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js) and import it.

### 30. `BulkEditModal` Save Logic Duplicated in [AllItems](file:///c:/Users/Eddri/Music/docvault/src/pages/AllItems.jsx#19-473) and [POList](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#363-844)
**File**: [AllItems.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/AllItems.jsx#L434-L467), [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#L323-L356)

- The `onSave` handler for `BulkEditModal` is identical across both pages.
- **Fix**: Move the bulk-apply logic into `BulkEditModal` itself or a `useBulkEdit` hook.

### 31. `INIT_PO_STATUS` Used as Runtime Config — Should Be a Constant Enum
**File**: [constants.js](file:///c:/Users/Eddri/Music/docvault/src/lib/constants.js#L117)

- `INIT_PO_STATUS` is used everywhere for label/color lookups. It's defined as a plain object — no TypeScript, no runtime validation. A typo in a status string (e.g., `"cancelle"`) silently returns `undefined` with no error.
- **Fix**: Add a `getStatusConfig(status)` helper that throws/warns if status is unknown.

### 32. [App.jsx](file:///c:/Users/Eddri/Music/docvault/App.jsx) Root File is 184 KB (Likely Monolithic)
**File**: [App.jsx](file:///c:/Users/Eddri/Music/docvault/App.jsx) (root directory, 184 KB!)

- The root [App.jsx](file:///c:/Users/Eddri/Music/docvault/App.jsx) in the project root is 184 KB — this strongly suggests it contains logic that should be in the `src/` directory organization.
- **Fix**: Audit this file and split into proper components. The [src/App.jsx](file:///c:/Users/Eddri/Music/docvault/src/App.jsx) is only 2.7 KB (correct).

### 33. No Error Boundary Around Main Pages
**File**: [main.jsx](file:///c:/Users/Eddri/Music/docvault/src/main.jsx)

- While [ErrorBoundary.jsx](file:///c:/Users/Eddri/Music/docvault/src/components/ui/ErrorBoundary.jsx) exists in [ui/](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#4-6), it's unclear if it wraps each page/route. A crash in [Dashboard.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/Dashboard.jsx) would white-screen the entire app.
- **Fix**: Wrap each `<Page />` in `<ErrorBoundary>` in [App.jsx](file:///c:/Users/Eddri/Music/docvault/App.jsx).

### 34. No Prop-Types or TypeScript
- All components use plain JS with no type checking. Silent `undefined` bugs (like `po?.company` on a deleted PO reference) are caught at runtime.
- **Fix**: Add JSDoc `@param` comments for key utility functions, or migrate to TypeScript incrementally using `.tsx` extensions.

---

## 🔵 Medium — Performance & Scalability

### 35. [calcPOTotals](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#200-209) Called Multiple Times Per Render Without Memoization
**File**: [Dashboard.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/Dashboard.jsx#L126-L127) and [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx)

```js
const totalRev = fPos.reduce((s, p) => s + calcPOTotals(p, items).total, 0);
const totalExPPN = fPos.reduce((s, p) => s + calcPOTotals(p, items).exPPN, 0);
```
- [calcPOTotals](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#200-209) is called twice per PO in two separate `.reduce()` calls. With 500+ POs, this doubles computation.
- **Fix**: Combine into one reduce: `{ rev, exPPN } = fPos.reduce(...)`.

### 36. `items.filter(i => i.poId === po.id)` Repeated in O(n²) Context
**File**: [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#L419-L420)

- In the sort comparator, `items.filter(...)` runs inside the sort callback — O(n²) for each comparison. With 1,000 items across 100 POs, this is very slow.
- **Fix**: Pre-compute `itemsByPoId` Map before sorting.

### 37. [useCountUp](file:///c:/Users/Eddri/Music/docvault/src/pages/Dashboard.jsx#31-55) Runs Animation Even When Tab is Not Visible
**File**: [Dashboard.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/Dashboard.jsx#L32-L54)

- `requestAnimationFrame` runs even if the browser tab is hidden.
- **Fix**: Check `document.hidden` before starting or pause animation using the Page Visibility API.

### 38. GroupedList `useMemo` in [AllItems](file:///c:/Users/Eddri/Music/docvault/src/pages/AllItems.jsx#19-473) Recalculates on Every Sort Change
**File**: [AllItems.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/AllItems.jsx#L99-L136)

- `groupedList` depends on `filtered` and `sort` — any column sort re-runs full grouping logic including string key operations.
- **Fix**: Separate grouping (depends on `filtered`, `isGrouped`) from sorting (depends on `groupedList`, `sort`).

### 39. CSV Import Has No Row Limit / Memory Guard
**File**: [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#L477-L536)

- [processImportedData](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#490-537) processes entire CSV in-memory at once. A very large file (50k+ rows) would freeze the browser tab.
- **Fix**: Add a row count limit warning (e.g., warn at 5,000+ rows), or process in chunks via `setTimeout` batching.

---

## 🔵 Low–Medium — Reporting & Export

### 40. Margin Analysis Doesn't Account for `totalLocked` POs
**File**: [MarginAnalysis.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/MarginAnalysis.jsx)

- When a PO has `totalLocked: true` (manual override), [calcPOTotals](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#200-209) uses `manualExPPN`, but [itemNet](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#186-188) still sums items normally. The grouped net totals in [MarginAnalysis](file:///c:/Users/Eddri/Music/docvault/src/pages/MarginAnalysis.jsx#20-193) may not reconcile with the locked PO total.
- **Fix**: Note the discrepancy in UI, or recalculate net based on locked value proportionally.

### 41. CSV Export Uses Raw Status Keys, Not Display Labels
**File**: [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#L552-L556)

- The [handleExportCSV](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#550-558) function correctly uses `INIT_PO_STATUS[p.status]?.label`, but Check if [fmtDate](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#178-183) is applied to `p.orderDate` — currently it exports the raw ISO string (`2024-05-21`) instead of a localized format.
- **Fix**: Apply [fmtDate(p.orderDate)](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#178-183) in export rows.

### 42. No Aging AR Report
- There is no dedicated report showing outstanding invoices by aging bucket (0-30, 30-60, 60-90, 90+ days). This is standard in distribution ERP.
- **Fix**: Add a new page `ARAgingReport.jsx` that groups unpaid/uninvoiced POs by [diffDays(orderDate)](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#7-8) buckets.

### 43. [fmtShort](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#158-177) Unit Labels Are Indonesian-Only
**File**: [helpers.js](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#L158-L176)

```js
if (Math.abs(v) >= 1e6) return `${curr} ${(v / 1e6).toFixed(1)}Jt`.trim();
```
- `Jt` (Juta/million) and `M` (Miliar/billion) are local abbreviations. If the app is ever used for multi-currency transactions, these are confusing.
- **Fix**: Internationalize the abbreviations or make them configurable in Settings.

---

## ⚪ Low — Security & Compliance

### 44. Google Drive Folder Links Are Not Validated
**File**: [POList.jsx](file:///c:/Users/Eddri/Music/docvault/src/pages/POList.jsx#L184)

```jsx
<a href={po.folder} target="_blank" rel="noopener noreferrer">
```
- The `rel="noopener noreferrer"` is already correct. However, no URL validation exists — a user could store arbitrary URLs including `javascript:` protocol.
- **Fix**: Validate that `po.folder` starts with `https://` before rendering as an `<a>` link.

### 45. IndexedDB Stores Raw Financial Data Without Encryption
- All PO data (prices, margins, company relationships) is stored unencrypted in the browser's IndexedDB. Any person with physical access to the machine can read it via DevTools.
- **Fix**: For a distribution company context, consider a note in README that this is a local-only tool. For proper deployment, add server-side storage with authentication.

### 46. `document.execCommand("copy")` Deprecated
**File**: [helpers.js](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#L266)

```js
document.execCommand("copy"); // deprecated fallback
```
- `execCommand` is deprecated in all modern browsers. The primary `navigator.clipboard` path is correct, but the fallback should also be updated.
- **Fix**: Remove the `execCommand` fallback since `navigator.clipboard` is supported in all modern browsers and this is a local app (no mixed-content concerns).

### 47. No Audit Log / Change History
- There is no record of who changed a PO status, when an item was edited, or what price was changed. This is essential for ERP compliance and dispute resolution.
- **Fix**: Add `updatedAt` and `updatedBy` (even just device/browser fingerprint for now) timestamps to PO and Item mutation actions.

---

## Recommended Fix Priority

| # | Fix | Effort | Impact |
|---|---|---|---|
| 3 | Fix [deleteDO](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#263-281) status demotion bug | Low | Critical |
| 4 | Fix [saveDO](file:///c:/Users/Eddri/Music/docvault/src/store/usePOStore.js#235-262) idempotency | Low | High |
| 9 | Fix Zustand `getState()` in `useEffect` dep | Low | High |
| 10 | Fix `getState()` in render cycle | Low | Medium |
| 19 | Make PPN Rate configurable | Low | High |
| 1 | Fix PO status when all items deleted | Medium | High |
| 7 | Fix year rollover in [parseSmartDate](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#81-94) | Low | Medium |
| 8 | Improve [uid()](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#4-6) collision resistance | Low | Medium |
| 12 | Surface IDB write errors to user | Low | Medium |
| 17 | Fix `STATUS_RANK` for revision/on_hold | Low | Medium |
| 28 | Rename [fmt](file:///c:/Users/Eddri/Music/docvault/src/lib/helpers.js#136-157) → `fmtCurrency` | Medium | Medium |
| 29 | Extract `buildItemRow` helper | Medium | Medium |
| 35 | Combine revenue reduce calls | Low | Medium |
| 36 | Pre-compute `itemsByPoId` Map | Low | Medium |
| 5 | Improve duplicate PO placeholder | Low | UX |
| 20 | Add "View All" to dashboard alerts | Low | UX |
