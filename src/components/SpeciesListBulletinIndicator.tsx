// components/SpeciesListBulletinIndicator.tsx
//
// Compact inline indicator shown on species list items.
// Displays closure/advisory icons with optional label text.
// Uses icon + color (never color alone) for accessibility.
// Reads harvest status directly from species data — no context dependency.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../styles/common';
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
  if (harvestStatus === 'open') return null;

  return (
    <View style={styles.container}>
      {harvestStatus === 'closed' && (
        <View
          style={[styles.badge, styles.closureBadge]}
          accessibilityRole="text"
          accessibilityLabel="Harvest closed"
        >
          <Feather name="alert-octagon" size={12} color={colors.white} />
          {showLabels && <Text style={styles.badgeText}>CLOSED</Text>}
        </View>
      )}

      {harvestStatus === 'restricted' && (
        <View
          style={[styles.badge, styles.advisoryBadge]}
          accessibilityRole="text"
          accessibilityLabel="Harvest advisory"
        >
          <Feather name="alert-triangle" size={12} color={colors.white} />
          {showLabels && <Text style={styles.badgeText}>ADVISORY</Text>}
        </View>
      )}

      {harvestStatus === 'catch_and_release' && (
        <View
          style={[styles.badge, styles.advisoryBadge]}
          accessibilityRole="text"
          accessibilityLabel="Catch and release only"
        >
          <Feather name="alert-triangle" size={12} color={colors.white} />
          {showLabels && <Text style={styles.badgeText}>C&R ONLY</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: colors.error,
  },
  advisoryBadge: {
    backgroundColor: colors.warning,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default SpeciesListBulletinIndicator;
