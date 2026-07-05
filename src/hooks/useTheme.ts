import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'easa-theme';

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(getInitialMode()));

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    if (mode !== 'system') {
      setResolved(mode);
      return;
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolved(mq.matches ? 'dark' : 'light');
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = resolved === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolved, setTheme]);

  return { themeMode: mode, theme: resolved, setTheme, toggleTheme };
}
