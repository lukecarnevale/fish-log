// screens/CatchFeedScreen.tsx
//
// Ultra-premium Catch Feed - a community catch-sharing feed for NC anglers.
// Features the same elegant "card sliding over header" scroll pattern as HomeScreen,
// with filters, Top Anglers section, and floating back button navigation.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Ellipse, Circle, G } from 'react-native-svg';
import { RootStackParamList } from '../types';
import { CatchFeedEntry, TopAngler } from '../types/catchFeed';
import { fetchRecentCatches, fetchTopAnglers, likeCatch, unlikeCatch, enrichCatchesWithLikes, PaginatedCatchFeed } from '../services/catchFeedService';
import { getRewardsMemberForAnonymousUser } from '../services/rewardsConversionService';
import { onAuthStateChange } from '../services/authService';
import { SPECIES_ALIASES } from '../constants/speciesAliases';
import { colors, spacing, borderRadius } from '../styles/common';
import { getAllSpeciesThemes } from '../constants/speciesColors';
import CatchCard from '../components/CatchCard';
import FeedAdCard from '../components/FeedAdCard';
import AnglerProfileModal from '../components/AnglerProfileModal';
import BottomDrawer from '../components/BottomDrawer';
import WaveBackground from '../components/WaveBackground';
import TopAnglersSection from '../components/TopAnglersSection';
import { SCREEN_LABELS } from '../constants/screenLabels';
import { HEADER_HEIGHT } from '../constants/ui';
import { CatchFeedSkeletonLoader } from '../components/SkeletonLoader';
import { useAllFishSpecies } from '../api/speciesApi';
import { useFloatingHeaderAnimation } from '../hooks/useFloatingHeaderAnimation';
import { usePulseAnimation } from '../hooks/usePulseAnimation';
import { Advertisement } from '../services/transformers/advertisementTransformer';
import { fetchAdvertisements } from '../services/advertisementsService';
import { intersperseFeedAds, FeedItem } from '../utils/feedAdPlacer';

type CatchFeedScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CatchFeed'
>;

interface CatchFeedScreenProps {
  navigation: CatchFeedScreenNavigationProp;
}

// ============================================
// SVG ILLUSTRATIONS
// ============================================

/** Swimming fish illustration for empty state */
const SwimmingFishIllustration: React.FC = () => (
  <Svg width={180} height={120} viewBox="0 0 180 120">
    <Circle cx={20} cy={30} r={4} fill={colors.primaryLight} opacity={0.6} />
    <Circle cx={35} cy={50} r={3} fill={colors.primaryLight} opacity={0.5} />
    <Circle cx={15} cy={70} r={2.5} fill={colors.primaryLight} opacity={0.4} />
    <Circle cx={160} cy={25} r={3.5} fill={colors.primaryLight} opacity={0.5} />
    <Circle cx={150} cy={45} r={2.5} fill={colors.primaryLight} opacity={0.4} />
    <Circle cx={165} cy={85} r={3} fill={colors.primaryLight} opacity={0.5} />
    <G transform="translate(50, 35)">
      <Ellipse cx={40} cy={25} rx={38} ry={18} fill={colors.secondary} opacity={0.9} />
      <Ellipse cx={40} cy={32} rx={30} ry={10} fill="#4DB6AC" opacity={0.8} />
      <Path d="M76 25 Q95 12 90 25 Q95 38 76 25" fill="#00897B" opacity={0.9} />
      <Path d="M25 7 Q40 -5 55 7" fill="#00897B" opacity={0.7} />
      <Circle cx={18} cy={22} r={6} fill="white" />
      <Circle cx={20} cy={22} r={4} fill="#1A1A1A" />
      <Circle cx={22} cy={20} r={1.5} fill="white" opacity={0.8} />
    </G>
    <G transform="translate(10, 75) scale(-0.6, 0.6)">
      <Ellipse cx={40} cy={25} rx={35} ry={15} fill="#FFB74D" opacity={0.85} />
      <Ellipse cx={40} cy={30} rx={28} ry={8} fill="#FFE082" opacity={0.8} />
      <Path d="M73 25 Q88 15 84 25 Q88 35 73 25" fill="#FF8F00" opacity={0.9} />
      <Circle cx={18} cy={22} r={5} fill="white" />
      <Circle cx={19} cy={22} r={3} fill="#1A1A1A" />
    </G>
    <G transform="translate(120, 10) scale(0.45, 0.45)">
      <Ellipse cx={40} cy={25} rx={35} ry={15} fill={colors.primary} opacity={0.15} />
      <Path d="M73 25 Q88 15 84 25 Q88 35 73 25" fill={colors.primary} opacity={0.12} />
    </G>
  </Svg>
);

/** Cloud/connection error illustration */
const ConnectionErrorIllustration: React.FC = () => (
  <Svg width={100} height={80} viewBox="0 0 100 80">
    <Path
      d="M75 55 Q85 55 85 45 Q85 35 75 35 Q75 25 60 25 Q50 25 45 32 Q35 25 25 35 Q15 35 15 45 Q15 55 25 55 Z"
      fill={colors.primaryLight}
      opacity={0.8}
    />
    <G transform="translate(42, 35)">
      <Path d="M0 0 L16 16" stroke={colors.textSecondary} strokeWidth={3} strokeLinecap="round" />
      <Path d="M16 0 L0 16" stroke={colors.textSecondary} strokeWidth={3} strokeLinecap="round" />
    </G>
    <Path
      d="M10 70 Q25 65 40 70 Q55 75 70 70 Q85 65 95 70"
      stroke={colors.primary}
      strokeWidth={2}
      fill="none"
      opacity={0.3}
    />
  </Svg>
);

// ============================================
// SUBCOMPONENTS
// ============================================

/** Filter pill button */
const FilterPill: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.filterPill, isActive && styles.filterPillActive]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text
      style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {label}
    </Text>
    <Feather
      name="chevron-down"
      size={14}
      color={isActive ? colors.white : colors.textSecondary}
    />
  </TouchableOpacity>
);

/** Filter picker modal using BottomDrawer for consistent UX */
const FilterPickerModal: React.FC<{
  visible: boolean;
  title: string;
  options: string[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}> = ({ visible, title, options, selectedValue, onSelect, onClose }) => {
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      maxHeight="70%"
    >
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={options}
        keyExtractor={(item) => item}
        style={styles.modalList}
        contentContainerStyle={{ paddingBottom: spacing.sm }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isAllOption = item.startsWith('All ');
          const isSelected = isAllOption
            ? selectedValue === null
            : selectedValue === item;
          return (
            <TouchableOpacity
              style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
              onPress={() => {
                onSelect(isAllOption ? null : item);
                onClose();
              }}
            >
              <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                {item}
              </Text>
              {isSelected && (
                <Feather name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
      />
    </BottomDrawer>
  );
};

/** Loading indicator for infinite scroll */
const LoadingMoreIndicator: React.FC = () => (
  <View style={styles.loadingMoreContainer}>
    <ActivityIndicator size="small" color={colors.primary} />
    <Text style={styles.loadingMoreText}>Loading more catches...</Text>
  </View>
);

/** Enhanced footer when user reaches end of feed */
const FeedFooter: React.FC = () => (
  <View style={styles.feedFooter}>
    <View style={styles.feedFooterContent}>
      <View style={styles.feedFooterIconContainer}>
        <Feather name="anchor" size={20} color={colors.primary} />
      </View>
      <Text style={styles.feedFooterTitle}>You're all caught up!</Text>
      <Text style={styles.feedFooterSubtext}>
        Check back later for more catches from NC anglers
      </Text>
    </View>
    <View style={styles.feedFooterWave}>
      <WaveBackground />
    </View>
  </View>
);

// ============================================
// MAIN COMPONENT
// ============================================

// Page size for infinite scroll (similar to Instagram ~12 posts per load)
const PAGE_SIZE = 12;

const CatchFeedScreen: React.FC<CatchFeedScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [entries, setEntries] = useState<CatchFeedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [topAnglers, setTopAnglers] = useState<TopAngler[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);

  // Feed advertisements
  const [feedAds, setFeedAds] = useState<Advertisement[]>([]);
  const trackedImpressions = useRef(new Map<string, number>());

  // Get current user ID for like functionality (Supabase user ID)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch the user's ID from the users table (not auth.users)
  // The catch_likes table has a foreign key to users table, so we need the users table ID
  useEffect(() => {
    const fetchUserId = async () => {
      // Get rewards member from users table (this is the ID we need for likes)
      const rewardsMember = await getRewardsMemberForAnonymousUser();
      if (rewardsMember?.id) {
        console.log('✅ Using user ID for likes:', rewardsMember.id);
        setCurrentUserId(rewardsMember.id);
        return;
      }

      console.log('ℹ️ No rewards member found for likes');
      setCurrentUserId(null);
    };

    fetchUserId();

    // Listen for auth state changes (user signs in/out)
    // When user signs in, refetch the user ID from users table
    const unsubscribe = onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        console.log('🔄 Auth state changed, refetching user ID for likes');
        // Delay to allow createRewardsMemberFromAuthUser to complete
        setTimeout(() => {
          fetchUserId();
        }, 1500);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch feed advertisements on mount
  useEffect(() => {
    const loadFeedAds = async () => {
      try {
        const { advertisements } = await fetchAdvertisements('catch_feed');
        setFeedAds(advertisements);
      } catch (err) {
        console.warn('Failed to load feed ads:', err);
      }
    };
    loadFeedAds();
  }, []);

  // Filter state
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [showPhotosOnly, setShowPhotosOnly] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);

  // Angler profile modal state
  const [selectedAnglerId, setSelectedAnglerId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Fetch species data for fallback images
  const { data: allSpecies, isLoading: speciesLoading } = useAllFishSpecies();


  // Species name aliases for matching - all variations map to each other
  const speciesAliases = SPECIES_ALIASES;

  // Create a lookup map from species name to image URL
  const speciesImageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (allSpecies) {
      console.log('🐟 Building species image map from', allSpecies.length, 'species');
      allSpecies.forEach((species) => {
        // Log species that might be Weakfish or Spotted Seatrout
        const nameLC = species.name?.toLowerCase() || '';
        if (nameLC.includes('weak') || nameLC.includes('trout') || nameLC.includes('seatrout') || nameLC.includes('spot')) {
          console.log('🔍 Found potential match:', {
            name: species.name,
            commonNames: species.commonNames,
            hasImage: !!species.images?.primary,
            imageUrl: species.images?.primary?.substring(0, 50) + '...'
          });
        }

        if (species.images?.primary) {
          const imageUrl = species.images.primary;
          // Map by primary name
          if (species.name) {
            const lowerName = species.name.toLowerCase();
            map.set(lowerName, imageUrl);
            // Also add aliases for this species
            const aliases = speciesAliases[lowerName];
            if (aliases) {
              aliases.forEach((alias) => map.set(alias, imageUrl));
            }
          }
          // Also map by any additional common names
          species.commonNames?.forEach((name) => {
            if (name) {
              const lowerName = name.toLowerCase();
              map.set(lowerName, imageUrl);
              // Also add aliases for common names
              const aliases = speciesAliases[lowerName];
              if (aliases) {
                aliases.forEach((alias) => map.set(alias, imageUrl));
              }
            }
          });
        }
      });
      // Log all keys in the map for debugging
      console.log('🗺️ Species image map keys:', Array.from(map.keys()).filter(k =>
        k.includes('weak') || k.includes('trout') || k.includes('seatrout') || k.includes('spot')
      ));
    }
    return map;
  }, [allSpecies]);

  // Helper to get species image URL for a species name
  const getSpeciesImageUrl = useCallback((speciesName: string | undefined): string | undefined => {
    if (!speciesName) return undefined;
    let lowerName = speciesName.toLowerCase().trim();

    // Extract base species name if it contains parentheses (e.g., "Spotted Seatrout (speckled trout)" -> "spotted seatrout")
    // The report form uses this format: "Species Name (alternate name)"
    const parenIndex = lowerName.indexOf('(');
    if (parenIndex > 0) {
      lowerName = lowerName.substring(0, parenIndex).trim();
    }

    let result = speciesImageMap.get(lowerName);

    // If not found, try looking up by partial match for common variations
    if (!result) {
      // Try to find a key that contains this name or vice versa
      for (const [key, url] of speciesImageMap.entries()) {
        if (key.includes(lowerName) || lowerName.includes(key)) {
          result = url;
          break;
        }
      }
    }

    // Log lookups for problematic species
    if (speciesName.toLowerCase().includes('weak') || speciesName.toLowerCase().includes('trout') || speciesName.toLowerCase().includes('seatrout') || speciesName.toLowerCase().includes('spot')) {
      console.log('🔎 Looking up species image:', { original: speciesName, normalized: lowerName, found: !!result, mapSize: speciesImageMap.size });
    }
    return result;
  }, [speciesImageMap]);

  // Scroll animation and floating header animation
  const { scrollY, floatingOpacity: floatingBackOpacity, floatingTranslateXLeft: floatingBackTranslateX } = useFloatingHeaderAnimation();

  // Slow pulsing animation for Live dot
  const { pulseValue: livePulse } = usePulseAnimation({ duration: 1500 });

  // Opacity pulse for the live dot
  const liveDotOpacity = livePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.4],
  });

  // Scale pulse for the live dot
  const liveDotScale = livePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  // Derive available areas from feed data
  const availableAreas = useMemo(() => {
    const areas = new Set(entries.map(e => e.location).filter(Boolean) as string[]);
    return ['All Areas', ...Array.from(areas).sort()];
  }, [entries]);

  // Species options from theme
  const speciesOptions = useMemo(() => {
    const themes = getAllSpeciesThemes();
    return ['All Species', ...themes.map(t => t.name)];
  }, []);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (selectedArea && entry.location !== selectedArea) return false;
      // Check if any species in the list matches the filter
      if (selectedSpecies) {
        const speciesList = entry.speciesList || [{ species: entry.species, count: 1 }];
        const hasSpecies = speciesList.some(s => s.species === selectedSpecies);
        if (!hasSpecies) return false;
      }
      // Filter to only show entries with photos
      if (showPhotosOnly && !entry.photoUrl) return false;
      return true;
    });
  }, [entries, selectedArea, selectedSpecies, showPhotosOnly]);

  // Create mixed feed with ads interspersed
  const feedItems = useMemo(() => {
    return intersperseFeedAds(filteredEntries, feedAds);
  }, [filteredEntries, feedAds]);

  // Load catch feed data (initial load or refresh)
  const loadFeed = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);

      // Fetch catches and top anglers in parallel
      const [catchResult, topAnglersResult] = await Promise.all([
        fetchRecentCatches({ forceRefresh, limit: PAGE_SIZE, offset: 0 }),
        fetchTopAnglers(),
      ]);

      let feedData = catchResult.entries;
      // Enrich with like data
      feedData = await enrichCatchesWithLikes(feedData, currentUserId ?? undefined);
      setHasMore(catchResult.hasMore);
      setNextOffset(catchResult.nextOffset);
      const anglersData = topAnglersResult;

      setEntries(feedData);
      setTopAnglers(anglersData);

      // Reset filters on refresh
      if (forceRefresh) {
        setSelectedArea(null);
        setSelectedSpecies(null);
        setShowPhotosOnly(false);
      }
    } catch (err) {
      console.error('Error loading catch feed:', err);
      setError('Unable to load catches. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Load more catches (pagination)
  const loadMore = useCallback(async () => {
    // Don't load more if already loading or no more data
    if (loadingMore || !hasMore || loading) {
      return;
    }

    setLoadingMore(true);
    try {
      const result = await fetchRecentCatches({ limit: PAGE_SIZE, offset: nextOffset });
      let newEntries = result.entries;

      // Enrich new entries with like data
      newEntries = await enrichCatchesWithLikes(newEntries, currentUserId ?? undefined);

      // Append to existing entries, avoiding duplicates
      setEntries(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const uniqueNew = newEntries.filter(e => !existingIds.has(e.id));
        return [...prev, ...uniqueNew];
      });
      setHasMore(result.hasMore);
      setNextOffset(result.nextOffset);

      console.log(`📜 Loaded ${newEntries.length} more catches (total: ${entries.length + newEntries.length})`);
    } catch (err) {
      console.error('Error loading more catches:', err);
      // Don't set error state for load-more failures, just stop loading more
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextOffset, currentUserId, loading, entries.length]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed(true);
  }, [loadFeed]);


  const handleAnglerPress = useCallback((userId: string) => {
    setSelectedAnglerId(userId);
    setShowProfileModal(true);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setShowProfileModal(false);
    setSelectedAnglerId(null);
  }, []);

  // Handle like/unlike a catch
  const handleLikePress = useCallback(async (entry: CatchFeedEntry) => {
    // Optimistically update UI first (for immediate visual feedback)
    setEntries(prevEntries =>
      prevEntries.map(e => {
        if (e.id === entry.id) {
          const isLiked = e.isLikedByCurrentUser;
          return {
            ...e,
            isLikedByCurrentUser: !isLiked,
            likeCount: isLiked ? Math.max(0, e.likeCount - 1) : e.likeCount + 1,
          };
        }
        return e;
      })
    );

    // Only make API call if user is logged in
    if (!currentUserId) {
      console.log('User must be logged in to persist likes');
      return;
    }

    // Make API call
    try {
      if (entry.isLikedByCurrentUser) {
        await unlikeCatch(entry.id, currentUserId);
      } else {
        await likeCatch(entry.id, currentUserId);
      }
    } catch (err) {
      console.error('Failed to update like:', err);
      // Revert on error
      setEntries(prevEntries =>
        prevEntries.map(e => {
          if (e.id === entry.id) {
            return {
              ...e,
              isLikedByCurrentUser: entry.isLikedByCurrentUser,
              likeCount: entry.likeCount,
            };
          }
          return e;
        })
      );
    }
  }, [currentUserId]);

  const navigateToReport = useCallback(() => {
    navigation.navigate('ReportForm');
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Render empty state
  const hasActiveFilters = selectedArea || selectedSpecies || showPhotosOnly;
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIllustration}>
        <SwimmingFishIllustration />
      </View>
      <Text style={styles.emptyTitle}>
        {hasActiveFilters ? 'No Matches Found' : 'No Catches Yet'}
      </Text>
      <Text style={styles.emptyText}>
        {hasActiveFilters
          ? 'Try adjusting your filters to see more catches.'
          : 'Be the first to share your catch today!\nReport a harvest to appear in the community feed.'}
      </Text>
      {!hasActiveFilters && (
        <TouchableOpacity
          style={styles.emptyCTA}
          onPress={navigateToReport}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.primary, '#1976D2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Feather name="plus" size={18} color={colors.white} />
          <Text style={styles.emptyCTAText}>Report Your Catch</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIllustration}>
        <ConnectionErrorIllustration />
      </View>
      <Text style={styles.errorTitle}>Connection Issue</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => loadFeed(true)}
        activeOpacity={0.85}
      >
        <Feather name="refresh-cw" size={16} color={colors.white} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Memoized renderItem for FlatList performance - handles both catches and ads
  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.type === 'ad') {
      return (
        <FeedAdCard
          ad={item.data}
          trackedImpressions={trackedImpressions.current}
        />
      );
    }
    return (
      <CatchCard
        entry={item.data}
        onAnglerPress={handleAnglerPress}
        onLikePress={handleLikePress}
        speciesImageUrl={getSpeciesImageUrl(item.data.species)}
      />
    );
  }, [handleAnglerPress, handleLikePress, getSpeciesImageUrl]);

  const keyExtractor = useCallback((item: FeedItem, index: number) => {
    if (item.type === 'ad') return `ad-${item.data.id}-${index}`;
    return `catch-${item.data.id}`;
  }, []);

  // Item separator component
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  // Memoized list header (top anglers + filters)
  const renderListHeader = useCallback(() => (
    <View>
      {/* Top Anglers Section */}
      <TopAnglersSection anglers={topAnglers} />

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <FilterPill
          label={selectedArea || 'All Areas'}
          isActive={selectedArea !== null}
          onPress={() => setShowAreaPicker(true)}
        />
        <FilterPill
          label={selectedSpecies || 'All Species'}
          isActive={selectedSpecies !== null}
          onPress={() => setShowSpeciesPicker(true)}
        />
        {/* Photo filter toggle - doesn't shrink */}
        <TouchableOpacity
          style={[styles.filterPill, styles.filterPillFixed, showPhotosOnly && styles.filterPillActive]}
          onPress={() => setShowPhotosOnly(!showPhotosOnly)}
          activeOpacity={0.85}
        >
          <Feather
            name="image"
            size={14}
            color={showPhotosOnly ? colors.white : colors.textSecondary}
          />
          <Text style={[styles.filterPillText, showPhotosOnly && styles.filterPillTextActive]}>
            Photos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Premium divider between filters and content */}
      <View style={styles.filterDividerContainer}>
        <LinearGradient
          colors={['transparent', colors.primary, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.filterDividerGradient}
        />
      </View>
    </View>
  ), [topAnglers, selectedArea, selectedSpecies, showPhotosOnly]);

  const renderListFooter = useCallback(() => {
    if (feedItems.length === 0) return null;

    // Show loading indicator when fetching more
    if (loadingMore) {
      return <LoadingMoreIndicator />;
    }

    // Show "all caught up" only when there's no more data
    if (!hasMore) {
      return <FeedFooter />;
    }

    // Return empty spacer to allow scroll momentum
    return <View style={{ height: 20 }} />;
  }, [feedItems.length, loadingMore, hasMore]);

  // Empty component for FlatList when no data
  const renderEmptyComponent = useCallback(() => {
    if (loading) {
      return <CatchFeedSkeletonLoader />;
    }
    if (error) {
      return renderErrorState();
    }
    return renderEmptyState();
  }, [loading, error, hasActiveFilters]);

  // Callback for when user scrolls near the end
  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      loadMore();
    }
  }, [loadingMore, hasMore, loading, loadMore]);

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />

        {/* Floating back button - appears when header scrolls away */}
        <Animated.View
          style={[
            styles.floatingBackButton,
            {
              top: Platform.OS === 'android'
                ? (StatusBar.currentHeight || 0) + 12
                : insets.top + 8,
              opacity: floatingBackOpacity,
              transform: [{
                translateX: floatingBackTranslateX,
              }]
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.floatingBackTouchable}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Feather name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
        </Animated.View>

        {/* Main FlatList - header scrolls with content (Instagram-style) */}
        <Animated.FlatList
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.flatList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.flatListContent,
            feedItems.length === 0 && styles.emptyListContent,
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.white}
              progressBackgroundColor={colors.white}
            />
          }
          // Header scrolls with content
          ListHeaderComponent={
            <View style={{ backgroundColor: colors.primary }}>
              {/* Scrolling header - dark blue background */}
              <LinearGradient
                colors={[colors.primary, colors.primary]}
                style={styles.scrollingHeader}
              >
                <View style={styles.headerContent}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="arrow-left" size={24} color={colors.white} />
                  </TouchableOpacity>

                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>{SCREEN_LABELS.catchFeed.title}</Text>
                    <Text style={styles.headerSubtitle}>Community catches from NC anglers</Text>
                  </View>

                  {/* Live Badge */}
                  <View style={styles.liveBadge}>
                    <Animated.View
                      style={[
                        styles.liveDot,
                        {
                          opacity: liveDotOpacity,
                          transform: [{ scale: liveDotScale }],
                        },
                      ]}
                    />
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Content area with rounded corners */}
              <View style={styles.contentContainer}>
                {renderListHeader()}
              </View>
            </View>
          }
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={renderEmptyComponent}
          ItemSeparatorComponent={ItemSeparator}
          // Infinite scroll
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          // Performance optimizations
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          initialNumToRender={4}
        />

        {/* Filter Modals */}
        <FilterPickerModal
          visible={showAreaPicker}
          title="Select Area"
          options={availableAreas}
          selectedValue={selectedArea}
          onSelect={setSelectedArea}
          onClose={() => setShowAreaPicker(false)}
        />
        <FilterPickerModal
          visible={showSpeciesPicker}
          title="Select Species"
          options={speciesOptions}
          selectedValue={selectedSpecies}
          onSelect={setSelectedSpecies}
          onClose={() => setShowSpeciesPicker(false)}
        />

        {/* Angler Profile Modal */}
        <AnglerProfileModal
          visible={showProfileModal}
          userId={selectedAnglerId}
          onClose={handleCloseProfile}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.primary, // Dark blue for status bar area visibility
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // Scrolling header - part of FlatList, scrolls with content
  scrollingHeader: {
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 36,
    paddingHorizontal: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.85,
    marginTop: 2,
  },

  // Live badge in header
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 7,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  liveText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  // Floating back button - appears when header scrolls away
  floatingBackButton: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
    backgroundColor: colors.primary,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingBackTouchable: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FlatList styles
  flatList: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  flatListContent: {
    backgroundColor: colors.background,
    flexGrow: 1,
  },

  // Content container - rounded corners that slide over header
  contentContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    marginTop: -12,
  },
  // Style for empty list to ensure proper background
  emptyListContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 8,
    // Premium layered shadow
    shadowColor: '#1a365d',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 1,
    minWidth: 0,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    // Stronger shadow when active
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  filterPillFixed: {
    flexShrink: 0,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 1,
    letterSpacing: 0.1,
  },
  filterPillTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  // Filter divider
  filterDividerContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  filterDividerGradient: {
    height: 1.5,
    width: '100%',
    opacity: 0.25,
  },

  // Modal styles
  // Modal styles (used within BottomDrawer)
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalList: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  modalOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginHorizontal: spacing.md,
  },

  // Loading state
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  // List
  listContent: {
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: 4,
  },

  // Loading more indicator (infinite scroll)
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Feed footer
  feedFooter: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  feedFooterContent: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  feedFooterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  feedFooterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  feedFooterSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  feedFooterWave: {
    height: 40,
    backgroundColor: colors.secondary,
    position: 'relative',
    overflow: 'hidden',
  },

  // Empty state
  emptyContainer: {
    paddingTop: 40,
    paddingBottom: 100,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIllustration: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyCTAText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },

  // Error state
  errorContainer: {
    paddingTop: 60,
    paddingBottom: 100,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorIllustration: {
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    gap: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});

export default CatchFeedScreen;
