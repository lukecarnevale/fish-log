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
//   <ThemeProvider onReady={callback}>
//     <AppContent />
//   </ThemeProvider>

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
// Step 3 — Module-level AsyncStorage pre-read
// =============================================================================
// Kick off the read the moment this module is first imported — well before
// ThemeProvider mounts. By the time useState() runs, this is often already
// resolved, letting us seed the initial state with the correct value and skip
// the async loading window entirely.

let _preReadMode: ThemeMode | null = null;
let _preReadDone = false;

AsyncStorage.getItem(STORAGE_KEY)
  .then((val) => {
    if (val === 'light' || val === 'dark' || val === 'system') {
      _preReadMode = val;
    }
  })
  .catch(() => { /* ignore — fall back to 'system' */ })
  .finally(() => {
    _preReadDone = true;
  });

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

  /**
   * True while the persisted preference is loading from AsyncStorage
   * OR the dark-mode feature flag is still resolving.
   */
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
  /**
   * Step 4 — Called once both the AsyncStorage preference and the feature
   * flag have resolved. Use this to signal the app is ready to show content
   * (e.g., dismiss the splash screen).
   */
  onReady?: () => void;
}

export function ThemeProvider({ children, onReady }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme(); // 'light' | 'dark' | null

  // Seed initial themeMode from the pre-read if it already completed before
  // this component mounted (common on repeat launches — avoids a flash of
  // the wrong theme on the first render). isAsyncStorageLoading always starts
  // as true so the effect is always the authoritative read.
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    () => _preReadMode ?? 'system',
  );
  const [isAsyncStorageLoading, setIsAsyncStorageLoading] = useState(true);

  // ── Step 2 — Feature flag: expose isLoading so theme resolution can ──────
  // use the system color scheme while the flag is still in flight, rather
  // than defaulting to light mode.
  const { enabled: darkModeAvailable, isLoading: isFlagLoading } = useFeatureFlag('dark_mode');

  // ── Load persisted preference ──────────────────────────────────────────
  // Always performs a fresh read so the authoritative AsyncStorage value is
  // applied even if the module-level pre-read resolved before any value was
  // stored (e.g. first launch, or test environments).
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
        setIsAsyncStorageLoading(false);
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

  // ── Step 2 — Resolve the active theme ─────────────────────────────────
  // While the feature flag is still loading (isFlagLoading === true), resolve
  // using the system color scheme so dark-mode users don't see a light-mode
  // flash. Only lock to light mode once the flag has fully resolved to false.
  const theme = useMemo(() => {
    if (!isFlagLoading && !darkModeAvailable) {
      return buildTheme('light');
    }
    if (themeMode === 'system') {
      return buildTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    }
    return buildTheme(themeMode);
  }, [themeMode, systemColorScheme, darkModeAvailable, isFlagLoading]);

  // ── Step 4 — Signal readiness once both loading states clear ──────────
  const isLoading = isAsyncStorageLoading || isFlagLoading;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onReadyFiredRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !onReadyFiredRef.current) {
      onReadyFiredRef.current = true;
      onReadyRef.current?.();
    }
  }, [isLoading]);

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
