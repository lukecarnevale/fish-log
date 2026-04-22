// hooks/useThemedStyles.ts
//
// Generates theme-aware styles that update when the theme changes.
//
// This replaces the static `StyleSheet.create()` pattern for any styles
// that reference theme colors. Non-themed styles (layout, spacing) can
// remain in a static StyleSheet since they don't change between modes.
//
// Usage:
//   const createStyles = (theme: Theme) => StyleSheet.create({
//     container: { backgroundColor: theme.colors.background },
//     title: { color: theme.colors.textPrimary },
//   });
//
//   function MyComponent() {
//     const styles = useThemedStyles(createStyles);
//     return <View style={styles.container}><Text style={styles.title}>Hi</Text></View>;
//   }
//
// Performance notes:
//   • The style factory is called only when the theme object changes (mode switch).
//   • StyleSheet.create() is called inside useMemo, so RN still flattens & validates.
//   • The factory function reference should be stable (defined outside the component
//     or wrapped in useCallback) to avoid unnecessary recalculations.

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../styles/theme';

type NamedStyles<T> = { [P in keyof T]: T[P] };

/**
 * Create theme-aware styles that re-compute when the theme changes.
 *
 * @param createStyles  A function that receives the current Theme and returns
 *                      a StyleSheet definition object. Define this outside
 *                      the component for best performance.
 * @returns The computed StyleSheet, typed to match the keys of the definition.
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  createStyles: (theme: Theme) => T | StyleSheet.NamedStyles<T>,
): T {
  const { theme } = useTheme();
  return useMemo(
    () => StyleSheet.create(createStyles(theme)) as unknown as T,
    [theme, createStyles],
  );
}
