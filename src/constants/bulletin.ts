// constants/bulletin.ts
//
// Shared configuration for bulletin type display (color, icon, label).
// Used by BulletinCard, BulletinModal, BulletinsScreen, and DrawerMenu.

import { Feather } from '@expo/vector-icons';
import { colors } from '../styles/common';
import type { BulletinType } from '../types/bulletin';

export interface BulletinTypeConfig {
  color: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

/**
 * Visual config for each bulletin type — maps type to its display color,
 * Feather icon name, and uppercase label.
 */
export const BULLETIN_TYPE_CONFIG: Record<BulletinType, BulletinTypeConfig> = {
  closure: { color: colors.error, icon: 'alert-octagon', label: 'CLOSURE' },
  advisory: { color: colors.warning, icon: 'alert-triangle', label: 'ADVISORY' },
  educational: { color: colors.primary, icon: 'book-open', label: 'EDUCATIONAL' },
  info: { color: colors.secondary, icon: 'info', label: 'INFO' },
};
