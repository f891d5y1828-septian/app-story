// IndexedDB implementation for offline stories
const DB_NAME = 'StoriesDB';
const DB_VERSION = 1;
const STORE_NAME = 'savedStories';

let db = null;

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('name', 'name', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

// Save a story offline
export const saveOfflineStory = async (story) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    const request = objectStore.put({
      ...story,
      savedAt: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Error saving story:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error saving story:', error);
    return false;
  }
};

// Delete a saved story
export const deleteOfflineStory = async (storyId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    const request = objectStore.delete(storyId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Error deleting story:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    return false;
  }
};

// Get all saved story IDs as a Set
export const getSavedIdsSet = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    const request = objectStore.getAllKeys();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const keys = request.result.map(key => String(key));
        resolve(new Set(keys));
      };
      request.onerror = () => {
        console.error('Error getting saved IDs:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error getting saved IDs:', error);
    return new Set();
  }
};

// Get all saved stories
export const getAllSavedStories = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    const request = objectStore.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        console.error('Error getting all saved stories:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error getting all saved stories:', error);
    return [];
  }
};

// Get a specific saved story
export const getSavedStory = async (storyId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    const request = objectStore.get(storyId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        console.error('Error getting saved story:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error getting saved story:', error);
    return null;
  }
};