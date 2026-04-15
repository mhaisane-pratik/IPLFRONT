import { useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark';

const THEME_KEY = 'ipl_theme';

const applyTheme = (theme: AppTheme) => {
  document.documentElement.setAttribute('data-theme', theme);
};

export const getInitialTheme = (): AppTheme => {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return 'light';
};

export const initializeTheme = () => {
  applyTheme(getInitialTheme());
};

const useTheme = () => {
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  };
};

export default useTheme;
