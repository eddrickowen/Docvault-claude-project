/**
 * Batch operation helpers for PocketBase
 * Improves performance by batching database operations
 */

/**
 * Batch process items with concurrent limit
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {number} batchSize - Number of concurrent operations
 * @returns {Promise<Array>} Results
 */
export async function batchProcess(items, processor, batchSize = 10) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(item => processor(item))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Batch create records in PocketBase
 * @param {Object} collection - PocketBase collection
 * @param {Array} records - Records to create
 * @param {number} batchSize - Batch size
 * @returns {Promise<Object>} {success: Array, failed: Array}
 */
export async function batchCreate(collection, records, batchSize = 20) {
  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const promises = batch.map(record =>
      collection.create(record)
        .then(created => ({ status: 'success', record: created }))
        .catch(error => ({ status: 'failed', record, error }))
    );

    const batchResults = await Promise.all(promises);

    batchResults.forEach(result => {
      if (result.status === 'success') {
        results.success.push(result.record);
      } else {
        results.failed.push({ record: result.record, error: result.error });
      }
    });
  }

  return results;
}

/**
 * Batch delete records in PocketBase
 * @param {Object} collection - PocketBase collection
 * @param {Array} ids - IDs to delete
 * @param {number} batchSize - Batch size
 * @returns {Promise<Object>} {success: Array, failed: Array}
 */
export async function batchDelete(collection, ids, batchSize = 20) {
  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);

    // Use Promise.allSettled to handle individual failures without stopping the batch
    const batchResults = await Promise.allSettled(
      batch.map(id => collection.delete(id).then(() => id))
    );

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.success.push(result.value);
      } else {
        results.failed.push({ id: batch[index], error: result.reason });
        console.error(`Failed to delete ${batch[index]}:`, result.reason);
      }
    });
  }

  return results;
}

/**
 * Batch update records in PocketBase
 * @param {Object} collection - PocketBase collection
 * @param {Array} records - Records with id to update
 * @param {number} batchSize - Batch size
 * @returns {Promise<Object>} {success: Array, failed: Array}
 */
export async function batchUpdate(collection, records, batchSize = 20) {
  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const promises = batch.map(record =>
      collection.update(record.id, record)
        .then(updated => ({ status: 'success', record: updated }))
        .catch(error => ({ status: 'failed', record, error }))
    );

    const batchResults = await Promise.all(promises);

    batchResults.forEach(result => {
      if (result.status === 'success') {
        results.success.push(result.record);
      } else {
        results.failed.push({ record: result.record, error: result.error });
      }
    });
  }

  return results;
}
