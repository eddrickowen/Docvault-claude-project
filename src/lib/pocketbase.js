/**
 * PocketBase Connection Utility
 * Central configuration for PocketBase client
 */
import PocketBase from 'pocketbase';

// PocketBase URL - change this based on your setup
const PB_URL = import.meta.env.VITE_PB_URL || 'http://localhost:8090';

// Create PocketBase instance
export const pb = new PocketBase(PB_URL);
window.pb = pb;
console.log('🔌 Connecting to PocketBase at:', PB_URL);

// Enable auto cancellation for pending requests (optional)
pb.autoCancellation(false);

/**
 * Helper to check if user is authenticated
 */
export const isAuthenticated = () => {
  return pb.authStore.isValid;
};

/**
 * Helper to get current user
 */
export const getCurrentUser = () => {
  return pb.authStore.model;
};

/**
 * Login helper
 */
export const login = async (email, password) => {
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    return { success: true, user: authData.record };
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Logout helper
 */
export const logout = () => {
  pb.authStore.clear();
};

/**
 * Auto-login on page load if session exists
 */
export const initAuth = () => {
  // PocketBase automatically loads saved auth from localStorage
  if (pb.authStore.isValid) {
    console.log('User already authenticated:', pb.authStore.model?.email);
  }
};

/**
 * Collection helpers - makes code cleaner
 */
export const collections = {
  pos: () => pb.collection('pos'),
  items: () => pb.collection('items'),
  suppliers: () => pb.collection('suppliers'),
  dos: () => pb.collection('dos'),
  companies: () => pb.collection('companies'),
  zoneTypes: () => pb.collection('zone_types'),
  settings: () => pb.collection('settings'),
  hsCodes: () => pb.collection('hs_codes'),
  products: () => pb.collection('products'),
};

/**
 * Generic CRUD helpers with error handling
 */
export const dbHelpers = {
  /**
   * Get all records from a collection
   */
  getAll: async (collectionName) => {
    try {
      const records = await pb.collection(collectionName).getFullList({
        sort: '-created',
      });
      return records;
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      return [];
    }
  },

  /**
   * Get single record by ID
   */
  getOne: async (collectionName, id) => {
    try {
      const record = await pb.collection(collectionName).getOne(id);
      return record;
    } catch (error) {
      console.error(`Error fetching ${collectionName}/${id}:`, error);
      return null;
    }
  },

  /**
   * Create new record
   */
  create: async (collectionName, data) => {
    try {
      const record = await pb.collection(collectionName).create(data);
      return { success: true, record };
    } catch (error) {
      console.error(`Error creating ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update existing record
   */
  update: async (collectionName, id, data) => {
    try {
      const record = await pb.collection(collectionName).update(id, data);
      return { success: true, record };
    } catch (error) {
      console.error(`Error updating ${collectionName}/${id}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete record
   */
  delete: async (collectionName, id) => {
    try {
      await pb.collection(collectionName).delete(id);
      return { success: true };
    } catch (error) {
      console.error(`Error deleting ${collectionName}/${id}:`, error);
      return { success: false, error: error.message };
    }
  },
};

/**
 * Convert a PocketBase error into a user-friendly Indonesian message.
 * Handles the most common HTTP errors so catch blocks stay readable.
 *
 * @param {Error}  err     — the caught error (may have .status from PocketBase SDK)
 * @param {string} action  — short verb shown in the message, e.g. "hapus PO"
 * @returns {string}
 */
export const pbError = (err, action) => {
  const status = err?.status ?? err?.response?.code;
  if (status === 403) return `⛔ Akses ditolak — hanya admin yang bisa ${action}`;
  if (status === 404) return `⚠️ Data tidak ditemukan saat ${action}`;
  if (status === 400) return `⚠️ Data tidak valid saat ${action}: ${err.message}`;
  return `⚠️ Gagal ${action}: ${err?.message || "Error tidak diketahui"}`;
};

/**
 * Helper to strip invalid IDs before creation.
 * PocketBase IDs are 15 characters, alphanumeric.
 */
export const cleanRecord = (data) => {
  if (!data) return data;
  const clean = { ...data };
  // If id looks like a temp ID or non-PB ID, remove it so PB can generate a real one.
  if (clean.id && (clean.id.length !== 15 || clean.id.includes('-') || clean.id.includes(' '))) {
    delete clean.id;
  }
  return clean;
};

/**
 * Real-time subscription helper
 */
export const subscribeToCollection = (collectionName, callback) => {
  pb.collection(collectionName).subscribe('*', (e) => {
    callback(e);
  });

  // Return unsubscribe function
  return () => {
    pb.collection(collectionName).unsubscribe();
  };
};

export default pb;
