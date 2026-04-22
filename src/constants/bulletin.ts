// constants/bulletin.ts
//
// Single source of truth for bulletin type display configuration.
// Every component that renders bulletin type indicators (badges, icons, labels)
// MUST import from here instead of defining inline config.

import type { Feather } from '@expo/vector-icons';
import type { BulletinType } from '../types/bulletin';
import { colors } from '../styles/common';
import type { Theme } from '../styles/theme';

export interface BulletinTypeConfig {
  /** Feather icon name for this bulletin type. */
  icon: keyof typeof Feather.glyphMap;
  /** Uppercase label shown in badges. */
  label: string;
  /** Primary accent color for text, icons, and borders. */
  color: string;
  /** Semi-transparent background for badge pills. */
  badgeBg: string;
}

/**
 * Visual config for each bulletin type.
 *
 * Uses `Record<BulletinType, ...>` so adding a new type to the union
 * produces a compile error here — forcing the developer to define its config.
 *
 * NOTE: This static export is theme-agnostic and uses light-mode values.
 * Components rendered against theme-aware surfaces (parchment, dark mode)
 * should prefer `getBulletinTypeConfig(theme)` so the badge backgrounds and
 * accent colors are tuned for the active palette and don't appear over-saturated
 * in dark mode.
 */
export const BULLETIN_TYPE_CONFIG: Record<BulletinType, BulletinTypeConfig> = {
  closure: {
    icon: 'alert-octagon',
    label: 'CLOSURE',
    color: colors.error,
    badgeBg: 'rgba(211,47,47,0.10)',
  },
  advisory: {
    icon: 'alert-triangle',
    label: 'ADVISORY',
    color: colors.advisory,
    badgeBg: 'rgba(234,88,12,0.10)',
  },
  educational: {
    icon: 'book-open',
    label: 'EDUCATIONAL',
    color: '#1565C0',
    badgeBg: 'rgba(21,101,192,0.10)',
  },
  info: {
    icon: 'info',
    label: 'INFO',
    color: colors.secondary,
    badgeBg: 'rgba(6,116,127,0.08)',
  },
};

/**
 * Theme-aware bulletin type config.
 *
 * In dark mode the accent colors and badge backgrounds are subtly desaturated
 * so badges sit calmly on the dark parchment surface instead of glowing.
 * Icons in feather glyphMap and labels are unchanged across modes.
 */
export const getBulletinTypeConfig = (
  theme: Theme,
): Record<BulletinType, BulletinTypeConfig> => {
  if (!theme.isDark) {
    return BULLETIN_TYPE_CONFIG;
  }
  return {
    closure: {
      icon: 'alert-octagon',
      label: 'CLOSURE',
      // Use the dark-palette error red — slightly lighter so it reads on dark surfaces
      color: theme.colors.error,
      badgeBg: 'rgba(239,83,80,0.16)',
    },
    advisory: {
      icon: 'alert-triangle',
      label: 'ADVISORY',
      color: theme.colors.advisory,
      badgeBg: 'rgba(240,138,74,0.18)',
    },
    educational: {
      icon: 'book-open',
      label: 'EDUCATIONAL',
      // Lighter blue accent in dark mode for legibility on dark parchment
      color: '#6FA8DC',
      badgeBg: 'rgba(111,168,220,0.18)',
    },
    info: {
      icon: 'info',
      label: 'INFO',
      color: theme.colors.secondary,
      badgeBg: 'rgba(42,165,176,0.16)',
    },
  };
};
