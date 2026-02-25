// components/SkeletonLoader.tsx
//
// Reusable skeleton loader component with shimmer animation.
// Used for loading states across the app.

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '../styles/common';
import { useSkeletonAnimation } from '../hooks/useSkeletonAnimation';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Single skeleton element with shimmer animation.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius: radius = borderRadius.sm,
  style,
}) => {
  const { translateX } = useSkeletonAnimation();

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as number | `${number}%`,
          height,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Skeleton for a report card in Past Reports screen.
 */
export const ReportCardSkeleton: React.FC = () => (
  <View style={styles.reportCard}>
    {/* Status badge placeholder */}
    <View style={styles.statusBadgePlaceholder}>
      <Skeleton width={44} height={44} borderRadius={22} />
    </View>

    <View style={styles.cardContent}>
      {/* Info section */}
      <View style={styles.infoSection}>
        {/* Date */}
        <Skeleton width={120} height={20} style={{ marginBottom: 8 }} />

        {/* Location */}
        <View style={styles.locationRow}>
          <Skeleton width={14} height={14} borderRadius={7} />
          <Skeleton width={100} height={14} style={{ marginLeft: 6 }} />
        </View>

        {/* Species tags */}
        <View style={styles.speciesTags}>
          <Skeleton width={80} height={32} borderRadius={16} />
          <Skeleton width={70} height={32} borderRadius={16} />
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Skeleton width={14} height={14} borderRadius={7} />
          <Skeleton width={50} height={14} style={{ marginLeft: 8 }} />
          <Skeleton width={80} height={14} style={{ marginLeft: 16 }} />
        </View>
      </View>

      {/* Photo placeholder */}
      <Skeleton width={140} height={140} borderRadius={12} />
    </View>

    {/* Perforation line */}
    <View style={styles.perforationPlaceholder} />

    {/* Confirmation row */}
    <View style={styles.confirmationRow}>
      <Skeleton width={80} height={12} style={{ marginBottom: 4 }} />
      <Skeleton width={120} height={16} />
    </View>
  </View>
);

/**
 * Skeleton for a catch card in Catch Feed screen.
 */
export const CatchCardSkeleton: React.FC = () => (
  <View style={styles.catchCard}>
    {/* Header row - avatar and info */}
    <View style={styles.catchHeader}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.catchHeaderInfo}>
        <Skeleton width={100} height={16} style={{ marginBottom: 4 }} />
        <Skeleton width={140} height={12} />
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>

    {/* Photo placeholder */}
    <Skeleton
      width="100%"
      height={200}
      borderRadius={borderRadius.md}
      style={{ marginVertical: spacing.sm }}
    />

    {/* Species info */}
    <View style={styles.catchSpeciesRow}>
      <Skeleton width={80} height={28} borderRadius={14} />
      <Skeleton width={60} height={28} borderRadius={14} />
    </View>

    {/* Stats row */}
    <View style={styles.catchStatsRow}>
      <Skeleton width={40} height={14} />
      <Skeleton width={60} height={14} />
      <Skeleton width={50} height={14} />
    </View>
  </View>
);

/**
 * Skeleton for top anglers section.
 */
export const TopAnglersSkeleton: React.FC = () => (
  <View style={styles.topAnglersContainer}>
    <Skeleton width={100} height={18} style={{ marginBottom: spacing.md, marginLeft: spacing.md }} />
    <View style={styles.topAnglersRow}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.topAnglerItem}>
          <Skeleton width={56} height={56} borderRadius={28} />
          <Skeleton width={50} height={12} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  </View>
);

/**
 * Skeleton loader for Past Reports screen.
 */
export const PastReportsSkeletonLoader: React.FC = () => (
  <View style={styles.container}>
    {/* Filter tabs */}
    <View style={styles.filterTabs}>
      <Skeleton width={60} height={32} borderRadius={borderRadius.sm} />
      <Skeleton width={90} height={32} borderRadius={borderRadius.sm} />
      <Skeleton width={70} height={32} borderRadius={borderRadius.sm} />
    </View>

    {/* Report cards */}
    <View style={styles.listContainer}>
      <ReportCardSkeleton />
      <ReportCardSkeleton />
      <ReportCardSkeleton />
    </View>
  </View>
);

/**
 * Skeleton loader for Catch Feed screen.
 */
export const CatchFeedSkeletonLoader: React.FC = () => (
  <View style={styles.container}>
    {/* Top anglers section */}
    <TopAnglersSkeleton />

    {/* Filter pills */}
    <View style={styles.filterPills}>
      <Skeleton width={90} height={40} borderRadius={14} />
      <Skeleton width={100} height={40} borderRadius={14} />
      <Skeleton width={80} height={40} borderRadius={14} />
    </View>

    {/* Divider */}
    <Skeleton
      width="60%"
      height={2}
      style={{ alignSelf: 'center', marginVertical: spacing.md }}
    />

    {/* Catch cards */}
    <View style={styles.catchCardsContainer}>
      <CatchCardSkeleton />
      <CatchCardSkeleton />
    </View>
  </View>
);

/**
 * Skeleton loader for the Promotions (Fisherman's Locker) screen.
 * Mirrors the real layout: header, area pills, category tabs,
 * featured hero card, section label, and a 2-column grid of cards.
 */
export const PromotionsSkeletonLoader: React.FC = () => (
  <View style={styles.promoContainer}>
    {/* Area filter pills */}
    <View style={styles.promoFilterRow}>
      <View style={styles.promoPillSkeleton}><Skeleton width={80} height={34} borderRadius={20} style={styles.promoSkeletonItem} /></View>
      <View style={styles.promoPillSkeleton}><Skeleton width={52} height={34} borderRadius={20} style={styles.promoSkeletonItem} /></View>
      <View style={styles.promoPillSkeleton}><Skeleton width={52} height={34} borderRadius={20} style={styles.promoSkeletonItem} /></View>
      <View style={styles.promoPillSkeleton}><Skeleton width={52} height={34} borderRadius={20} style={styles.promoSkeletonItem} /></View>
      <View style={styles.promoPillSkeleton}><Skeleton width={52} height={34} borderRadius={20} style={styles.promoSkeletonItem} /></View>
    </View>

    {/* Category filter tabs */}
    <View style={styles.promoFilterRow}>
      <View style={styles.promoTabSkeleton}><Skeleton width={56} height={32} borderRadius={16} style={styles.promoSkeletonItem} /></View>
      <View style={styles.promoTabSkeleton}><Skeleton width={68} height={32} borderRadius={16} style={styles.promoSkeletonItem} /></View>
      <View style={styles.promoTabSkeleton}><Skeleton width={76} height={32} borderRadius={16} style={styles.promoSkeletonItem} /></View>
      <View style={styles.promoTabSkeleton}><Skeleton width={56} height={32} borderRadius={16} style={styles.promoSkeletonItem} /></View>
      <View style={styles.promoTabSkeleton}><Skeleton width={72} height={32} borderRadius={16} style={styles.promoSkeletonItem} /></View>
    </View>

    {/* Featured hero card */}
    <View style={styles.promoFeaturedCard}>
      <Skeleton width="100%" height={200} borderRadius={borderRadius.lg} style={styles.promoHeroSkeleton} />
    </View>

    {/* Section label */}
    <View style={styles.promoSectionLabel}>
      <Skeleton width={140} height={14} style={styles.promoSkeletonItem} />
    </View>

    {/* 2-column grid cards */}
    <View style={styles.promoGridRow}>
      <PromotionCardSkeleton />
      <PromotionCardSkeleton />
    </View>
    <View style={styles.promoGridRow}>
      <PromotionCardSkeleton />
      <PromotionCardSkeleton />
    </View>
  </View>
);

/**
 * Skeleton for an individual promotion card in the grid.
 */
const PromotionCardSkeleton: React.FC = () => (
  <View style={styles.promoCard}>
    {/* Image placeholder */}
    <Skeleton width="100%" height={100} borderRadius={0} />
    {/* Content */}
    <View style={styles.promoCardContent}>
      <Skeleton width={50} height={16} borderRadius={borderRadius.xs} style={{ marginBottom: 6 }} />
      <Skeleton width="80%" height={16} style={{ marginBottom: 4 }} />
      <Skeleton width="100%" height={12} style={{ marginBottom: 3 }} />
      <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
      <Skeleton width={64} height={18} borderRadius={borderRadius.xs} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skeleton: {
    backgroundColor: colors.lightGray,
    overflow: 'hidden',
  },
  shimmer: {
    width: 200,
    height: '100%',
    position: 'absolute',
  },

  // Report card skeleton styles
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadgePlaceholder: {
    position: 'absolute',
    top: -22,
    right: -10,
    zIndex: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  speciesTags: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perforationPlaceholder: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: spacing.md,
    marginHorizontal: -spacing.md,
  },
  confirmationRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  // Catch feed skeleton styles
  catchCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  catchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  catchHeaderInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  catchSpeciesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  catchStatsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  filterPills: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  catchCardsContainer: {
    paddingTop: spacing.sm,
  },

  // Top anglers skeleton styles
  topAnglersContainer: {
    paddingVertical: spacing.md,
  },
  topAnglersRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  topAnglerItem: {
    alignItems: 'center',
  },

  // Promotions skeleton styles
  promoContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
  },
  promoFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  promoFeaturedCard: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  promoSectionLabel: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  promoGridRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  promoCard: {
    flex: 1,
    backgroundColor: colors.pearlWhite,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  promoCardContent: {
    padding: spacing.sm,
  },
  // Higher-contrast skeleton items for the light blue background
  promoSkeletonItem: {
    backgroundColor: 'rgba(11, 84, 139, 0.10)',
  },
  promoHeroSkeleton: {
    backgroundColor: 'rgba(11, 84, 139, 0.15)',
  },
  promoPillSkeleton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  promoTabSkeleton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default Skeleton;
