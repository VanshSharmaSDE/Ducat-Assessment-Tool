import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { api, STORAGE_KEYS, setSessionExpiredListener } from '../api/client';
import {
  initServerUrl,
  getActiveServerUrl,
  setServerUrl,
  testServerPing,
} from '../config/apiConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrlState] = useState(getActiveServerUrl());
  const [serverStatus, setServerStatus] = useState({ online: false, latency: null, checked: false });

  // Handle session expiration callback from API client
  const handleSessionExpired = useCallback(async (reason) => {
    await storage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
    setUser(null);
  }, []);

  // Check connectivity to active server
  const checkServerStatus = useCallback(async (targetUrl) => {
    const ping = await testServerPing(targetUrl || getActiveServerUrl());
    setServerStatus({
      online: ping.success,
      latency: ping.latency,
      checked: true,
      error: ping.error,
    });
    return ping;
  }, []);

  // Update server URL
  const updateServerUrl = async (newUrl) => {
    const updated = await setServerUrl(newUrl);
    setServerUrlState(updated);
    await checkServerStatus(updated);
    return updated;
  };

  // Initial load on app boot
  useEffect(() => {
    setSessionExpiredListener(handleSessionExpired);

    async function bootstrap() {
      try {
        const url = await initServerUrl();
        setServerUrlState(url);
        checkServerStatus(url);

        const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) {
          setLoading(false);
          return;
        }

        // Validate token against backend /auth/me
        try {
          const res = await api.get('/auth/me');
          if (res?.data?.user) {
            const userData = res.data.user;
            // Strict role check: Exclusively ADMIN can access this mobile app
            if (userData.role === 'ADMIN') {
              setUser(userData);
              await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
            } else {
              // Any non-admin user (e.g. Faculty or Student): clear tokens and reject
              await storage.multiRemove([
                STORAGE_KEYS.ACCESS_TOKEN,
                STORAGE_KEYS.REFRESH_TOKEN,
                STORAGE_KEYS.USER,
              ]);
              setUser(null);
            }
          }
        } catch (authErr) {
          // If network failed but user was previously stored, fall back to cached profile if admin
          const cachedUser = await storage.getItem(STORAGE_KEYS.USER);
          if (cachedUser && authErr.isNetworkError) {
            try {
              const parsed = JSON.parse(cachedUser);
              if (parsed?.role === 'ADMIN') {
                setUser(parsed);
              } else {
                setUser(null);
              }
            } catch (e) {
              setUser(null);
            }
          } else {
            await storage.multiRemove([
              STORAGE_KEYS.ACCESS_TOKEN,
              STORAGE_KEYS.REFRESH_TOKEN,
              STORAGE_KEYS.USER,
            ]);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to bootstrap auth', err);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [checkServerStatus, handleSessionExpired]);

  // Login handler
  const login = async (identifier, password) => {
    const trimmedId = identifier ? String(identifier).trim() : '';
    if (!trimmedId || !password) {
      throw new Error('Please enter both your Admin ID / Email and password.');
    }

    const deviceInfo = {
      deviceType: 'android-mobile',
      isMobile: true,
      client: 'SkillCodex Android Admin',
    };

    const payload = {
      identifier: trimmedId,
      email: trimmedId,
      password,
      deviceInfo,
    };

    const res = await api.post('/auth/login', payload);
    const { user: loggedUser, accessToken, refreshToken } = res.data;

    // Strict role check: Exclusively ADMIN accounts can log in
    if (loggedUser.role !== 'ADMIN') {
      await storage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      throw new Error(
        'Access Denied: This mobile application is strictly restricted to Administrator accounts only. Faculty and Student logins are not permitted.'
      );
    }

    // Persist session
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedUser));

    setUser(loggedUser);
    return loggedUser;
  };

  // Logout handler
  const logout = async () => {
    try {
      const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch (e) {
      // ignore
    } finally {
      await storage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      setUser(null);
    }
  };

  // Refresh profile from server
  const refreshUserProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res?.data?.user) {
        if (res.data.user.role === 'ADMIN') {
          setUser(res.data.user);
          await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
          return res.data.user;
        } else {
          await logout();
          return null;
        }
      }
    } catch (e) {
      console.warn('Failed to refresh user profile', e);
    }
    return user;
  };

  const isSuperAdmin = user?.role === 'ADMIN';
  const isFaculty = false; // Strictly disabled on mobile admin app

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        serverUrl,
        serverStatus,
        updateServerUrl,
        checkServerStatus,
        login,
        logout,
        refreshUserProfile,
        isSuperAdmin,
        isFaculty,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
