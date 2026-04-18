// styles/theme.ts
//
// Theme system for light/dark mode support.
//
// Architecture:
//   1. `ColorPalette` — semantic color tokens used by components (mode-agnostic names)
//   2. `lightPalette` / `darkPalette` — concrete values for each mode
//   3. `Theme` — full theme object (palette + mode flag + shadows)
//
// Components consume colors via the `useTheme()` hook from ThemeContext,
// never importing `colors` from common.ts directly (legacy pattern).
//
// The dark palette preserves the ocean identity using deep navy/slate tones
// rather than neutral grays, so the app still "feels like the ocean" at night.

import { Platform, ViewStyle } from 'react-native';

// =============================================================================
// Color Palette Interface (semantic, mode-agnostic names)
// =============================================================================

export interface ColorPalette {
  // ── Brand ──────────────────────────────────────────────────────────────
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // ── Secondary ──────────────────────────────────────────────────────────
  secondary: string;
  secondaryLight: string;

  // ── Accent ─────────────────────────────────────────────────────────────
  accent: string;

  // ── Status ─────────────────────────────────────────────────────────────
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;

  // ── Surfaces ───────────────────────────────────────────────────────────
  /** Main screen background */
  background: string;
  /** Card / elevated surface background */
  surface: string;
  /** Higher-elevation surface (modals, bottom sheets) */
  surfaceElevated: string;
  /** Skeleton loader / placeholder background */
  surfaceMuted: string;

  // ── Text ───────────────────────────────────────────────────────────────
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  /** Text rendered on primary-colored surfaces (buttons, headers) */
  textOnPrimary: string;

  // ── Borders & Dividers ─────────────────────────────────────────────────
  border: string;
  divider: string;

  // ── Utility ────────────────────────────────────────────────────────────
  overlay: string;
  shadow: string;
  transparent: string;

  // ── Decorative ──────────────────────────────────────────────────────────
  /** Gold accent — badges, rewards, stars */
  gold: string;
  /** Notification badge red */
  badgeRed: string;

  // ── Parchment (Bulletin theme) ─────────────────────────────────────────
  /** Bulletin/advisory card background */
  parchment: string;
  /** Bulletin/advisory border */
  parchmentBorder: string;
  /** Primary text on parchment surfaces */
  parchmentText: string;
  /** Secondary/muted text on parchment surfaces */
  parchmentTextSecondary: string;
  /** Advisory orange (closures, warnings) */
  advisory: string;

  // ── Ocean-Specific ─────────────────────────────────────────────────────
  oceanDeep: string;
  oceanSurface: string;
  sandyShore: string;
  coralAccent: string;
  seaweedGreen: string;
  pearlWhite: string;
  seafoamGreen: string;

  // ── Legacy aliases (keep imports working during migration) ─────────────
  /** @deprecated Use `surface` instead */
  white: string;
  /** @deprecated Use `surface` instead */
  card: string;
  /** @deprecated Use `surfaceMuted` instead */
  lightGray: string;
  /** @deprecated Use `surfaceMuted` instead */
  lightestGray: string;
  /** @deprecated Use `textSecondary` instead */
  mediumGray: string;
  /** @deprecated Use `textSecondary` instead */
  darkGray: string;
  /** @deprecated Use `textPrimary` instead */
  black: string;
}

// =============================================================================
// Theme Shape
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeShadows {
  none: ViewStyle;
  small: ViewStyle;
  medium: ViewStyle;
  large: ViewStyle;
}

export interface Theme {
  mode: 'light' | 'dark'; // Resolved mode (never 'system')
  colors: ColorPalette;
  shadows: ThemeShadows;
  /** True when the resolved mode is 'dark' */
  isDark: boolean;
  /** Status bar content style for this theme */
  statusBarStyle: 'light' | 'dark';
}

// =============================================================================
// Light Palette
// =============================================================================

export const lightPalette: ColorPalette = {
  // Brand
  primary: '#0B548B',
  primaryDark: '#063A5D',
  primaryLight: '#C3E0F7',

  // Secondary
  secondary: '#06747F',
  secondaryLight: '#A2E5EF',

  // Accent
  accent: '#FF7F25',

  // Status
  success: '#2E7D4B',
  successLight: '#E8F5E9',
  warning: '#F9A825',
  warningLight: '#FFF8E1',
  error: '#D32F2F',
  danger: '#D32F2F',
  dangerLight: '#FFEBEE',
  info: '#1A7AAD',
  infoLight: '#E3F2FD',

  // Surfaces
  background: '#E5F4FF',
  surface: '#F5F7F8',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#E1F5FE',

  // Text
  textPrimary: '#263238',
  textSecondary: '#546E7A',
  textTertiary: '#78909C',
  textOnPrimary: '#FFFFFF',

  // Borders & Dividers
  border: '#B2DEF9',
  divider: '#D6EBF7',

  // Utility
  overlay: 'rgba(3, 37, 65, 0.5)',
  shadow: 'rgba(7, 52, 94, 0.22)',
  transparent: 'transparent',

  // Decorative
  gold: '#FFD700',
  badgeRed: '#FF6B6B',

  // Parchment (Bulletin theme)
  parchment: '#FEF9F0',
  parchmentBorder: '#E8DCC8',
  parchmentText: '#44300A',
  parchmentTextSecondary: '#A3865A',
  advisory: '#EA580C',

  // Ocean-specific
  oceanDeep: '#042C5C',
  oceanSurface: '#85C5E5',
  sandyShore: '#F5DEB3',
  coralAccent: '#FF7F50',
  seaweedGreen: '#2E8B57',
  pearlWhite: '#F5F7F8',
  seafoamGreen: '#71EEB8',

  // Legacy aliases
  white: '#FFFFFF',
  card: '#FFFFFF',
  lightGray: '#E1F5FE',
  lightestGray: '#F0F8FF',
  mediumGray: '#B0BEC5',
  darkGray: '#546E7A',
  black: '#263238',
};

// =============================================================================
// Dark Palette
// =============================================================================
//
// Design principles:
//   • No pure black — use deep navy/slate tones to maintain ocean identity
//   • Surface elevation = lighter surfaces (Material Design 3 tonal elevation)
//   • Desaturate vivid accents to prevent glow/vibration on dark backgrounds
//   • Body text off-white (#E0E6ED) for reading comfort, not pure #FFFFFF
//   • All foreground/background pairings target ≥ 4.5:1 contrast (WCAG AA)
//   • Shadows are nearly invisible in dark mode — rely on surface tonal shifts

export const darkPalette: ColorPalette = {
  // Brand — slightly lighter primary so it's visible on dark surfaces
  primary: '#3A8AC2',
  primaryDark: '#0B548B',
  primaryLight: '#1B3A54',

  // Secondary — desaturated teal for dark backgrounds
  secondary: '#2AA5B0',
  // Dark-mode secondary surface — matches the Profile screen header gradient
  // start (#05626C → #06747F). Dark enough to feel at home in dark mode while
  // keeping the teal identity vivid and alive.
  secondaryLight: '#05626C',

  // Accent — slightly desaturated sunset orange
  accent: '#FF9A52',

  // Status — desaturated for dark surfaces, still meeting contrast ratios
  success: '#4CAF6E',
  successLight: '#1A2E1F',
  warning: '#FFBB33',
  warningLight: '#2A2518',
  error: '#EF5350',
  danger: '#EF5350',
  dangerLight: '#2D1A1A',
  info: '#42A5CC',
  infoLight: '#152A38',

  // Surfaces — deep navy tones, progressively lighter at higher elevation
  background: '#0D1B2A',      // Deepest — main screen background
  surface: '#162A3E',         // Cards, list items
  surfaceElevated: '#1E3650', // Modals, bottom sheets, elevated cards
  surfaceMuted: '#11232F',    // Skeleton loaders, disabled backgrounds

  // Text — off-whites, never pure #FFFFFF for body text
  textPrimary: '#E0E6ED',
  textSecondary: '#8FA3B3',
  textTertiary: '#5D7A8C',
  textOnPrimary: '#FFFFFF',

  // Borders & Dividers — subtle, low-contrast on dark surfaces
  border: '#243B50',
  divider: '#1C3042',

  // Utility
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',
  transparent: 'transparent',

  // Decorative — slightly muted for dark surfaces
  gold: '#E6C200',
  badgeRed: '#E05555',

  // Parchment (Bulletin theme) — dark-adapted: aged parchment → dark leather
  parchment: '#1E1A14',
  parchmentBorder: '#3A3228',
  parchmentText: '#D4C4A0',
  parchmentTextSecondary: '#A39272',
  advisory: '#F08A4A',

  // Ocean-specific — dark-adapted
  oceanDeep: '#081828',
  oceanSurface: '#1E4A6E',
  sandyShore: '#3D3425',
  coralAccent: '#E87F5A',
  seaweedGreen: '#3A9B6A',
  pearlWhite: '#162A3E',
  seafoamGreen: '#4BB88A',

  // Legacy aliases — mapped to dark equivalents
  white: '#162A3E',
  card: '#162A3E',
  lightGray: '#11232F',
  lightestGray: '#0F1E2B',
  mediumGray: '#5D7A8C',
  darkGray: '#8FA3B3',
  black: '#E0E6ED',
};

// =============================================================================
// Shadow Definitions (theme-aware)
// =============================================================================

/** Light mode shadows — traditional elevation via shadow/elevation */
export const lightShadows: ThemeShadows = {
  none: {},
  small: Platform.select({
    ios: {
      shadowColor: lightPalette.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 2.0,
    },
    android: { elevation: 3 },
    default: {
      shadowColor: lightPalette.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 2.0,
    },
  }) as ViewStyle,
  medium: Platform.select({
    ios: {
      shadowColor: lightPalette.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4.0,
    },
    android: { elevation: 5 },
    default: {
      shadowColor: lightPalette.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4.0,
    },
  }) as ViewStyle,
  large: Platform.select({
    ios: {
      shadowColor: lightPalette.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35,
      shadowRadius: 6.5,
    },
    android: { elevation: 10 },
    default: {
      shadowColor: lightPalette.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35,
      shadowRadius: 6.5,
    },
  }) as ViewStyle,
};

/**
 * Dark mode shadows — minimal traditional shadows (they're invisible anyway).
 * Depth is conveyed through surface tonal shifts instead.
 * We keep small elevation values so Android still draws z-ordering correctly.
 */
export const darkShadows: ThemeShadows = {
  none: {},
  small: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2.0,
    },
    android: { elevation: 2 },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2.0,
    },
  }) as ViewStyle,
  medium: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 3.0,
    },
    android: { elevation: 3 },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 3.0,
    },
  }) as ViewStyle,
  large: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 5.0,
    },
    android: { elevation: 6 },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 5.0,
    },
  }) as ViewStyle,
};

// =============================================================================
// Theme Builders
// =============================================================================

export function buildTheme(resolvedMode: 'light' | 'dark'): Theme {
  const isDark = resolvedMode === 'dark';
  return {
    mode: resolvedMode,
    colors: isDark ? darkPalette : lightPalette,
    shadows: isDark ? darkShadows : lightShadows,
    isDark,
    statusBarStyle: isDark ? 'light' : 'light', // Both use light (white icons) — header is always dark blue
  };
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
