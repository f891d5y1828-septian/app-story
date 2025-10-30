// Util IndexedDB sederhana untuk menyimpan story offline
// Store: 'savedStories' (keyPath: 'id')

const DB_NAME = 'cinemagic-db';
const DB_VERSION = 1;
const STORE_SAVED = 'savedStories';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_SAVED)) {
        db.createObjectStore(STORE_SAVED, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveOfflineStory(story) {
  // Simpan story lengkap untuk dibaca offline
  return withStore(STORE_SAVED, 'readwrite', (store) => {
    store.put(story);
  });
}

export async function deleteOfflineStory(id) {
  return withStore(STORE_SAVED, 'readwrite', (store) => {
    store.delete(id);
  });
}

export async function getOfflineStory(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SAVED, 'readonly');
    const store = tx.objectStore(STORE_SAVED);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOfflineStories() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SAVED, 'readonly');
    const store = tx.objectStore(STORE_SAVED);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getSavedIdsSet() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SAVED, 'readonly');
    const store = tx.objectStore(STORE_SAVED);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const ids = new Set((req.result || []).map(String));
      resolve(ids);
    };
    req.onerror = () => reject(req.error);
  });
}

export default {
  saveOfflineStory,
  deleteOfflineStory,
  getOfflineStory,
  getAllOfflineStories,
  getSavedIdsSet,
};