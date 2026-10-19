import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

// 2 hours in milliseconds: 2 * 60 * 60 * 1000 = 7,200,000 ms
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000; // Check every 15 seconds
const ACTIVITY_THROTTLE_MS = 10 * 1000; // Throttle activity localStorage writes to every 10 seconds

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastRecordedActivityRef = useRef(Date.now());

  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastRecordedActivityRef.current > ACTIVITY_THROTTLE_MS) {
      lastRecordedActivityRef.current = now;
      try {
        localStorage.setItem('lastActivity', now.toString());
      } catch (e) {
        // ignore localStorage errors
      }
    }
  }, []);

  const handleInactivityLogout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
      setUser(null);
      window.location.href = '/login?reason=inactivity';
    }
  }, []);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Check if user was inactive for over 2 hours prior to page load/reload
      const last = parseInt(localStorage.getItem('lastActivity') || '0', 10);
      if (last && Date.now() - last > INACTIVITY_TIMEOUT_MS) {
        handleInactivityLogout();
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data.user);
        const now = Date.now();
        lastRecordedActivityRef.current = now;
        localStorage.setItem('lastActivity', now.toString());
      } catch (err) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('lastActivity');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [handleInactivityLogout]);

  // Set up activity listeners and periodic inactivity check for any authenticated user (Admin, Faculty, Student)
  useEffect(() => {
    if (!user) return;

    // Track initial activity timestamp on auth
    const now = Date.now();
    lastRecordedActivityRef.current = now;
    if (!localStorage.getItem('lastActivity')) {
      localStorage.setItem('lastActivity', now.toString());
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const onUserInteraction = () => {
      recordActivity();
    };

    events.forEach((evt) => {
      window.addEventListener(evt, onUserInteraction, { passive: true });
    });

    // Synchronize activity across multiple browser tabs
    const onStorageChange = (e) => {
      if (e.key === 'lastActivity' && e.newValue) {
        lastRecordedActivityRef.current = parseInt(e.newValue, 10);
      } else if (e.key === 'accessToken' && !e.newValue) {
        // User logged out in another tab
        setUser(null);
      }
    };
    window.addEventListener('storage', onStorageChange);

    // Periodic inactivity scanner
    const interval = setInterval(() => {
      const storedLast = parseInt(localStorage.getItem('lastActivity') || '0', 10);
      const effectiveLast = storedLast || lastRecordedActivityRef.current;
      if (effectiveLast && Date.now() - effectiveLast > INACTIVITY_TIMEOUT_MS) {
        handleInactivityLogout();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, onUserInteraction);
      });
      window.removeEventListener('storage', onStorageChange);
      clearInterval(interval);
    };
  }, [user, recordActivity, handleInactivityLogout]);

  const login = async (identifierOrEmail, password, extraData = {}) => {
    // Detect client device and viewport characteristics
    const isMobileUA = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenWidth = typeof window !== 'undefined' ? (window.screen?.width || window.innerWidth || 0) : 0;
    const screenHeight = typeof window !== 'undefined' ? (window.screen?.height || window.innerHeight || 0) : 0;
    const windowWidth = typeof window !== 'undefined' ? (window.innerWidth || 0) : 0;
    const windowHeight = typeof window !== 'undefined' ? (window.innerHeight || 0) : 0;
    const isMobile = isMobileUA || (screenWidth > 0 && screenWidth < 1024) || (windowWidth > 0 && windowWidth < 1024);

    const deviceInfo = {
      screenWidth,
      screenHeight,
      windowWidth,
      windowHeight,
      isMobile,
      deviceType: isMobile ? 'mobile' : 'laptop',
      ...extraData?.deviceInfo,
    };

    const res = await api.post('/auth/login', {
      identifier: identifierOrEmail,
      email: identifierOrEmail,
      password,
      deviceInfo,
      ...extraData,
    });
    const { user, accessToken, refreshToken } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    const now = Date.now();
    lastRecordedActivityRef.current = now;
    localStorage.setItem('lastActivity', now.toString());
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
      setUser(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
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

