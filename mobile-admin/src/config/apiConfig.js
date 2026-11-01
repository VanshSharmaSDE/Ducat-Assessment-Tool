import { storage } from '../utils/storage';
import { Platform } from 'react-native';

const STORAGE_KEY_SERVER_URL = '@skillcodex_admin_server_url';

// Default presets for convenient testing and production
export const SERVER_PRESETS = [
  {
    id: 'wifi_lan_current',
    label: 'Host PC Wi-Fi (Current)',
    sublabel: 'Connects directly to your machine at 10.126.226.111:5000',
    url: 'http://10.126.226.111:5000/api',
  },
  {
    id: 'emulator',
    label: 'Android Emulator',
    sublabel: 'Connects to your PC from Android Studio / emulator',
    url: 'http://10.0.2.2:5000/api',
  },
  {
    id: 'localhost',
    label: 'Localhost (PC / Web)',
    sublabel: 'For browser preview or device on host machine',
    url: 'http://localhost:5000/api',
  },
  {
    id: 'production',
    label: 'Live Cloud Production',
    sublabel: 'https://api.skillcodex.tech/api',
    url: 'https://api.skillcodex.tech/api',
  },
];

// Determine the most sensible initial default based on platform
export const getDefaultServerUrl = () => {
  if (Platform.OS === 'android') {
    // 10.126.226.111 works for physical devices on same Wi-Fi, 10.0.2.2 for emulator
    return 'http://10.126.226.111:5000/api';
  }
  return 'http://localhost:5000/api';
};

// In-memory active URL
let activeServerUrl = getDefaultServerUrl();

/**
 * Initialize active server URL from persistent storage
 */
export const initServerUrl = async () => {
  try {
    const saved = await storage.getItem(STORAGE_KEY_SERVER_URL);
    if (saved && saved.trim()) {
      activeServerUrl = formatApiUrl(saved.trim());
    } else {
      activeServerUrl = getDefaultServerUrl();
    }
  } catch (e) {
    activeServerUrl = getDefaultServerUrl();
  }
  return activeServerUrl;
};

/**
 * Normalize and ensure URL ends with /api
 */
export const formatApiUrl = (url) => {
  if (!url || typeof url !== 'string') return getDefaultServerUrl();
  let trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed.endsWith('/api')) {
    trimmed = `${trimmed}/api`;
  }
  return trimmed;
};

/**
 * Get active server base URL
 */
export const getActiveServerUrl = () => {
  return activeServerUrl;
};

/**
 * Save new server URL
 */
export const setServerUrl = async (newUrl) => {
  const formatted = formatApiUrl(newUrl);
  activeServerUrl = formatted;
  try {
    await storage.setItem(STORAGE_KEY_SERVER_URL, formatted);
  } catch (e) {
    console.warn('Failed to save server URL', e);
  }
  return formatted;
};

/**
 * Test server connectivity and measure response latency (ping in ms)
 */
export const testServerPing = async (targetUrl) => {
  const url = formatApiUrl(targetUrl);
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    // Attempt pinging server root or auth status endpoint
    const baseUrl = url.replace(/\/api\/?$/, '');
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(async () => {
      // Fallback try /api
      return await fetch(`${url}/`, {
        method: 'GET',
        signal: controller.signal,
      });
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    return {
      success: true,
      latency,
      status: response?.status || 200,
      url,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      success: false,
      latency: null,
      error: error.name === 'AbortError' ? 'Connection timed out (4s)' : 'Server unreachable. Check host & port.',
      url,
    };
  }
};
