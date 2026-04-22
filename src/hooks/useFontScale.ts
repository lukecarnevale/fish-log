// useFontScale.ts - Dynamic Type awareness hook
//
// Lets components react to the user's system text size setting so they can
// adjust layouts (e.g. collapse a row into a column, hide decorative icons,
// add extra padding) at large accessibility text sizes.
//
// `PixelRatio.getFontScale()` returns 1.0 at default, ~1.5 at "Larger Text"
// slider max, and up to ~3.1 at the iOS accessibility text sizes.

import { useEffect, useState } from 'react';
import { AppState, PixelRatio } from 'react-native';

// ── Centralised scaling constants ────────────────────────────────────────────
// Used by components that adapt layout based on text scale. Keep all magic
// numbers here so they're easy to tune in one place.

/** Threshold above which `isLargeText` is true (user bumped text above default). */
export const LARGE_TEXT_THRESHOLD = 1.2;

/** Threshold at which `isExtraLargeText` fires (accessibility-level sizes). */
export const EXTRA_LARGE_TEXT_THRESHOLD = 1.5;

/** Maximum multiplier applied by the `scaled()` helper. */
export const SCALED_CAP = 1.5;

/** Default cap for general body text (used in Text.defaultProps and AppText). */
export const FONT_SCALE_CAP_BODY = 1.3;

/** Cap for headings / titles that have less room to grow. */
export const FONT_SCALE_CAP_TITLE = 1.2;

/** Cap for small captions / supporting text. */
export const FONT_SCALE_CAP_CAPTION = 1.15;

/** Cap for badges and very compact UI chrome. */
export const FONT_SCALE_CAP_BADGE = 1.1;

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface FontScaleInfo {
  /** Raw font scale from the OS. 1.0 = default. */
  fontScale: number;
  /** True when user has bumped text above the default slider range. */
  isLargeText: boolean;
  /** True at accessibility-level sizes (AX1+). Layouts often need to reflow here. */
  isExtraLargeText: boolean;
  /** Convenience: apply this to spacing tokens to grow them with text. */
  scaled: (value: number) => number;
}

export const compute = (): FontScaleInfo => {
  let fontScale = PixelRatio.getFontScale();

  // Defensive: ensure fontScale is a valid positive number
  if (!Number.isFinite(fontScale) || fontScale < 0.5) {
    fontScale = 1.0;
  }

  return {
    fontScale,
    isLargeText: fontScale > LARGE_TEXT_THRESHOLD,
    isExtraLargeText: fontScale >= EXTRA_LARGE_TEXT_THRESHOLD,
    scaled: (value: number) => value * Math.min(fontScale, SCALED_CAP),
  };
};

export const useFontScale = (): FontScaleInfo => {
  const [info, setInfo] = useState<FontScaleInfo>(compute);

  useEffect(() => {
    // The OS can change font scale while the app is backgrounded. Re-check
    // when we come back to the foreground.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const next = compute();
        setInfo((prev) => (prev.fontScale === next.fontScale ? prev : next));
      }
    });
    return () => sub?.remove?.();
  }, []);

  return info;
};

export default useFontScale;
