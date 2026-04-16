// contexts/ThemeContext.tsx
//
// Provides the active theme (light or dark) to the entire app.
//
// Three-way preference: Light | Dark | System (follows OS)
// Persisted to AsyncStorage so the choice survives app restarts.
//
// Usage in components:
//   const { theme, themeMode, setThemeMode } = useTheme();
//   const styles = useThemedStyles(createStyles);
//
// Usage in App.tsx:
//   <ThemeProvider>
//     <AppContent />
//   </ThemeProvider>

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Theme,
  ThemeMode,
  buildTheme,
  lightTheme,
} from '../styles/theme';
import { useFeatureFlag } from '../api/featureFlagsApi';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = '@fish_log_theme_mode';

// =============================================================================
// Context Types
// =============================================================================

interface ThemeContextValue {
  /** The fully resolved theme object (colors, shadows, mode, isDark) */
  theme: Theme;

  /** The user's preference: 'light' | 'dark' | 'system' */
  themeMode: ThemeMode;

  /** Update the user's theme preference (persists to AsyncStorage) */
  setThemeMode: (mode: ThemeMode) => void;

  /** True while the persisted preference is loading from AsyncStorage */
  isLoading: boolean;

  /** Whether dark mode is available (controlled by feature flag) */
  darkModeAvailable: boolean;
}

// =============================================================================
// Context
// =============================================================================

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  themeMode: 'system',
  setThemeMode: () => {},
  isLoading: true,
  darkModeAvailable: false,
});

// =============================================================================
// Hook
// =============================================================================

/**
 * Access the current theme and theme controls.
 *
 * @example
 * const { theme, themeMode, setThemeMode } = useTheme();
 * // Use theme.colors.primary, theme.shadows.small, theme.isDark, etc.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// =============================================================================
// Provider
// =============================================================================

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme(); // 'light' | 'dark' | null
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // ── Feature flag: gate dark mode behind remote toggle ──────────────────
  const { enabled: darkModeAvailable } = useFeatureFlag('dark_mode');

  // ── Load persisted preference ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeModeState(stored);
        }
      } catch {
        // Silently fall back to 'system' on read error
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Persist preference changes ─────────────────────────────────────────
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {
      // Silently ignore write errors — preference will reset on next launch
    });
  }, []);

  // ── Resolve the active theme ───────────────────────────────────────────
  // When the dark_mode feature flag is OFF, always resolve to light.
  // This lets us ship the infrastructure safely and enable dark mode later.
  const theme = useMemo(() => {
    if (!darkModeAvailable) {
      return buildTheme('light');
    }
    if (themeMode === 'system') {
      return buildTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    }
    return buildTheme(themeMode);
  }, [themeMode, systemColorScheme, darkModeAvailable]);

  // ── Context value (stable reference via useMemo) ───────────────────────
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeMode, setThemeMode, isLoading, darkModeAvailable }),
    [theme, themeMode, setThemeMode, isLoading, darkModeAvailable],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
