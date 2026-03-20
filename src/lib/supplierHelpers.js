/**
 * Supplier assignment helpers
 * Consolidates duplicate supplier assignment logic
 */

import { uid } from "./helpers";

/**
 * Merge supplier assignments for an item
 * @param {Array} currentAssignments - Current item supplier assignments
 * @param {Array} newAssignments - New assignments to merge
 * @param {string} itemId - Item ID for price lookup
 * @returns {Array} Merged supplier assignments
 */
export function mergeSupplierAssignments(currentAssignments, newAssignments, itemId) {
  let updated = [...(currentAssignments || [])];

  newAssignments.forEach(newA => {
    // If new assignment is "main", remove any existing "main" role
    if (newA.role === "main") {
      updated = updated.filter(a => a.role !== "main");
    }

    // Remove existing assignment for this supplier (to prevent duplicates)
    updated = updated.filter(a => a.supplierId !== newA.supplierId);

    // Get item-specific prices or use defaults
    const itemPrices = newA.prices ? newA.prices[itemId] : { pricePerUnit: 0, shippingTotal: 0 };

    // Add new assignment
    updated.push({
      id: uid(),
      supplierId: newA.supplierId,
      role: newA.role,
      link: newA.link || "",
      notes: newA.notes || "",
      pricePerUnit: itemPrices?.pricePerUnit || 0,
      shippingTotal: itemPrices?.shippingTotal || 0
    });
  });

  return updated;
}

/**
 * Validate supplier assignment
 * @param {Object} assignment - Supplier assignment to validate
 * @returns {Object} {valid: boolean, error: string}
 */
export function validateSupplierAssignment(assignment) {
  if (!assignment.supplierId) {
    return { valid: false, error: "Supplier ID is required" };
  }

  if (!assignment.role || !["main", "alt"].includes(assignment.role)) {
    return { valid: false, error: "Role must be 'main' or 'alt'" };
  }

  if (assignment.pricePerUnit && assignment.pricePerUnit < 0) {
    return { valid: false, error: "Price per unit cannot be negative" };
  }

  if (assignment.shippingTotal && assignment.shippingTotal < 0) {
    return { valid: false, error: "Shipping total cannot be negative" };
  }

  return { valid: true, error: null };
}

/**
 * Get main supplier assignment for an item
 * @param {Array} assignments - Item supplier assignments
 * @returns {Object|null} Main supplier assignment or null
 */
export function getMainSupplierAssignment(assignments) {
  return (assignments || []).find(a => a.role === "main") || null;
}

/**
 * Get alternate supplier assignments for an item
 * @param {Array} assignments - Item supplier assignments
 * @returns {Array} Alternate supplier assignments
 */
export function getAltSupplierAssignments(assignments) {
  return (assignments || []).filter(a => a.role === "alt");
}

/**
 * Calculate total buy cost for an item based on supplier assignment
 * @param {Object} assignment - Supplier assignment
 * @param {number} qty - Item quantity
 * @returns {number} Total cost
 */
export function calculateSupplierCost(assignment, qty) {
  if (!assignment) return 0;
  const pricePerUnit = assignment.pricePerUnit || 0;
  const shippingTotal = assignment.shippingTotal || 0;
  return (pricePerUnit * qty) + shippingTotal;
}
