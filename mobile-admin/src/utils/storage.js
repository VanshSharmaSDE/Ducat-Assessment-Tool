import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory fallback dictionary if native module is null or unlinked
const memoryStore = new Map();

/**
 * Safely verify if native storage module is accessible
 */
const safeGetNativeStorage = () => {
  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      return AsyncStorage;
    }
  } catch (e) {
    // Native module is null
  }
  return null;
};

/**
 * Bulletproof Storage Wrapper for React Native & Expo
 * Prevents "Native module is null / cannot access legacy storage" crashes
 */
export const storage = {
  getItem: async (key) => {
    try {
      const nativeStorage = safeGetNativeStorage();
      if (nativeStorage) {
        const val = await nativeStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch (e) {
      // Fall through to memory/localStorage
    }

    // Fallback: check web localStorage or memoryStore
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const localVal = window.localStorage.getItem(key);
        if (localVal !== null && localVal !== undefined) return localVal;
      } catch (e) {}
    }

    return memoryStore.get(key) || null;
  },

  setItem: async (key, value) => {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);

    // Save in memory
    memoryStore.set(key, stringVal);

    // Save in web localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, stringVal);
      } catch (e) {}
    }

    try {
      const nativeStorage = safeGetNativeStorage();
      if (nativeStorage) {
        await nativeStorage.setItem(key, stringVal);
      }
    } catch (e) {
      // Native module unavailable or errored
    }
  },

  removeItem: async (key) => {
    memoryStore.delete(key);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {}
    }

    try {
      const nativeStorage = safeGetNativeStorage();
      if (nativeStorage) {
        await nativeStorage.removeItem(key);
      }
    } catch (e) {}
  },

  multiRemove: async (keys) => {
    if (Array.isArray(keys)) {
      keys.forEach((k) => {
        memoryStore.delete(k);
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.removeItem(k);
          } catch (e) {}
        }
      });
    }

    try {
      const nativeStorage = safeGetNativeStorage();
      if (nativeStorage) {
        await nativeStorage.multiRemove(keys);
      }
    } catch (e) {}
  },
};

export default storage;
