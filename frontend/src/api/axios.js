import axios from 'axios';
import { showGlobalAlert } from '../context/ModalContext';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle concurrent session termination (login on another device)
    if (error.response?.status === 401 && error.response?.data?.errorCode === 'SESSION_TERMINATED') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login?reason=concurrent_session';
      return Promise.reject(error);
    }

    // Handle token refresh on 401
    if (error.response?.status === 401 && error.response?.data?.errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post(`${getBaseUrl()}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }

    // Handle Payload / File Too Large (413)
    if (error.response?.status === 413) {
      showGlobalAlert({
        title: 'File Too Large (413)',
        message: 'The uploaded file or image exceeds the server upload limit. Please select a smaller file (under 5MB).',
        type: 'error',
      });
    }

    // Handle Network Connection Errors
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      showGlobalAlert({
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your network connection or verify that the server is online.',
        type: 'error',
      });
    }

    // Handle Rate Limiting (429)
    if (error.response?.status === 429) {
      showGlobalAlert({
        title: 'Too Many Requests (429)',
        message: error.response?.data?.message || 'Server request rate limit exceeded. Please wait a moment before trying again.',
        type: 'warning',
      });
    }

    // Handle Access Forbidden (403)
    if (error.response?.status === 403) {
      showGlobalAlert({
        title: 'Access Restricted (403)',
        message: error.response?.data?.message || 'You do not have permission to perform this action or view this resource.',
        type: 'error',
      });
    }

    // Handle 500+ Internal Server Errors
    if (error.response?.status >= 500) {
      const url = error.config?.url || '';
      const isSilentEndpoint = url.includes('/heartbeat') || url.includes('/poll');
      if (!isSilentEndpoint) {
        showGlobalAlert({
          title: `Server Error (${error.response.status})`,
          message: error.response?.data?.message || 'An internal server error occurred while processing your request. Please try again or contact system support.',
          type: 'error',
        });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
