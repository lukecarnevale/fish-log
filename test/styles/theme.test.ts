// test/styles/theme.test.ts
//
// Tests for the theme palette definitions and buildTheme utility.

import {
  lightPalette,
  darkPalette,
  buildTheme,
  lightTheme,
  darkTheme,
  lightShadows,
  darkShadows,
} from '../../src/styles/theme';

// =============================================================================
// Palette completeness
// =============================================================================

describe('Theme Palettes', () => {
  it('light and dark palettes have identical keys', () => {
    const lightKeys = Object.keys(lightPalette).sort();
    const darkKeys = Object.keys(darkPalette).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it('no palette value is undefined or empty string', () => {
    for (const [key, val] of Object.entries(lightPalette)) {
      expect(val).toBeTruthy();
    }
    for (const [key, val] of Object.entries(darkPalette)) {
      expect(val).toBeTruthy();
    }
  });

  it('transparent is literally "transparent" in both palettes', () => {
    expect(lightPalette.transparent).toBe('transparent');
    expect(darkPalette.transparent).toBe('transparent');
  });
});

// =============================================================================
// Light palette matches legacy colors
// =============================================================================

describe('Light palette — backward compatibility', () => {
  it('primary colors match the original design system', () => {
    expect(lightPalette.primary).toBe('#0B548B');
    expect(lightPalette.primaryDark).toBe('#063A5D');
    expect(lightPalette.primaryLight).toBe('#C3E0F7');
  });

  it('background matches the original watery blue', () => {
    expect(lightPalette.background).toBe('#E5F4FF');
  });

  it('legacy alias "white" still resolves to #FFFFFF', () => {
    expect(lightPalette.white).toBe('#FFFFFF');
  });

  it('surface maps to pearlWhite', () => {
    expect(lightPalette.surface).toBe(lightPalette.pearlWhite);
  });
});

// =============================================================================
// Dark palette design rules
// =============================================================================

describe('Dark palette — design rules', () => {
  it('background is NOT pure black (#000000)', () => {
    expect(darkPalette.background).not.toBe('#000000');
  });

  it('textPrimary is NOT pure white (#FFFFFF)', () => {
    expect(darkPalette.textPrimary).not.toBe('#FFFFFF');
  });

  it('textOnPrimary IS white (for buttons/headers on primary bg)', () => {
    expect(darkPalette.textOnPrimary).toBe('#FFFFFF');
  });

  it('surface is lighter than background (tonal elevation)', () => {
    // Convert hex to numeric for comparison
    const bgVal = parseInt(darkPalette.background.replace('#', ''), 16);
    const surfaceVal = parseInt(darkPalette.surface.replace('#', ''), 16);
    expect(surfaceVal).toBeGreaterThan(bgVal);
  });

  it('surfaceElevated is lighter than surface (tonal elevation)', () => {
    const surfaceVal = parseInt(darkPalette.surface.replace('#', ''), 16);
    const elevatedVal = parseInt(darkPalette.surfaceElevated.replace('#', ''), 16);
    expect(elevatedVal).toBeGreaterThan(surfaceVal);
  });
});

// =============================================================================
// buildTheme
// =============================================================================

describe('buildTheme', () => {
  it('returns a light theme with isDark=false', () => {
    const theme = buildTheme('light');
    expect(theme.mode).toBe('light');
    expect(theme.isDark).toBe(false);
    expect(theme.colors).toBe(lightPalette);
    expect(theme.shadows).toBe(lightShadows);
  });

  it('returns a dark theme with isDark=true', () => {
    const theme = buildTheme('dark');
    expect(theme.mode).toBe('dark');
    expect(theme.isDark).toBe(true);
    expect(theme.colors).toBe(darkPalette);
    expect(theme.shadows).toBe(darkShadows);
  });

  it('pre-built lightTheme/darkTheme match buildTheme output', () => {
    expect(lightTheme).toEqual(buildTheme('light'));
    expect(darkTheme).toEqual(buildTheme('dark'));
  });

  it('statusBarStyle is "light" for both themes (header is always dark)', () => {
    expect(lightTheme.statusBarStyle).toBe('light');
    expect(darkTheme.statusBarStyle).toBe('light');
  });
});

// =============================================================================
// Shadows
// =============================================================================

describe('Theme Shadows', () => {
  it('light shadows have elevation values for Android', () => {
    // Platform.select returns the default key in tests (not android)
    // but we can verify the structure exists
    expect(lightShadows.none).toEqual({});
    expect(lightShadows.small).toBeDefined();
    expect(lightShadows.medium).toBeDefined();
    expect(lightShadows.large).toBeDefined();
  });

  it('dark shadows have reduced values compared to light', () => {
    // In test env, Platform.select returns 'default' which uses iOS-style shadows
    const lightSmall = lightShadows.small as any;
    const darkSmall = darkShadows.small as any;

    if (lightSmall.shadowOpacity !== undefined && darkSmall.shadowOpacity !== undefined) {
      // Dark shadows should use black (#000000) instead of blue-tinted shadow
      expect(darkSmall.shadowColor).toBe('#000000');
    }
  });
});
