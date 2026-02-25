// screens/PromotionsScreen.tsx
//
// Fisherman's Locker — a premium marketplace-style screen where users
// browse deals, discover local charters and services, and businesses
// can inquire about partnerships.
//
// Uses the same "card sliding over header" scroll pattern as HomeScreen,
// CatchFeedScreen, and ReportFormScreen with floating back button.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';

import {
  AreaSelector,
  CategoryTabs,
  PromotionCard,
  FeaturedPromotionCard,
  PartnerCTACard,
} from '../components/promotions';
import { PromotionsSkeletonLoader } from '../components/SkeletonLoader';
import { SCREEN_LABELS } from '../constants/screenLabels';
import { REGION_OPTIONS } from '../constants/regionOptions';
import { useFloatingHeaderAnimation } from '../hooks/useFloatingHeaderAnimation';
import { colors, spacing, borderRadius } from '../styles/common';
import { type Advertisement, type AdCategory } from '../services/promotionsService';
import { usePromotions } from '../api/promotionsApi';
import { advertisements as localAdsData } from '../data/advertisementsData';
import type { RootStackParamList, UserProfile } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = StackScreenProps<RootStackParamList, 'Promotions'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - CARD_GAP) / 2;
// Estimated row height for getItemLayout (image 100 + content ~90 + margin 8)
const ESTIMATED_ROW_HEIGHT = 198 + spacing.sm;

// Map local ad IDs to their require() images for offline display
const LOCAL_IMAGE_MAP: Record<string, any> = {};
localAdsData.forEach((ad) => {
  LOCAL_IMAGE_MAP[ad.id] = ad.image;
});

const PromotionsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // Floating header animation
  const {
    scrollY,
    floatingOpacity: floatingBackOpacity,
    floatingTranslateXLeft: floatingBackTranslateX,
  } = useFloatingHeaderAnimation();

  // Filter state
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AdCategory | null>(null);
  const [userPreferredArea, setUserPreferredArea] = useState<string | null>(null);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  // React Query — replaces manual useState + useEffect fetch pattern
  const {
    data: queryResult,
    isLoading: loading,
    isFetching,
    refetch,
  } = usePromotions({
    area: selectedArea || undefined,
    category: selectedCategory,
  });

  const promotions = queryResult?.promotions ?? [];
  const refreshing = isFetching && !loading;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Load user's preferred area on mount
  useEffect(() => {
    const loadPreferredArea = async () => {
      try {
        const profileJson = await AsyncStorage.getItem('userProfile');
        if (profileJson) {
          const profile: UserProfile = JSON.parse(profileJson);
          if (profile.preferredAreaCode) {
            setUserPreferredArea(profile.preferredAreaCode);
          }
        }
      } catch (e) {
        // Silently fail
      }
    };
    loadPreferredArea();
  }, []);

  // Split promotions into featured and regular
  const featured = useMemo(
    () => promotions.find((p) => p.featured),
    [promotions]
  );
  const regularPromotions = useMemo(
    () => promotions.filter((p) => !p.featured),
    [promotions]
  );

  // Category counts — derived from current data when no category filter is active
  const categoryCounts = useMemo(() => {
    if (selectedCategory) return {};
    const counts: Partial<Record<AdCategory, number>> = {};
    promotions.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [promotions, selectedCategory]);

  // getItemLayout for FlatList scroll performance (numColumns=2, so index = row index)
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: ESTIMATED_ROW_HEIGHT,
      offset: ESTIMATED_ROW_HEIGHT * index,
      index,
    }),
    []
  );

  // Render a promotion card in the grid
  const renderPromotionCard = useCallback(
    ({ item, index }: { item: Advertisement; index: number }) => (
      <View
        style={[
          styles.gridItem,
          { width: CARD_WIDTH },
          index % 2 === 0 ? { marginRight: CARD_GAP } : {},
        ]}
      >
        <PromotionCard
          promotion={item}
          localImage={LOCAL_IMAGE_MAP[item.id]}
        />
      </View>
    ),
    []
  );

  // Empty state — memoized to prevent re-creation on every render
  const emptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Feather name="tag" size={40} color={colors.mediumGray} />
        </View>
        <Text style={styles.emptyTitle}>Nothing in the locker yet</Text>
        <Text style={styles.emptySubtitle}>
          {selectedArea || selectedCategory
            ? 'Try changing your filters to see more deals and services.'
            : 'Check back soon for deals and local services.'}
        </Text>
      </View>
    ),
    [selectedArea, selectedCategory]
  );

  // Memoize region list to avoid unnecessary re-renders
  const regionItems = useMemo(
    () => REGION_OPTIONS.map((r) => ({ value: r.value, shortLabel: r.shortLabel })),
    []
  );

  // List header as memoized JSX element (not an inline component)
  // so FlatList doesn't unmount/remount it on every re-render.
  const listHeader = useMemo(
    () => (
      <View style={{ backgroundColor: colors.primary }}>
        {/* Scrolling header — scrolls away with content */}
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
              <Text style={styles.headerTitle}>
                {SCREEN_LABELS.promotions.title}
              </Text>
              <Text style={styles.headerSubtitle}>
                {SCREEN_LABELS.promotions.subtitle}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Content container with rounded top — slides over header */}
        <View style={styles.contentContainer}>
          {/* Area selector */}
          <View style={styles.filtersSection}>
            <AreaSelector
              selectedArea={selectedArea}
              onSelectArea={setSelectedArea}
              regions={regionItems}
            />

            {/* Category tabs */}
            <CategoryTabs
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categoryCounts={categoryCounts}
            />
          </View>

          {/* Featured promotion */}
          {featured && (
            <FeaturedPromotionCard
              promotion={featured}
              localImage={LOCAL_IMAGE_MAP[featured.id]}
            />
          )}

          {/* Section label */}
          {regularPromotions.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCategory
                  ? `${regularPromotions.length} Result${regularPromotions.length !== 1 ? 's' : ''}`
                  : 'All Deals & Services'}
              </Text>
            </View>
          )}
        </View>
      </View>
    ),
    [selectedArea, selectedCategory, categoryCounts, featured, regularPromotions.length, handleGoBack, regionItems]
  );

  // List footer: Partner CTA — memoized
  const listFooter = useMemo(
    () => <PartnerCTACard onPress={() => navigation.navigate('PartnerInquiry')} />,
    [navigation]
  );

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />

        {/* Floating back button — appears when header scrolls away */}
        <Animated.View
          style={[
            styles.floatingBackButton,
            {
              top: Platform.OS === 'android'
                ? (StatusBar.currentHeight || 0) + 12
                : insets.top + 8,
              opacity: floatingBackOpacity,
              transform: [{ translateX: floatingBackTranslateX }],
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

        {loading ? (
          <View style={styles.skeletonWrapper}>
            {/* Scrolling header — same as real content */}
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
                  <Text style={styles.headerTitle}>
                    {SCREEN_LABELS.promotions.title}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {SCREEN_LABELS.promotions.subtitle}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Skeleton body slides over header */}
            <PromotionsSkeletonLoader />
          </View>
        ) : (
          <Animated.FlatList
            data={regularPromotions}
            renderItem={renderPromotionCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            style={styles.flatList}
            contentContainerStyle={styles.flatListContent}
            columnWrapperStyle={styles.columnWrapper}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            ListEmptyComponent={emptyComponent}
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            windowSize={5}
            maxToRenderPerBatch={8}
            initialNumToRender={8}
            removeClippedSubviews={true}
            testID="promotions-flatlist"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.white}
                colors={[colors.primary]}
                progressBackgroundColor={colors.white}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // Scrolling header — scrolls with content, compact
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

  // Content container — rounded corners that slide over header
  contentContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    overflow: 'hidden',
  },

  filtersSection: {
    // filters sit inside the rounded content area
  },

  // Floating back button
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

  // FlatList
  flatList: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  flatListContent: {
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  columnWrapper: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  gridItem: {
    flex: 0,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Skeleton loading state
  skeletonWrapper: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightestGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PromotionsScreen;
