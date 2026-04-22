// components/SpeciesListBulletinIndicator.tsx
//
// Compact inline indicator shown on species list items.
// Displays closure/advisory icons with optional label text.
// Uses icon + color (never color alone) for accessibility.
// Reads harvest status directly from species data — no context dependency.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import type { EnhancedFishSpecies } from '../types/fishSpecies';

interface SpeciesListBulletinIndicatorProps {
  /** Harvest status from the species data. */
  harvestStatus: EnhancedFishSpecies['harvestStatus'];
  /** Show text labels alongside icons (default false for compact mode). */
  showLabels?: boolean;
}

export const SpeciesListBulletinIndicator: React.FC<
  SpeciesListBulletinIndicatorProps
> = ({ harvestStatus, showLabels = false }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (harvestStatus === 'open') return null;

  return (
    <View style={styles.container}>
      {harvestStatus === 'closed' && (
        <View
          style={[styles.badge, styles.closureBadge]}
          accessibilityRole="text"
          accessibilityLabel="Harvest closed"
        >
          <Feather name="alert-octagon" size={12} color={theme.colors.textOnPrimary} />
          {showLabels && <Text style={styles.badgeText}>CLOSED</Text>}
        </View>
      )}

      {harvestStatus === 'restricted' && (
        <View
          style={[styles.badge, styles.advisoryBadge]}
          accessibilityRole="text"
          accessibilityLabel="Harvest advisory"
        >
          <Feather name="alert-triangle" size={12} color={theme.colors.textOnPrimary} />
          {showLabels && <Text style={styles.badgeText}>ADVISORY</Text>}
        </View>
      )}

      {harvestStatus === 'catch_and_release' && (
        <View
          style={[styles.badge, styles.advisoryBadge]}
          accessibilityRole="text"
          accessibilityLabel="Catch and release only"
        >
          <Feather name="alert-triangle" size={12} color={theme.colors.textOnPrimary} />
          {showLabels && <Text style={styles.badgeText}>C&R ONLY</Text>}
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  closureBadge: {
    backgroundColor: theme.colors.error,
  },
  advisoryBadge: {
    backgroundColor: theme.colors.warning,
  },
  badgeText: {
    color: theme.colors.textOnPrimary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default SpeciesListBulletinIndicator;
