// constants/bulletin.ts
//
// Single source of truth for bulletin type display configuration.
// Every component that renders bulletin type indicators (badges, icons, labels)
// MUST import from here instead of defining inline config.

import type { Feather } from '@expo/vector-icons';
import type { BulletinType } from '../types/bulletin';
import { colors } from '../styles/common';

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
