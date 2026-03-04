// components/EnhancedTopAnglersSection.tsx
//
// Enhanced "Top Anglers" section with period tabs (Weekly/Monthly/All-Time)
// and optional species filter. Replaces the original TopAnglersSection
// with richer data from the community stats leaderboard system.
//
// Uses the same navy gradient + glassmorphism aesthetic as TopAnglersSection
// and CommunityStatsHero for visual consistency.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, spacing } from '../styles/common';
import {
  LeaderboardEntry,
  LeaderboardPeriod,
} from '../types/communityStats';
import {
  getLeaderboard,
  formatLeaderboardDisplayName,
  formatStatCount,
} from '../services/communityStatsService';

// =============================================================================
// Constants
// =============================================================================

/** Premium color palette (matches TopAnglersSection & CommunityStatsHero) */
const COLORS = {
  navyDark: '#0A3D62',
  navyMid: '#0E4D78',
  navyLight: '#1A5276',
  gold: '#FFD700',
  goldDark: '#FFA500',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  white: '#FFFFFF',
  textLight: 'rgba(255, 255, 255, 0.92)',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  glassWhite: 'rgba(255, 255, 255, 0.14)',
  glassBorder: 'rgba(255, 255, 255, 0.22)',
};

/** Period tab configuration */
const PERIOD_TABS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'alltime', label: 'All-Time' },
];

/** Species filter options (null = all species) */
const SPECIES_FILTERS: { key: string | null; label: string }[] = [
  { key: null, label: 'All Species' },
  { key: 'Red Drum', label: 'Red Drum' },
  { key: 'Southern Flounder', label: 'Flounder' },
  { key: 'Spotted Seatrout', label: 'Seatrout' },
  { key: 'Weakfish', label: 'Weakfish' },
  { key: 'Striped Bass', label: 'Striped Bass' },
];

// =============================================================================
// Sub-components
// =============================================================================

interface PeriodTabProps {
  period: LeaderboardPeriod;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const PeriodTab: React.FC<PeriodTabProps> = ({
  label,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.periodTab, isSelected && styles.periodTabSelected]}
  >
    <Text style={[styles.periodTabText, isSelected && styles.periodTabTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface SpeciesFilterChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const SpeciesFilterChip: React.FC<SpeciesFilterChipProps> = ({
  label,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.speciesChip, isSelected && styles.speciesChipSelected]}
  >
    <Text style={[styles.speciesChipText, isSelected && styles.speciesChipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ entry }) => {
  const getRankColor = () => {
    switch (entry.rank) {
      case 1: return COLORS.gold;
      case 2: return COLORS.silver;
      case 3: return COLORS.bronze;
      default: return COLORS.textMuted;
    }
  };

  const getRankIcon = (): keyof typeof Feather.glyphMap => {
    switch (entry.rank) {
      case 1: return 'award';
      case 2: return 'award';
      case 3: return 'award';
      default: return 'hash';
    }
  };

  const displayName = formatLeaderboardDisplayName(entry);
  const rankColor = getRankColor();

  return (
    <View style={styles.leaderboardRow}>
      {/* Rank badge */}
      <View style={[styles.rankBadge, entry.rank <= 3 && { backgroundColor: `${rankColor}20` }]}>
        {entry.rank <= 3 ? (
          <Feather name={getRankIcon()} size={14} color={rankColor} />
        ) : (
          <Text style={[styles.rankNumber, { color: rankColor }]}>{entry.rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {entry.profileImageUrl ? (
          <Image
            source={{ uri: entry.profileImageUrl }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={14} color={COLORS.textMuted} />
          </View>
        )}
      </View>

      {/* Name and species */}
      <View style={styles.anglerInfo}>
        <Text style={styles.anglerName} numberOfLines={1}>
          {displayName}
        </Text>
        {entry.primarySpecies && (
          <Text style={styles.anglerSpecies} numberOfLines={1}>
            {entry.primarySpecies}
          </Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.anglerStats}>
        <Text style={[styles.statValue, { color: rankColor }]}>
          {formatStatCount(entry.totalFish)}
        </Text>
        <Text style={styles.statLabel}>fish</Text>
      </View>

      <View style={styles.anglerStats}>
        <Text style={styles.statValueSmall}>
          {entry.totalReports}
        </Text>
        <Text style={styles.statLabel}>reports</Text>
      </View>
    </View>
  );
};

// =============================================================================
// Main Component
// =============================================================================

interface EnhancedTopAnglersSectionProps {
  /** Pre-fetched leaderboard entries keyed by period (optional; will self-fetch) */
  initialLeaderboards?: Partial<Record<LeaderboardPeriod, LeaderboardEntry[]>>;
  /** Called when a leaderboard entry is tapped (navigate to angler profile) */
  onAnglerPress?: (entry: LeaderboardEntry) => void;
  /** Called when "View All" is tapped */
  onViewAllPress?: () => void;
  /** Maximum entries to display per period (default 5) */
  displayLimit?: number;
}

const EnhancedTopAnglersSection: React.FC<EnhancedTopAnglersSectionProps> = ({
  initialLeaderboards,
  onAnglerPress,
  onViewAllPress,
  displayLimit = 5,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('weekly');
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<
    Partial<Record<LeaderboardPeriod, LeaderboardEntry[]>>
  >(initialLeaderboards ?? {});
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(!initialLeaderboards);

  // Fetch leaderboard data when period or species changes
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      // Use cached data if we have it and no species filter is applied
      const cachedKey = selectedSpecies
        ? `${selectedPeriod}_${selectedSpecies}`
        : selectedPeriod;

      if (!selectedSpecies && leaderboards[selectedPeriod]?.length) {
        setInitialLoad(false);
        return;
      }

      setLoading(true);
      try {
        const entries = await getLeaderboard(selectedPeriod, {
          limit: displayLimit,
          species: selectedSpecies ?? undefined,
        });

        if (!cancelled) {
          if (!selectedSpecies) {
            setLeaderboards(prev => ({ ...prev, [selectedPeriod]: entries }));
          } else {
            // For filtered results, store separately to not overwrite unfiltered cache
            setLeaderboards(prev => ({
              ...prev,
              [`${selectedPeriod}_${selectedSpecies}` as any]: entries,
            }));
          }
          setInitialLoad(false);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setInitialLoad(false);
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [selectedPeriod, selectedSpecies, displayLimit]);

  const handlePeriodChange = useCallback((period: LeaderboardPeriod) => {
    setSelectedPeriod(period);
  }, []);

  const handleSpeciesChange = useCallback((species: string | null) => {
    setSelectedSpecies(prev => (prev === species ? null : species));
  }, []);

  // Get the current entries to display
  const currentKey = selectedSpecies
    ? `${selectedPeriod}_${selectedSpecies}`
    : selectedPeriod;
  const currentEntries = (leaderboards as any)[currentKey] as LeaderboardEntry[] | undefined;

  // Don't render during initial load with no data at all
  if (initialLoad && !currentEntries?.length) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.navyDark, COLORS.navyLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientContainer, styles.loadingContainer]}
        >
          <ActivityIndicator size="small" color={COLORS.textMuted} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.navyDark, COLORS.navyMid, COLORS.navyLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Feather name="award" size={16} color={COLORS.gold} />
          </View>
          <Text style={styles.headerTitle}>Top Anglers</Text>
          {onViewAllPress && (
            <TouchableOpacity onPress={onViewAllPress} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Feather name="chevron-right" size={14} color={COLORS.gold} />
            </TouchableOpacity>
          )}
        </View>

        {/* Period tabs */}
        <View style={styles.periodTabsRow}>
          {PERIOD_TABS.map(tab => (
            <PeriodTab
              key={tab.key}
              period={tab.key}
              label={tab.label}
              isSelected={selectedPeriod === tab.key}
              onPress={() => handlePeriodChange(tab.key)}
            />
          ))}
        </View>

        {/* Species filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.speciesScrollView}
          contentContainerStyle={styles.speciesScrollContent}
        >
          {SPECIES_FILTERS.map(filter => (
            <SpeciesFilterChip
              key={filter.key ?? 'all'}
              label={filter.label}
              isSelected={selectedSpecies === filter.key}
              onPress={() => handleSpeciesChange(filter.key)}
            />
          ))}
        </ScrollView>

        {/* Leaderboard rows */}
        {loading && !currentEntries?.length ? (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" color={COLORS.textMuted} />
          </View>
        ) : currentEntries && currentEntries.length > 0 ? (
          <View style={styles.leaderboardContainer}>
            {currentEntries.map(entry => (
              <TouchableOpacity
                key={`${entry.userId}-${entry.rank}`}
                activeOpacity={onAnglerPress ? 0.7 : 1}
                onPress={onAnglerPress ? () => onAnglerPress(entry) : undefined}
                disabled={!onAnglerPress}
              >
                <LeaderboardRow entry={entry} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="users" size={24} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {selectedSpecies
                ? `No ${selectedSpecies} catches recorded yet`
                : 'No leaderboard data yet'}
            </Text>
          </View>
        )}

        {/* Loading overlay for filtered results */}
        {loading && currentEntries?.length ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={COLORS.gold} />
          </View>
        ) : null}
      </LinearGradient>
    </View>
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
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },

  // Decorative circles
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gold,
    letterSpacing: 0.2,
  },

  // Period tabs
  periodTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  periodTabSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },
  periodTabTextSelected: {
    color: COLORS.gold,
    fontWeight: '700',
  },

  // Species filter chips
  speciesScrollView: {
    marginBottom: 12,
    marginHorizontal: -16, // Extend to container edges
  },
  speciesScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  speciesChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  speciesChipSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  speciesChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  speciesChipTextSelected: {
    color: COLORS.textLight,
  },

  // Leaderboard
  leaderboardContainer: {
    gap: 6,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassWhite,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    gap: 8,
  },

  // Rank badge
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Avatar
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Angler info
  anglerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  anglerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  anglerSpecies: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // Stats
  anglerStats: {
    alignItems: 'center',
    minWidth: 36,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statValueSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Loading overlay for filtered results
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 61, 98, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  // Inline loader
  inlineLoader: {
    paddingVertical: 30,
    alignItems: 'center',
  },
});

export default EnhancedTopAnglersSection;
