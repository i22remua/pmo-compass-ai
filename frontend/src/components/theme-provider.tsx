'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, updateTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const preference = useRef<Theme>('system');

  function apply(value: Theme) {
    const resolved =
      value === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : value;
    document.documentElement.dataset.theme = resolved;
    setResolvedTheme(resolved);
  }

  useEffect(() => {
    let saved: Theme = 'system';
    try {
      const value = localStorage.getItem('pmo.theme');
      if (value === 'light' || value === 'dark') saved = value;
    } catch {
      /* Appearance remains available when browser storage is blocked. */
    }
    preference.current = saved;
    updateTheme(saved);
    apply(saved);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => {
      if (preference.current === 'system') apply('system');
    };
    media.addEventListener('change', followSystem);
    return () => media.removeEventListener('change', followSystem);
  }, []);

  function setTheme(value: Theme) {
    preference.current = value;
    updateTheme(value);
    apply(value);
    try {
      localStorage.setItem('pmo.theme', value);
    } catch {
      /* Keep the in-memory preference. */
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider missing');
  return value;
}
