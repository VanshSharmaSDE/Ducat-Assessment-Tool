import { storage } from '../utils/storage';
import { getActiveServerUrl } from '../config/apiConfig';

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@skillcodex_access_token',
  REFRESH_TOKEN: '@skillcodex_refresh_token',
  USER: '@skillcodex_user_profile',
};

// Global session expired callback for AuthContext listener
let sessionExpiredCallback = null;

export const setSessionExpiredListener = (callback) => {
  sessionExpiredCallback = callback;
};

/**
 * Core HTTP Request Wrapper for React Native
 */
export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getActiveServerUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  const headers = {
    'Accept': 'application/json',
    ...(options.isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = options.isFormData ? options.body : JSON.stringify(options.body);
  }

  try {
    let response = await fetch(fullUrl, fetchOptions);

    // Handle Token Expiry & Silent Refresh
    if (response.status === 401 && !options._retry) {
      const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshJson = await refreshRes.json();
          if (refreshRes.ok && refreshJson.data?.accessToken) {
            const newAccessToken = refreshJson.data.accessToken;
            await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
            headers['Authorization'] = `Bearer ${newAccessToken}`;

            // Retry original request once
            return await apiRequest(endpoint, { ...options, _retry: true });
          }
        } catch (refreshErr) {
          console.warn('Failed to refresh token', refreshErr);
        }
      }

      // If refresh failed or not available, notify session expired
      if (sessionExpiredCallback) {
        sessionExpiredCallback('Session expired. Please log in again.');
      }
    }

    const contentType = response.headers.get('content-type') || '';
    let responseData = null;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        responseData?.message ||
        responseData?.error ||
        `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (err) {
    if (err.message === 'Network request failed' || err.name === 'TypeError') {
      const networkError = new Error(
        `Unable to connect to server at ${baseUrl}. Ensure backend is running and server IP is accessible from this device.`
      );
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw err;
  }
}

// Convenience Methods
export const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE', body }),
};

export { STORAGE_KEYS };
