// screens/BulletinsScreen.tsx
//
// Dedicated Bulletins page — shows all active bulletins grouped by type
// in collapsible sections. Uses the warm parchment aesthetic for the list
// body while keeping the existing teal header unchanged.

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  ScrollView,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { RootStackParamList } from '../types';
import { useBulletins } from '../contexts/BulletinContext';
import StatusBarScrollBlur from '../components/StatusBarScrollBlur';
import { SCREEN_LABELS } from '../constants/screenLabels';
import { useFloatingHeaderAnimation } from '../hooks/useFloatingHeaderAnimation';
import { formatBulletinDate } from '../utils/dateUtils';
import { spacing } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { BULLETIN_TYPE_CONFIG } from '../constants/bulletin';
import type { Bulletin } from '../types/bulletin';
import type { BulletinType } from '../types/bulletin';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
// Section ordering — most critical first
// =============================================================================

const SECTION_ORDER: BulletinType[] = ['closure', 'advisory', 'educational', 'info'];

// =============================================================================
// Empty State Illustration
// =============================================================================

const EmptyBulletinIllustration: React.FC<{ theme: Theme }> = ({ theme }) => (
  <Svg width={160} height={120} viewBox="0 0 160 120">
    <Circle cx={25} cy={35} r={3} fill={theme.colors.primaryLight} opacity={0.5} />
    <Circle cx={140} cy={25} r={4} fill={theme.colors.primaryLight} opacity={0.4} />
    <Circle cx={130} cy={90} r={3} fill={theme.colors.primaryLight} opacity={0.5} />
    <G transform="translate(50, 20)">
      <Ellipse cx={30} cy={50} rx={22} ry={6} fill={theme.colors.primaryLight} opacity={0.3} />
      <Path
        d="M30 10 C30 10 18 18 18 32 L18 38 C18 42 14 44 14 44 L46 44 C46 44 42 42 42 38 L42 32 C42 18 30 10 30 10 Z"
        fill={theme.colors.secondary}
        opacity={0.85}
      />
      <Circle cx={30} cy={8} r={3} fill={theme.colors.secondary} />
      <Ellipse cx={30} cy={48} rx={5} ry={3} fill={theme.colors.secondary} opacity={0.9} />
      <Path
        d="M22 28 L28 34 L38 24"
        stroke={theme.colors.white}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  </Svg>
);

// =============================================================================
// Bulletin Card Component
// =============================================================================

interface BulletinCardProps {
  bulletin: Bulletin;
  onPress: (bulletin: Bulletin) => void;
  isUnread?: boolean;
}

const BulletinCard: React.FC<BulletinCardProps> = ({ bulletin, onPress, isUnread }) => {
  const styles = useThemedStyles(createStyles);
  const cfg = BULLETIN_TYPE_CONFIG[bulletin.bulletinType];

  const dateText =
    bulletin.effectiveDate || bulletin.expirationDate
      ? bulletin.effectiveDate && bulletin.expirationDate
        ? `${formatBulletinDate(bulletin.effectiveDate)} – ${formatBulletinDate(bulletin.expirationDate)}`
        : bulletin.effectiveDate
          ? `From ${formatBulletinDate(bulletin.effectiveDate)}`
          : `Until ${formatBulletinDate(bulletin.expirationDate!)}`
      : null;

  return (
    <TouchableOpacity
      style={styles.bulletinCard}
      onPress={() => onPress(bulletin)}
      activeOpacity={0.7}
    >
      {/* Top row — status badge (left) + date (right) */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardBadgeRow}>
          {isUnread && <View style={styles.unreadDot} />}
          <View style={[styles.cardBadge, { backgroundColor: cfg.badgeBg }]}>
            <Feather name={cfg.icon} size={10} color={cfg.color} style={styles.cardBadgeIcon} />
            <Text style={[styles.cardBadgeText, { color: cfg.color }]} maxFontSizeMultiplier={1.15}>
              {cfg.label}
            </Text>
          </View>
        </View>
        {dateText && <Text style={styles.cardDate} maxFontSizeMultiplier={1.2}>{dateText}</Text>}
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {bulletin.title}
      </Text>

      {/* Description */}
      {bulletin.description && (
        <Text style={styles.cardDescription} numberOfLines={2} ellipsizeMode="tail">
          {bulletin.description}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// =============================================================================
// Section Header Component
// =============================================================================

interface SectionHeaderProps {
  type: BulletinType;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ type, count, expanded, onToggle }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const cfg = BULLETIN_TYPE_CONFIG[type];
  const chevronRotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(chevronRotation, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, chevronRotation]);

  const rotate = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <TouchableOpacity
      style={[styles.sectionHeader, { backgroundColor: cfg.color + 'CC' }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Feather name={cfg.icon} size={16} color={theme.colors.white} />
      </View>
      <Text style={styles.sectionTitle}>{cfg.label}</Text>
      <View style={[styles.sectionCountBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
        <Text style={[styles.sectionCountText, { color: theme.colors.white }]} maxFontSizeMultiplier={1.1}>{count}</Text>
      </View>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Feather name="chevron-down" size={20} color={theme.colors.white} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const BulletinsScreen: React.FC<BulletinsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { fetchedBulletins, showBulletinDetail, isBulletinRead } = useBulletins();
  const {
    scrollY,
    floatingOpacity,
    floatingTranslateXLeft: floatingBackTranslateX,
  } = useFloatingHeaderAnimation();

  const floatingBackOpacity = floatingOpacity;

  // Group bulletins by type
  const groupedBulletins = useMemo(() => {
    const groups: Partial<Record<BulletinType, Bulletin[]>> = {};
    for (const bulletin of fetchedBulletins) {
      const type = bulletin.bulletinType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type]!.push(bulletin);
    }
    return groups;
  }, [fetchedBulletins]);

  // Only show sections that have bulletins, in the defined order
  const activeSections = useMemo(
    () => SECTION_ORDER.filter((type) => (groupedBulletins[type]?.length ?? 0) > 0),
    [groupedBulletins]
  );

  // All sections expanded by default
  const [collapsedSections, setCollapsedSections] = useState<Set<BulletinType>>(new Set());

  const toggleSection = useCallback((type: BulletinType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBulletinPress = useCallback(
    (bulletin: Bulletin) => {
      showBulletinDetail(bulletin, false);
    },
    [showBulletinDetail]
  );

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      ),
    [scrollY]
  );

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} translucent />

        {/* Slack-style frosted blur over the OS toolbar that fades in on scroll. */}
        <StatusBarScrollBlur scrollY={scrollY} />

        {/* Floating back button */}
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
            <Feather name="arrow-left" size={22} color={theme.colors.white} />
          </TouchableOpacity>
        </Animated.View>

        {/* Main ScrollView */}
        <Animated.ScrollView
          style={styles.flatList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.flatListContent,
            fetchedBulletins.length === 0 && styles.emptyListContent,
          ]}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {/* Teal header */}
          <View style={{ backgroundColor: theme.colors.primary }}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primary]}
              style={styles.scrollingHeader}
            >
              <View style={styles.headerContent}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleGoBack}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="arrow-left" size={24} color={theme.colors.white} />
                </TouchableOpacity>

                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>
                    {SCREEN_LABELS.bulletins.title}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {SCREEN_LABELS.bulletins.subtitle} & updates
                  </Text>
                </View>

                {fetchedBulletins.length > 0 && (
                  <View style={styles.countBadge}>
                    <Feather name="bell" size={14} color={theme.colors.white} />
                    <Text style={styles.countBadgeText}>
                      {fetchedBulletins.length}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Parchment area — rounded corners sliding over header */}
            <View style={styles.contentContainer} />
          </View>

          {/* Grouped sections */}
          {fetchedBulletins.length > 0 ? (
            <View style={styles.sectionsContainer}>
              {activeSections.map((type) => {
                const items = groupedBulletins[type]!;
                const isExpanded = !collapsedSections.has(type);
                return (
                  <View key={type} style={styles.sectionContainer}>
                    <SectionHeader
                      type={type}
                      count={items.length}
                      expanded={isExpanded}
                      onToggle={() => toggleSection(type)}
                    />
                    {isExpanded && (
                      <View style={styles.sectionContent}>
                        {items.map((bulletin) => (
                          <BulletinCard
                            key={bulletin.id}
                            bulletin={bulletin}
                            onPress={handleBulletinPress}
                            isUnread={!isBulletinRead(bulletin.id)}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <EmptyBulletinIllustration theme={theme} />
              <Text style={styles.emptyTitle}>No Bulletins</Text>
              <Text style={styles.emptySubtext}>
                There are no active bulletins right now.{'\n'}Check back later for
                fishing advisories and updates.
              </Text>
            </View>
          )}
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: Theme) => StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },

  // ── Teal header (unchanged) ────────────────────────────────────────────────
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
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    color: theme.colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.white,
    opacity: 0.85,
    marginTop: 2,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 7,
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },

  // ── Floating back button ───────────────────────────────────────────────────
  floatingBackButton: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
    backgroundColor: theme.colors.primary,
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

  // ── ScrollView ───────────────────────────────────────────────────────────
  flatList: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  flatListContent: {
    backgroundColor: theme.colors.parchment,
    flexGrow: 1,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    backgroundColor: theme.colors.parchment,
  },

  // Parchment area — rounded corners sliding over teal header
  contentContainer: {
    backgroundColor: theme.colors.parchment,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    marginTop: -12,
  },

  // ── Sections ─────────────────────────────────────────────────────────────
  sectionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.parchmentBorder,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: 0.5,
  },
  sectionCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.parchmentBorder,
    paddingTop: 8,
    paddingBottom: 6,
  },

  // ── Bulletin card ──────────────────────────────────────────────────────────
  bulletinCard: {
    backgroundColor: theme.colors.parchment,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.parchmentBorder,
    padding: 14,
    marginBottom: 8,
    marginHorizontal: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: 6,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cardBadgeIcon: {
    marginRight: 3,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardDate: {
    fontSize: 12,
    color: theme.colors.parchmentTextSecondary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.parchmentText,
    fontFamily: 'Georgia',
    lineHeight: 22,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.parchmentTextSecondary,
    lineHeight: 20,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
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
    color: theme.colors.parchmentText,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.parchmentTextSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});

export default BulletinsScreen;
