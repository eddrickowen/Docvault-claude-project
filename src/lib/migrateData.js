/**
 * Data Migration Script
 * Migrates data from IndexedDB to PocketBase
 *
 * Usage:
 * 1. Make sure PocketBase is running
 * 2. Make sure you're logged in
 * 3. Open browser console
 * 4. Run: migrateFromIndexedDB()
 */

import { get as idbGet } from "idb-keyval";
import { pb, collections } from "./pocketbase";

// IndexedDB keys (from old system)
const K = {
  pos: "po66_pos",
  items: "po66_items",
  suppliers: "po66_suppliers",
  dos: "po66_dos",
  companies: "po66_companies",
  zoneTypes: "po66_zones",
  settings: "po66_settings",
  hsDB: "po66_hsdb",
  uom: "po66_uom",
};

/**
 * Main migration function
 */
export async function migrateFromIndexedDB() {
  console.log('🚀 Starting migration from IndexedDB to PocketBase...');

  // Check if logged in
  if (!pb.authStore.isValid) {
    console.error('❌ Not authenticated! Please log in first.');
    return { success: false, error: 'Not authenticated' };
  }

  const stats = {
    pos: 0,
    items: 0,
    suppliers: 0,
    dos: 0,
    companies: 0,
    zoneTypes: 0,
    settings: 0,
    hsCodes: 0,
    errors: []
  };

  try {
    // 1. Migrate Purchase Orders
    console.log('📦 Migrating Purchase Orders...');
    const oldPOs = await idbGet(K.pos) || [];
    for (const po of oldPOs) {
      try {
        await collections.pos().create(po);
        stats.pos++;
      } catch (error) {
        console.error('Failed to migrate PO:', po.id, error);
        stats.errors.push({ type: 'po', id: po.id, error: error.message });
      }
    }
    console.log(`✅ Migrated ${stats.pos} POs`);

    // 2. Migrate Items
    console.log('📋 Migrating Items...');
    const oldItems = await idbGet(K.items) || [];
    for (const item of oldItems) {
      try {
        await collections.items().create(item);
        stats.items++;
      } catch (error) {
        console.error('Failed to migrate item:', item.id, error);
        stats.errors.push({ type: 'item', id: item.id, error: error.message });
      }
    }
    console.log(`✅ Migrated ${stats.items} items`);

    // 3. Migrate Suppliers
    console.log('👥 Migrating Suppliers...');
    const oldSuppliers = await idbGet(K.suppliers) || [];
    for (const supplier of oldSuppliers) {
      try {
        await collections.suppliers().create(supplier);
        stats.suppliers++;
      } catch (error) {
        console.error('Failed to migrate supplier:', supplier.id, error);
        stats.errors.push({ type: 'supplier', id: supplier.id, error: error.message });
      }
    }
    console.log(`✅ Migrated ${stats.suppliers} suppliers`);

    // 4. Migrate Delivery Orders
    console.log('🚚 Migrating Delivery Orders...');
    const oldDOs = await idbGet(K.dos) || [];
    for (const doObj of oldDOs) {
      try {
        await collections.dos().create(doObj);
        stats.dos++;
      } catch (error) {
        console.error('Failed to migrate DO:', doObj.id, error);
        stats.errors.push({ type: 'do', id: doObj.id, error: error.message });
      }
    }
    console.log(`✅ Migrated ${stats.dos} DOs`);

    // 5. Migrate Companies
    console.log('🏢 Migrating Companies...');
    const oldCompanies = await idbGet(K.companies) || [];
    for (const company of oldCompanies) {
      try {
        const name = typeof company === 'string' ? company : company.name;
        await collections.companies().create({ name });
        stats.companies++;
      } catch (error) {
        console.error('Failed to migrate company:', company, error);
        stats.errors.push({ type: 'company', data: company, error: error.message });
      }
    }
    console.log(`✅ Migrated ${stats.companies} companies`);

    // 6. Migrate Zone Types
    console.log('📍 Migrating Zone Types...');
    const oldZones = await idbGet(K.zoneTypes) || [];
    for (const zone of oldZones) {
      try {
        const name = typeof zone === 'string' ? zone : zone.name;
        await collections.zoneTypes().create({ name });
        stats.zoneTypes++;
      } catch (error) {
        console.error('Failed to migrate zone type:', zone, error);
        stats.errors.push({ type: 'zone', data: zone, error: error.message });
      }
    }
    console.log(`✅ Migrated ${stats.zoneTypes} zone types`);

    // 7. Migrate Settings
    console.log('⚙️ Migrating Settings...');
    const oldSettings = await idbGet(K.settings) || {};
    try {
      await collections.settings().create({
        key: 'app_settings',
        value: oldSettings
      });
      stats.settings++;
    } catch (error) {
      console.error('Failed to migrate settings:', error);
      stats.errors.push({ type: 'settings', error: error.message });
    }
    console.log(`✅ Migrated settings`);

    // 8. Migrate HS Codes
    console.log('🏷️ Migrating HS Codes...');
    const oldHSDB = await idbGet(K.hsDB) || [];
    for (const hsCode of oldHSDB) {
      try {
        await collections.hsCodes().create({
          code: hsCode.code,
          desc: hsCode.desc
        });
        stats.hsCodes++;
      } catch (error) {
        console.error('Failed to migrate HS code:', hsCode.code, error);
        stats.errors.push({ type: 'hsCode', code: hsCode.code, error: error.message });
      }
    }
    console.log(`✅ Migrated ${stats.hsCodes} HS codes`);

    // 9. Migrate UOM
    console.log('📏 Migrating UOM...');
    const oldUOM = await idbGet(K.uom) || [];
    try {
      await collections.settings().create({
        key: 'uom',
        value: oldUOM
      });
    } catch (error) {
      console.error('Failed to migrate UOM:', error);
      stats.errors.push({ type: 'uom', error: error.message });
    }
    console.log(`✅ Migrated UOM`);

    console.log('\n🎉 Migration Complete!');
    console.log('═'.repeat(50));
    console.log('Summary:');
    console.log(`  Purchase Orders: ${stats.pos}`);
    console.log(`  Items: ${stats.items}`);
    console.log(`  Suppliers: ${stats.suppliers}`);
    console.log(`  Delivery Orders: ${stats.dos}`);
    console.log(`  Companies: ${stats.companies}`);
    console.log(`  Zone Types: ${stats.zoneTypes}`);
    console.log(`  Settings: ${stats.settings}`);
    console.log(`  HS Codes: ${stats.hsCodes}`);
    console.log(`  Errors: ${stats.errors.length}`);
    console.log('═'.repeat(50));

    if (stats.errors.length > 0) {
      console.warn('⚠️ Some items failed to migrate:');
      console.table(stats.errors);
    }

    return { success: true, stats };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message, stats };
  }
}

/**
 * Clear all PocketBase data (useful for re-migration)
 */
export async function clearPocketBaseData() {
  console.warn('⚠️ WARNING: This will delete ALL data from PocketBase!');

  const confirm = window.confirm('Are you sure you want to delete all PocketBase data? This cannot be undone!');
  if (!confirm) {
    console.log('❌ Cancelled');
    return;
  }

  try {
    // Delete all records
    const collections = ['pos', 'items', 'suppliers', 'dos', 'companies', 'zone_types', 'settings', 'hs_codes'];

    for (const collectionName of collections) {
      const records = await pb.collection(collectionName).getFullList();
      console.log(`🗑️ Deleting ${records.length} records from ${collectionName}...`);

      for (const record of records) {
        await pb.collection(collectionName).delete(record.id);
      }
    }

    console.log('✅ All data cleared!');
    return { success: true };

  } catch (error) {
    console.error('❌ Failed to clear data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export current IndexedDB data for backup
 */
export async function exportIndexedDBData() {
  console.log('📤 Exporting IndexedDB data...');

  const data = {
    pos: await idbGet(K.pos) || [],
    items: await idbGet(K.items) || [],
    suppliers: await idbGet(K.suppliers) || [],
    dos: await idbGet(K.dos) || [],
    companies: await idbGet(K.companies) || [],
    zoneTypes: await idbGet(K.zoneTypes) || [],
    settings: await idbGet(K.settings) || {},
    hsDB: await idbGet(K.hsDB) || [],
    uom: await idbGet(K.uom) || [],
    exportedAt: new Date().toISOString()
  };

  // Create downloadable file
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `docvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('✅ Backup downloaded!');
  return data;
}

// Make functions available globally in browser console
if (typeof window !== 'undefined') {
  window.migrateFromIndexedDB = migrateFromIndexedDB;
  window.clearPocketBaseData = clearPocketBaseData;
  window.exportIndexedDBData = exportIndexedDBData;
}
