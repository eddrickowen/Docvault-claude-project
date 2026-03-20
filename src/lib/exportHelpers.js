/**
 * Shared export/copy helpers for items and POs
 * Consolidates duplicate logic from AllItems.jsx and POList.jsx
 */

import { itemNet, itemBuy, itemMargin } from "./helpers";
import { ITEM_STATUS } from "./constants";

/**
 * Map an item to export values based on column keys
 * @param {Object} item - The item to map
 * @param {string} key - The column key
 * @param {Object} po - The associated PO (optional)
 * @returns {string|number} The value for the column
 */
export function mapItemToExportValue(item, key, po = null) {
  switch (key) {
    case "itemName":
      return item.itemName || "";
    case "qty":
      return item.qty;
    case "unit":
      return item.unit || "";
    case "unitPrice":
      return item.unitPrice || 0;
    case "net":
      return itemNet(item);
    case "buy":
      return itemBuy(item);
    case "margin": {
      const m = itemMargin(item);
      return m ?? "-";
    }
    case "status":
      return ITEM_STATUS[item.status]?.label || item.status || "";
    case "deliveryDate":
      return item.deliveryDate || "";
    case "invoiceNo":
      return item.invoiceNo || "";
    case "doNos":
      return (item.doNos || []).join(";");
    case "zoneType":
      return po?.zoneType || item.zoneType || "";
    case "poNo":
      return po?.orderNo || "";
    case "company":
      return po?.company || "";
    case "hsCode":
      return item.hsCode || "";
    case "desc":
      return item.desc || "";
    default:
      return "";
  }
}

/**
 * Build export data for items
 * @param {Array} items - Array of items to export
 * @param {Array} cols - Column configuration [{key, label, enabled}]
 * @param {Object} poById - Map of PO IDs to PO objects
 * @returns {Object} {headers: Array, rows: Array}
 */
export function buildItemExportData(items, cols, poById = {}) {
  const headers = cols.map(c => c.label);
  const rows = items.map(item => {
    const po = poById[item.poId];
    return cols.map(({ key }) => mapItemToExportValue(item, key, po));
  });

  return { headers, rows };
}

/**
 * Build export rows for a set of item IDs
 * @param {Array|Set} itemIds - Item IDs to export
 * @param {Array} allItems - All available items
 * @param {Array} cols - Column configuration
 * @param {Object} poById - Map of PO IDs to PO objects
 * @returns {Array} Array of row arrays
 */
export function buildItemRowsByIds(itemIds, allItems, cols, poById = {}) {
  const rows = [];
  const idArray = Array.isArray(itemIds) ? itemIds : Array.from(itemIds);

  idArray.forEach(id => {
    const item = allItems.find(i => i.id === id);
    if (!item) return;

    const po = poById[item.poId];
    rows.push(cols.map(({ key }) => mapItemToExportValue(item, key, po)));
  });

  return rows;
}

/**
 * Helper to get enabled columns from settings
 * @param {Array} columnConfig - Column configuration from settings
 * @param {Array} defaultColumns - Default columns if none configured
 * @returns {Array} Filtered columns that are enabled
 */
export function getEnabledColumns(columnConfig, defaultColumns) {
  return (columnConfig || defaultColumns).filter(c => c.enabled);
}
