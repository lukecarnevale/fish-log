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

const compute = (): FontScaleInfo => {
  const fontScale = PixelRatio.getFontScale();
  return {
    fontScale,
    isLargeText: fontScale > 1.2,
    isExtraLargeText: fontScale >= 1.5,
    scaled: (value: number) => value * Math.min(fontScale, 1.5),
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
    return () => sub.remove();
  }, []);

  return info;
};

export default useFontScale;
