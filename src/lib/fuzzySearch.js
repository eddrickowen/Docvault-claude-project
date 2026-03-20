import Fuse from 'fuse.js';

/**
 * Create a Fuse.js instance for fuzzy searching POs
 * @param {Array} pos - Array of PO objects
 * @returns {Fuse} Fuse instance
 */
export function createPOFuzzySearch(pos, threshold = 0.4, keys) {
  const options = {
    keys: keys || [
      { name: 'orderNo', weight: 2 }, // Higher weight = more important
      { name: 'company', weight: 2 },
      { name: 'quoteRef', weight: 1 },
      { name: 'notes', weight: 0.5 },
    ],
    threshold, // 0.0 = exact match, 1.0 = match anything
    ignoreLocation: true, // Search entire string, not just beginning
    minMatchCharLength: 2, // Minimum chars before fuzzy search kicks in
  };

  return new Fuse(pos, options);
}

/**
 * Create a Fuse.js instance for fuzzy searching Items
 * @param {Array} items - Array of item objects
 * @returns {Fuse} Fuse instance
 */
export function createItemFuzzySearch(items, threshold = 0.4, keys) {
  const options = {
    keys: keys || [
      { name: 'itemName', weight: 3 },
      { name: 'desc', weight: 1.5 },
      { name: 'invoiceNo', weight: 1 },
      { name: 'hsCode', weight: 0.8 },
      { name: 'zoneType', weight: 0.5 },
    ],
    threshold,
    ignoreLocation: true,
    minMatchCharLength: 2,
  };

  return new Fuse(items, options);
}

/**
 * Perform fuzzy search on POs
 * @param {Array} pos - Array of PO objects
 * @param {string} query - Search query
 * @returns {Array} Filtered PO array
 */
export function fuzzySearchPOs(pos, query, threshold = 0.4, keys) {
  if (!query || query.trim().length < 2) {
    return pos; // Return all if query too short
  }

  const fuse = createPOFuzzySearch(pos, threshold, keys);
  const results = fuse.search(query.trim());
  return results.map(result => result.item);
}

/**
 * Perform fuzzy search on Items
 * @param {Array} items - Array of item objects
 * @param {string} query - Search query
 * @returns {Array} Filtered items array
 */
export function fuzzySearchItems(items, query, threshold = 0.4, keys) {
  if (!query || query.trim().length < 2) {
    return items;
  }

  const fuse = createItemFuzzySearch(items, threshold, keys);
  const results = fuse.search(query.trim());
  return results.map(result => result.item);
}
