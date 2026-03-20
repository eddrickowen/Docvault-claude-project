/**
 * Automated PocketBase Setup
 * Creates all collections and configures the database automatically
 *
 * Run this AFTER PocketBase is running and you've created an admin account
 */

import pb from './pocketbase.js';

// Collection schemas
const collections = [
  {
    name: 'pos',
    type: 'base',
    schema: [
      { name: 'orderNo', type: 'text', required: true, options: { min: 1, max: 255 } },
      { name: 'quoteRef', type: 'text', required: false, options: {} },
      { name: 'company', type: 'text', required: true, options: {} },
      { name: 'orderDate', type: 'text', required: true, options: {} },
      { name: 'prNo', type: 'text', required: false, options: {} },
      { name: 'notes', type: 'text', required: false, options: {} },
      { name: 'folder', type: 'url', required: false, options: {} },
      { name: 'status', type: 'text', required: true, options: {} },
      { name: 'priority', type: 'text', required: true, options: {} },
      { name: 'totalLocked', type: 'bool', required: false, options: {} },
      { name: 'manualExPPN', type: 'number', required: false, options: {} },
      { name: 'manualPPN', type: 'number', required: false, options: {} },
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
  {
    name: 'items',
    type: 'base',
    schema: [
      { name: 'poId', type: 'text', required: true, options: {} },
      { name: 'itemName', type: 'text', required: true, options: {} },
      { name: 'desc', type: 'text', required: false, options: {} },
      { name: 'qty', type: 'number', required: true, options: {} },
      { name: 'unit', type: 'text', required: true, options: {} },
      { name: 'unitPrice', type: 'number', required: true, options: {} },
      { name: 'discount', type: 'number', required: false, options: {} },
      { name: 'discountPct', type: 'number', required: false, options: {} },
      { name: 'status', type: 'text', required: true, options: {} },
      { name: 'deliveryDate', type: 'text', required: false, options: {} },
      { name: 'invoiceNo', type: 'text', required: false, options: {} },
      { name: 'zoneType', type: 'text', required: false, options: {} },
      { name: 'hsCode', type: 'text', required: false, options: {} },
      { name: 'doNos', type: 'json', required: false, options: {} },
      { name: 'supplierAssignments', type: 'json', required: false, options: {} },
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
  {
    name: 'suppliers',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true, options: {} },
      { name: 'contact', type: 'text', required: false, options: {} },
      { name: 'email', type: 'email', required: false, options: {} },
      { name: 'phone', type: 'text', required: false, options: {} },
      { name: 'address', type: 'text', required: false, options: {} },
      { name: 'website', type: 'url', required: false, options: {} },
      { name: 'notes', type: 'text', required: false, options: {} },
      { name: 'tags', type: 'json', required: false, options: {} },
      { name: 'deletedAt', type: 'text', required: false, options: {} },
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
  {
    name: 'dos',
    type: 'base',
    schema: [
      { name: 'poId', type: 'text', required: true, options: {} },
      { name: 'doNo', type: 'text', required: true, options: {} },
      { name: 'deliveryDate', type: 'text', required: true, options: {} },
      { name: 'lines', type: 'json', required: true, options: {} },
      { name: 'fieldValues', type: 'json', required: false, options: {} },
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
  {
    name: 'companies',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true, options: {} },
      { name: 'address', type: 'text', required: false, options: {} },
      { name: 'phone', type: 'text', required: false, options: {} },
      { name: 'notes', type: 'text', required: false, options: {} },
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
  {
    name: 'zone_types',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true, options: {} },
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
  {
    name: 'settings',
    type: 'base',
    schema: [
      { name: 'key', type: 'text', required: true, options: {} },
      { name: 'value', type: 'json', required: true, options: {} },
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
  {
    name: 'hs_codes',
    type: 'base',
    schema: [
      { name: 'code', type: 'text', required: true, options: {} },
      { name: 'desc', type: 'text', required: true, options: {} },
    ],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
];

/**
 * Create all collections automatically
 * NOTE: This requires admin authentication!
 */
export async function setupCollections() {
  console.log('🚀 Starting PocketBase setup...');

  // Check if we're authenticated as admin
  if (!pb.authStore.isValid || !pb.authStore.model?.email) {
    console.error('❌ Not authenticated! Please log in as admin first.');
    return {
      success: false,
      error: 'Not authenticated. Please log in to PocketBase Admin UI first.'
    };
  }

  const results = {
    created: [],
    existing: [],
    errors: [],
  };

  for (const collectionConfig of collections) {
    try {
      console.log(`📋 Creating collection: ${collectionConfig.name}...`);

      // Check if collection already exists
      try {
        await pb.collections.getOne(collectionConfig.name);
        console.log(`  ✓ Collection "${collectionConfig.name}" already exists`);
        results.existing.push(collectionConfig.name);
        continue;
      } catch (e) {
        // Collection doesn't exist, create it
      }

      // Create collection using Admin API
      await pb.collections.create(collectionConfig);

      console.log(`  ✓ Created collection: ${collectionConfig.name}`);
      results.created.push(collectionConfig.name);

    } catch (error) {
      console.error(`  ✗ Failed to create ${collectionConfig.name}:`, error.message);
      results.errors.push({
        collection: collectionConfig.name,
        error: error.message
      });
    }
  }

  console.log('\n========================================');
  console.log('Setup Complete!');
  console.log('========================================');
  console.log(`✓ Created: ${results.created.length} collections`);
  console.log(`→ Existing: ${results.existing.length} collections`);
  console.log(`✗ Errors: ${results.errors.length}`);

  if (results.created.length > 0) {
    console.log('\nCreated collections:', results.created.join(', '));
  }
  if (results.errors.length > 0) {
    console.log('\nErrors:', results.errors);
  }

  return {
    success: results.errors.length === 0,
    results
  };
}

// Make it available in browser console
if (typeof window !== 'undefined') {
  window.setupPocketBaseCollections = setupCollections;
}

export default setupCollections;
