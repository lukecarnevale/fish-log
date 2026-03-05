// screens/BulletinsScreen.tsx
//
// Dedicated Bulletins page — shows all active bulletins (including dismissed
// ones) in a full-page FlatList. Matches the CatchFeed "card sliding over
// header" visual pattern with a floating back button that appears on scroll.

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { RootStackParamList } from '../types';
import { useBulletins } from '../contexts/BulletinContext';
import { SCREEN_LABELS } from '../constants/screenLabels';
import { BULLETIN_TYPE_CONFIG } from '../constants/bulletin';
import { useFloatingHeaderAnimation } from '../hooks/useFloatingHeaderAnimation';
import { formatBulletinDate } from '../utils/dateUtils';
import { colors, spacing, borderRadius, typography } from '../styles/common';
import type { Bulletin } from '../types/bulletin';

// =============================================================================
// Navigation Types
// =============================================================================

type BulletinsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Bulletins'
>;

interface BulletinsScreenProps {
  navigation: BulletinsScreenNavigationProp;
}

// =============================================================================
// Empty State Illustration
// =============================================================================

const EmptyBulletinIllustration: React.FC = () => (
  <Svg width={160} height={120} viewBox="0 0 160 120">
    {/* Decorative bubbles */}
    <Circle cx={25} cy={35} r={3} fill={colors.primaryLight} opacity={0.5} />
    <Circle cx={140} cy={25} r={4} fill={colors.primaryLight} opacity={0.4} />
    <Circle cx={130} cy={90} r={3} fill={colors.primaryLight} opacity={0.5} />
    {/* Bell icon */}
    <G transform="translate(50, 20)">
      <Ellipse cx={30} cy={50} rx={22} ry={6} fill={colors.primaryLight} opacity={0.3} />
      <Path
        d="M30 10 C30 10 18 18 18 32 L18 38 C18 42 14 44 14 44 L46 44 C46 44 42 42 42 38 L42 32 C42 18 30 10 30 10 Z"
        fill={colors.secondary}
        opacity={0.85}
      />
      <Circle cx={30} cy={8} r={3} fill={colors.secondary} />
      <Ellipse cx={30} cy={48} rx={5} ry={3} fill={colors.secondary} opacity={0.9} />
      {/* Check mark */}
      <Path
        d="M22 28 L28 34 L38 24"
        stroke={colors.white}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  </Svg>
);

// =============================================================================
// Bulletin Row Component
// =============================================================================

interface BulletinRowProps {
  bulletin: Bulletin;
  onPress: (bulletin: Bulletin) => void;
  isLast: boolean;
}

const BulletinRow: React.FC<BulletinRowProps> = ({ bulletin, onPress, isLast }) => {
  const config = BULLETIN_TYPE_CONFIG[bulletin.bulletinType] ?? BULLETIN_TYPE_CONFIG.info;

  return (
    <TouchableOpacity
      style={[styles.bulletinRow, !isLast && styles.bulletinRowBorder]}
      onPress={() => onPress(bulletin)}
      activeOpacity={0.6}
    >
      <View style={styles.bulletinContent}>
        {/* Type indicator dot */}
        <View style={[styles.typeDot, { backgroundColor: config.color }]} />

        <View style={styles.bulletinText}>
          {/* Type badge */}
          <View style={[styles.typeBadge, { backgroundColor: `${config.color}15` }]}>
            <Feather name={config.icon} size={10} color={config.color} />
            <Text style={[styles.typeBadgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.bulletinTitle} numberOfLines={2}>
            {bulletin.title}
          </Text>

          {/* Description preview */}
          {bulletin.description && (
            <Text style={styles.bulletinDescription} numberOfLines={2}>
              {bulletin.description}
            </Text>
          )}

          {/* Date range */}
          {(bulletin.effectiveDate || bulletin.expirationDate) && (
            <Text style={styles.bulletinDate}>
              {bulletin.effectiveDate && bulletin.expirationDate
                ? `${formatBulletinDate(bulletin.effectiveDate)} – ${formatBulletinDate(bulletin.expirationDate)}`
                : bulletin.effectiveDate
                  ? `From ${formatBulletinDate(bulletin.effectiveDate)}`
                  : `Until ${formatBulletinDate(bulletin.expirationDate!)}`}
            </Text>
          )}
        </View>

        {/* Tap chevron */}
        <Feather name="chevron-right" size={16} color={colors.lightGray} />
      </View>
    </TouchableOpacity>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const BulletinsScreen: React.FC<BulletinsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { fetchedBulletins, showBulletinDetail } = useBulletins();
  const {
    scrollY,
    floatingOpacity,
    floatingTranslateXLeft: floatingBackTranslateX,
  } = useFloatingHeaderAnimation();

  // Rename for clarity
  const floatingBackOpacity = floatingOpacity;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBulletinPress = useCallback(
    (bulletin: Bulletin) => {
      // Bulletins page always shows all bulletins, so don't offer "Don't show again"
      showBulletinDetail(bulletin, false);
    },
    [showBulletinDetail]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Bulletin; index: number }) => (
      <BulletinRow
        bulletin={item}
        onPress={handleBulletinPress}
        isLast={index === fetchedBulletins.length - 1}
      />
    ),
    [handleBulletinPress, fetchedBulletins.length]
  );

  const keyExtractor = useCallback((item: Bulletin) => item.id, []);

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <EmptyBulletinIllustration />
        <Text style={styles.emptyTitle}>No Bulletins</Text>
        <Text style={styles.emptySubtext}>
          There are no active bulletins right now.{'\n'}Check back later for
          fishing advisories and updates.
        </Text>
      </View>
    ),
    []
  );

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />

        {/* Floating back button - appears when header scrolls away */}
        <Animated.View
          style={[
            styles.floatingBackButton,
            {
              top:
                Platform.OS === 'android'
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

        {/* Main FlatList - header scrolls with content (CatchFeed pattern) */}
        <Animated.FlatList
          data={fetchedBulletins}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.flatList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.flatListContent,
            fetchedBulletins.length === 0 && styles.emptyListContent,
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <View style={{ backgroundColor: colors.primary }}>
              {/* Scrolling header — dark blue gradient */}
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
                      {SCREEN_LABELS.bulletins.title}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                      {SCREEN_LABELS.bulletins.subtitle} & updates
                    </Text>
                  </View>

                  {/* Bulletin count badge */}
                  {fetchedBulletins.length > 0 && (
                    <View style={styles.countBadge}>
                      <Feather name="bell" size={14} color={colors.white} />
                      <Text style={styles.countBadgeText}>
                        {fetchedBulletins.length}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>

              {/* Content area with rounded corners sliding over header */}
              <View style={styles.contentContainer} />
            </View>
          }
          ListEmptyComponent={renderEmptyState}
          // Performance
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          windowSize={7}
          initialNumToRender={10}
        />
      </SafeAreaView>
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // Scrolling header
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

  // Count badge in header
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 7,
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
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
  emptyListContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },

  // Content container — rounded corners sliding over header
  contentContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    marginTop: -12,
  },

  // Bulletin rows
  bulletinRow: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  bulletinRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  bulletinContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  bulletinText: {
    flex: 1,
    marginRight: spacing.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.circle,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: 3,
  },
  bulletinTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 20,
  },
  bulletinDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  bulletinDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 4,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default BulletinsScreen;
