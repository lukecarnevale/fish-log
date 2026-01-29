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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Ellipse, Circle, G } from 'react-native-svg';
import { RootStackParamList } from '../types';
import { CatchFeedEntry, TopAngler } from '../types/catchFeed';
import { fetchRecentCatches } from '../services/catchFeedService';
import { sampleCatchFeedEntries, sampleTopAnglers } from '../data/catchFeedData';
import { colors, spacing, borderRadius } from '../styles/common';
import { getAllSpeciesThemes } from '../constants/speciesColors';
import CatchCard from '../components/CatchCard';
import AnglerProfileModal from '../components/AnglerProfileModal';
import WaveBackground from '../components/WaveBackground';
import { SCREEN_LABELS } from '../constants/screenLabels';

// Use sample data for development (set to false when Supabase is ready)
const USE_SAMPLE_DATA = false;

// Header height for scroll calculations
const HEADER_HEIGHT = 100;

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
    activeOpacity={0.7}
  >
    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
      {label}
    </Text>
    <Feather
      name="chevron-down"
      size={14}
      color={isActive ? colors.primary : colors.textSecondary}
    />
  </TouchableOpacity>
);

/** Filter picker modal */
const FilterPickerModal: React.FC<{
  visible: boolean;
  title: string;
  options: string[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}> = ({ visible, title, options, selectedValue, onSelect, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
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
      </View>
    </View>
  </Modal>
);

/** Top angler card */
const TopAnglerCard: React.FC<{ angler: TopAngler }> = ({ angler }) => {
  const getIcon = (): keyof typeof Feather.glyphMap => {
    switch (angler.type) {
      case 'catches':
        return 'award';
      case 'species':
        return 'list';
      case 'length':
        return 'maximize-2';
      default:
        return 'star';
    }
  };

  const getIconColor = () => {
    switch (angler.type) {
      case 'catches':
        return '#FFB300'; // Gold
      case 'species':
        return colors.secondary;
      case 'length':
        return '#7B1FA2'; // Purple
      default:
        return colors.primary;
    }
  };

  return (
    <View style={styles.topAnglerCard}>
      <View style={[styles.topAnglerIcon, { backgroundColor: `${getIconColor()}15` }]}>
        <Feather name={getIcon()} size={18} color={getIconColor()} />
      </View>
      <Text style={styles.topAnglerName} numberOfLines={1}>
        {angler.displayName}
      </Text>
      <Text style={styles.topAnglerValue}>
        {typeof angler.value === 'number' ? angler.value : angler.value}
      </Text>
      <Text style={styles.topAnglerLabel}>{angler.label}</Text>
    </View>
  );
};

/** Top anglers section */
const TopAnglersSection: React.FC<{ anglers: TopAngler[] }> = ({ anglers }) => {
  if (anglers.length === 0) return null;

  return (
    <View style={styles.topAnglersSection}>
      <Text style={styles.topAnglersTitle}>This Week's Top Anglers</Text>
      <View style={styles.topAnglersRow}>
        {anglers.map((angler, index) => (
          <TopAnglerCard key={`${angler.type}-${index}`} angler={angler} />
        ))}
      </View>
    </View>
  );
};

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

const CatchFeedScreen: React.FC<CatchFeedScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<CatchFeedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [topAnglers, setTopAnglers] = useState<TopAngler[]>([]);

  // Filter state
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);

  // Angler profile modal state
  const [selectedAnglerId, setSelectedAnglerId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;

  // Floating back button animation
  const floatingBackOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.5, HEADER_HEIGHT],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
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
      if (selectedSpecies && entry.species !== selectedSpecies) return false;
      return true;
    });
  }, [entries, selectedArea, selectedSpecies]);

  // Load catch feed data
  const loadFeed = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);

      let feedData: CatchFeedEntry[];
      let anglersData: TopAngler[];

      if (USE_SAMPLE_DATA) {
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
        feedData = sampleCatchFeedEntries;
        anglersData = sampleTopAnglers;
      } else {
        feedData = await fetchRecentCatches({ forceRefresh });
        // For now, use sample top anglers until Supabase function is ready
        anglersData = sampleTopAnglers;
      }

      setEntries(feedData);
      setTopAnglers(anglersData);

      // Reset filters on refresh
      if (forceRefresh) {
        setSelectedArea(null);
        setSelectedSpecies(null);
      }
    } catch (err) {
      console.error('Error loading catch feed:', err);
      setError('Unable to load catches. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const navigateToReport = useCallback(() => {
    navigation.navigate('ReportForm');
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIllustration}>
        <SwimmingFishIllustration />
      </View>
      <Text style={styles.emptyTitle}>
        {selectedArea || selectedSpecies ? 'No Matches Found' : 'No Catches Yet'}
      </Text>
      <Text style={styles.emptyText}>
        {selectedArea || selectedSpecies
          ? 'Try adjusting your filters to see more catches.'
          : 'Be the first to share your catch today!\nReport a harvest to appear in the community feed.'}
      </Text>
      {!selectedArea && !selectedSpecies && (
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

  const renderItem = ({ item }: { item: CatchFeedEntry }) => (
    <CatchCard entry={item} onAnglerPress={handleAnglerPress} />
  );

  const keyExtractor = (item: CatchFeedEntry) => item.id;

  // Render list header (filters + top anglers)
  const renderListHeader = () => (
    <View>
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
      </View>

      {/* Top Anglers Section */}
      <TopAnglersSection anglers={topAnglers} />
    </View>
  );

  const renderListFooter = () => (
    filteredEntries.length > 0 ? <FeedFooter /> : null
  );

  const renderFeedContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading catches...</Text>
        </View>
      );
    }

    if (error) {
      return renderErrorState();
    }

    if (filteredEntries.length === 0) {
      return (
        <View>
          {renderListHeader()}
          {renderEmptyState()}
        </View>
      );
    }

    return (
      <FlatList
        data={filteredEntries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />

        {/* Fixed Header */}
        <View style={styles.fixedHeader}>
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
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
        </View>

        {/* Floating back button */}
        <Animated.View
          style={[
            styles.floatingBackButton,
            {
              opacity: floatingBackOpacity,
              transform: [{
                translateX: floatingBackOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-60, 0],
                })
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

        {/* Scrollable content */}
        <Animated.ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
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
        >
          {/* Header spacer */}
          <View style={styles.headerSpacerArea}>
            <TouchableOpacity
              onPress={handleGoBack}
              style={styles.spacerBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={{ width: 40, height: 40 }} />
            </TouchableOpacity>
          </View>

          {/* Content container */}
          <View style={styles.contentContainer}>
            {renderFeedContent()}
          </View>
        </Animated.ScrollView>

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
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // Fixed header
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingBottom: 20,
    paddingHorizontal: spacing.md,
    zIndex: 1,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },

  // Floating back button
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 52,
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

  // Scroll view
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollViewContent: {
    paddingBottom: 0,
  },

  // Header spacer
  headerSpacerArea: {
    height: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 100 : 130,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingHorizontal: spacing.md,
  },
  spacerBackButton: {
    width: 40,
    height: 40,
  },

  // Content container
  contentContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    minHeight: Dimensions.get('window').height,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  filterPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Top anglers section
  topAnglersSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  topAnglersTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  topAnglersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  topAnglerCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topAnglerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  topAnglerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  topAnglerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  topAnglerLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
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

  // Feed footer
  feedFooter: {
    marginTop: spacing.lg,
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
