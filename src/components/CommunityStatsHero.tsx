// components/CommunityStatsHero.tsx
//
// Premium community stats hero card for the HomeScreen.
// Displays "NC anglers have caught X fish this season" with per-species breakdowns.
// Uses the same navy gradient + glassmorphism aesthetic as TopAnglersSection.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/common';
import {
  CommunityStat,
  CommunityStatsSnapshot,
} from '../types/communityStats';
import {
  getCommunityStats,
  formatStatCount,
} from '../services/communityStatsService';

// =============================================================================
// Constants
// =============================================================================

/** Premium color palette (matches TopAnglersSection) */
const COLORS = {
  navyDark: '#0A3D62',
  navyMid: '#0E4D78',
  navyLight: '#1A5276',
  gold: '#FFD700',
  goldDark: '#FFA500',
  white: '#FFFFFF',
  textLight: 'rgba(255, 255, 255, 0.92)',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  glassWhite: 'rgba(255, 255, 255, 0.14)',
  glassBorder: 'rgba(255, 255, 255, 0.22)',
};

/** Species icon mapping using Feather icons */
const SPECIES_ICONS: Record<string, string> = {
  'Red Drum': 'target',
  'Southern Flounder': 'disc',
  'Spotted Seatrout': 'droplet',
  'Weakfish': 'wind',
  'Striped Bass': 'anchor',
};

// =============================================================================
// Sub-components
// =============================================================================

interface SpeciesChipProps {
  species: string;
  stat: CommunityStat;
  isSelected: boolean;
  onPress: () => void;
}

const SpeciesChip: React.FC<SpeciesChipProps> = ({
  species,
  stat,
  isSelected,
  onPress,
}) => {
  const iconName = (SPECIES_ICONS[species] || 'circle') as keyof typeof Feather.glyphMap;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.speciesChip, isSelected && styles.speciesChipSelected]}
    >
      <Feather name={iconName} size={12} color={isSelected ? COLORS.gold : COLORS.textMuted} />
      <Text style={[styles.speciesChipText, isSelected && styles.speciesChipTextSelected]}>
        {species}
      </Text>
      <Text style={[styles.speciesChipCount, isSelected && styles.speciesChipCountSelected]}>
        {formatStatCount(stat.totalFishCount)}
      </Text>
    </TouchableOpacity>
  );
};

interface StatBadgeProps {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
}

const StatBadge: React.FC<StatBadgeProps> = ({ label, value, icon }) => (
  <View style={styles.statBadge}>
    <Feather name={icon} size={14} color={COLORS.gold} />
    <Text style={styles.statBadgeValue}>{typeof value === 'number' ? formatStatCount(value) : value}</Text>
    <Text style={styles.statBadgeLabel}>{label}</Text>
  </View>
);

// =============================================================================
// Main Component
// =============================================================================

interface CommunityStatsHeroProps {
  /** Pre-fetched snapshot (optional; will self-fetch if not provided) */
  snapshot?: CommunityStatsSnapshot | null;
  /** Called when the hero card is tapped (navigate to full stats screen) */
  onPress?: () => void;
}

const CommunityStatsHero: React.FC<CommunityStatsHeroProps> = ({
  snapshot: externalSnapshot,
  onPress,
}) => {
  const [snapshot, setSnapshot] = useState<CommunityStatsSnapshot | null>(
    externalSnapshot ?? null
  );
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [loading, setLoading] = useState(!externalSnapshot);

  // Counter animation
  const animatedCount = useRef(new Animated.Value(0)).current;
  const [displayCount, setDisplayCount] = useState(0);

  // Fetch data if not provided externally
  useEffect(() => {
    if (externalSnapshot) {
      setSnapshot(externalSnapshot);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getCommunityStats();
        if (!cancelled) {
          setSnapshot(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [externalSnapshot]);

  // Animate the main counter when data loads or species changes
  useEffect(() => {
    if (!snapshot) return;

    const targetCount = selectedSpecies
      ? (snapshot.speciesStats[selectedSpecies]?.totalFishCount ?? 0)
      : snapshot.overallStats.totalFishCount;

    animatedCount.setValue(0);
    Animated.timing(animatedCount, {
      toValue: targetCount,
      duration: 800,
      useNativeDriver: false,
    }).start();

    // Update display count via listener
    const listenerId = animatedCount.addListener(({ value }) => {
      setDisplayCount(Math.round(value));
    });

    return () => {
      animatedCount.removeListener(listenerId);
    };
  }, [snapshot, selectedSpecies]);

  const handleSpeciesPress = useCallback((species: string) => {
    setSelectedSpecies(prev => (prev === species ? null : species));
  }, []);

  // Current stat to display (overall or selected species)
  const currentStat: CommunityStat | null = selectedSpecies
    ? (snapshot?.speciesStats[selectedSpecies] ?? null)
    : (snapshot?.overallStats ?? null);

  // Don't render while loading or if no data
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.navyDark, COLORS.navyMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientContainer, styles.loadingContainer]}
        >
          <ActivityIndicator size="small" color={COLORS.textMuted} />
        </LinearGradient>
      </View>
    );
  }

  if (!snapshot || !currentStat) return null;

  const speciesNames = Object.keys(snapshot.speciesStats);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <LinearGradient
        colors={[COLORS.navyDark, COLORS.navyMid, COLORS.navyLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Feather name="bar-chart-2" size={16} color={COLORS.gold} />
          </View>
          <Text style={styles.headerTitle}>NC Fishing Community</Text>
          <Text style={styles.headerYear}>{snapshot.year}</Text>
        </View>

        {/* Main counter */}
        <View style={styles.counterSection}>
          <Text style={styles.counterValue}>
            {formatStatCount(displayCount)}
          </Text>
          <Text style={styles.counterLabel}>
            {selectedSpecies
              ? `${selectedSpecies} caught this season`
              : 'fish caught this season'}
          </Text>
        </View>

        {/* Stat badges */}
        <View style={styles.statBadgesRow}>
          <StatBadge
            label="Reports"
            value={currentStat.totalReports}
            icon="file-text"
          />
          <StatBadge
            label="Anglers"
            value={currentStat.uniqueAnglers}
            icon="users"
          />
          <StatBadge
            label="Avg/Report"
            value={currentStat.avgFishPerReport.toFixed(1)}
            icon="trending-up"
          />
        </View>

        {/* Species filter chips */}
        {speciesNames.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.speciesScrollView}
            contentContainerStyle={styles.speciesScrollContent}
          >
            {speciesNames.map(species => (
              <SpeciesChip
                key={species}
                species={species}
                stat={snapshot.speciesStats[species]}
                isSelected={selectedSpecies === species}
                onPress={() => handleSpeciesPress(species)}
              />
            ))}
          </ScrollView>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 20,
    overflow: 'hidden',
    // Premium shadow
    shadowColor: COLORS.navyDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  gradientContainer: {
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },

  // Decorative circles
  decorativeCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -25,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 20,
    left: '60%' as any,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
    flex: 1,
  },
  headerYear: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },

  // Main counter
  counterSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  counterValue: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: 'center',
  },

  // Stat badges row
  statBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.glassWhite,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    minWidth: 80,
  },
  statBadgeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textLight,
    marginTop: 3,
  },
  statBadgeLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 2,
  },

  // Species filter chips
  speciesScrollView: {
    marginTop: 2,
    marginHorizontal: -18, // Extend to container edges
  },
  speciesScrollContent: {
    paddingHorizontal: 18,
    gap: 8,
  },
  speciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 5,
  },
  speciesChipSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: 'rgba(255, 215, 0, 0.35)',
  },
  speciesChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  speciesChipTextSelected: {
    color: COLORS.textLight,
  },
  speciesChipCount: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  speciesChipCountSelected: {
    color: COLORS.gold,
  },
});

export default CommunityStatsHero;
