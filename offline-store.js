/**
 * NERA 2.0 - Offline Citizen Report Queue (IndexedDB)
 * Stores incident reports locally when network is unavailable and
 * automatically synchronizes with the FastAPI backend when connectivity returns.
 */

const DB_NAME = 'nera_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'reports_queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'offline_client_id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export const offlineStore = {
  /**
   * Save a report to the local IndexedDB queue.
   */
  async saveReport(report) {
    const db = await openDB();
    if (!report.offline_client_id) {
      report.offline_client_id = 'off-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    report.timestamp = new Date().toISOString();
    report.queued_offline = true;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(report);

      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('nera:offline-report-saved', { detail: report }));
        resolve(report);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Retrieve all reports currently waiting in the offline queue.
   */
  async getPendingReports() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Remove a successfully synced report from the queue.
   */
  async removeReport(offline_client_id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(offline_client_id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Synchronize all queued offline reports to the backend.
   */
  async syncReports(apiBaseUrl = '') {
    const pending = await this.getPendingReports();
    if (!pending.length) return [];

    console.log(`[NERA Offline Sync] Attempting to sync ${pending.length} pending report(s)...`);
    const synced = [];

    for (const report of pending) {
      try {
        const payload = {
          citizen_name: report.citizen_name,
          contact: report.contact || null,
          incident_type: report.incident_type,
          description: report.description,
          lat: report.lat,
          lng: report.lng,
          media_url: report.media_url || null,
          offline_client_id: report.offline_client_id
        };

        const res = await fetch(`${apiBaseUrl}/api/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          await this.removeReport(report.offline_client_id);
          synced.push(data);
        }
      } catch (err) {
        console.warn('[NERA Offline Sync] Failed to sync report, keeping in queue:', err);
        break; // Stop iteration if network failed again
      }
    }

    if (synced.length) {
      console.log(`[NERA Offline Sync] Successfully synced ${synced.length} report(s).`);
      window.dispatchEvent(new CustomEvent('nera:reports-synced', { detail: synced }));
    }

    return synced;
  }
};

// Automatic sync when network reconnects
window.addEventListener('online', () => {
  console.log('[NERA Network] Connection restored. Triggering offline report queue sync...');
  offlineStore.syncReports().catch(console.error);
});

