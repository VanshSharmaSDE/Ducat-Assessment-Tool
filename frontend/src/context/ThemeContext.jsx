import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuth();

  // Initialize theme from user profile in DB or localStorage fallback (default: 'light')
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
    }
    return 'light';
  });

  // Apply 'dark' class to <html> root element
  const applyThemeToDOM = useCallback((currentTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, []);

  // When user profile loads or changes from DB (cross-device sync)
  useEffect(() => {
    if (user?.theme && (user.theme === 'light' || user.theme === 'dark')) {
      if (user.theme !== theme) {
        setThemeState(user.theme);
        localStorage.setItem('theme', user.theme);
        applyThemeToDOM(user.theme);
      }
    }
  }, [user?.theme, theme, applyThemeToDOM]);

  // Apply theme on initial mount
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme, applyThemeToDOM]);

  // Setter that updates state, localStorage, DOM, and DB
  const setTheme = useCallback(
    async (newTheme) => {
      if (newTheme !== 'light' && newTheme !== 'dark') return;

      setThemeState(newTheme);
      localStorage.setItem('theme', newTheme);
      applyThemeToDOM(newTheme);

      // Persist to user record in DB if logged in
      if (user) {
        try {
          updateUser({ theme: newTheme });
          await api.put('/users/theme', { theme: newTheme });
        } catch (err) {
          console.error('Failed to persist theme to database:', err);
        }
      }
    },
    [user, updateUser, applyThemeToDOM]
  );

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
