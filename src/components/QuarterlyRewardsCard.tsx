// components/QuarterlyRewardsCard.tsx
//
// Redesigned Quarterly Rewards card with cohesive styling.
// Drop-in replacement for PrizesComponent.
//

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { safeOpenURL } from '../utils/openURL';
import { RootStackParamList } from '../types';
import { Prize, PrizeCategory } from '../types/rewards';
import { useRewards } from '../contexts/RewardsContext';
import { WaveBackground, HeroFishIllustration, FishingRodIllustration, LicenseCardIllustration, GenericPrizeIllustration, SwimmingFishButton } from './icons/RewardsIllustrations';
import { useFontScale, FONT_SCALE_CAP_BODY } from '../hooks/useFontScale';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface QuarterlyRewardsCardProps {
  onReportPress?: () => void;
  /** Whether the user is signed in (rewards member) */
  isSignedIn?: boolean;
  /** Whether the user has an email in their profile */
  hasProfileEmail?: boolean;
  /** Bump this value to force a re-fetch of rewards data (used by pull-to-refresh) */
  refreshKey?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const CATEGORY_ICONS: Record<PrizeCategory, keyof typeof Feather.glyphMap> = {
  license: 'credit-card',
  gear: 'anchor',
  apparel: 'shopping-bag',
  experience: 'compass',
  other: 'gift',
};

/**
 * Parses text and returns Text elements with tappable phone numbers and emails.
 */
const renderLinkedText = (text: string, baseStyle: object) => {
  const linkPattern = /([\w.-]+@[\w.-]+\.\w+|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g;
  const parts = text.split(linkPattern);

  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => {
        const isEmail = /^[\w.-]+@[\w.-]+\.\w+$/.test(part);
        const isPhone = /^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(part);

        if (isEmail) {
          return (
            <Text
              key={i}
              style={{ color: COLORS.primary, textDecorationLine: 'underline' }}
              onPress={() => safeOpenURL(`mailto:${part}`)}
            >
              {part}
            </Text>
          );
        }
        if (isPhone) {
          const digits = part.replace(/\D/g, '');
          return (
            <Text
              key={i}
              style={{ color: COLORS.primary, textDecorationLine: 'underline' }}
              onPress={() => safeOpenURL(`tel:${digits}`)}
            >
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
};

function getPrizeIcon(category: PrizeCategory): keyof typeof Feather.glyphMap {
  return CATEGORY_ICONS[category] || 'gift';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Get appropriate illustration for prize category */
function getPrizeIllustration(category: PrizeCategory): React.ReactNode {
  switch (category) {
    case 'gear':
      return <FishingRodIllustration />;
    case 'license':
      return <LicenseCardIllustration />;
    default:
      return <GenericPrizeIllustration />;
  }
}

// ============================================
// SKELETON LOADER
// ============================================

/** Animated skeleton box with shimmer effect */
const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}> = ({ width, height, borderRadius = 4, style }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  // Opacity shimmer instead of color interpolation (native driver compatible)
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#D0DAE4',
          opacity,
        },
        style,
      ]}
    />
  );
};

/** Skeleton loader for QuarterlyRewardsCard */
const QuarterlyRewardsCardSkeleton: React.FC = () => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      {/* Entry Status Tab Skeleton */}
      <View style={styles.entryStatusTab}>
        <View style={[styles.entryStatusContent, { backgroundColor: '#D0DAE4' }]}>
          <SkeletonBox width={80} height={12} borderRadius={6} />
        </View>
      </View>

      {/* Main Card Container */}
      <View style={styles.cardContainer}>
        {/* Hero Header Skeleton */}
        <LinearGradient
          colors={[COLORS.navyDark, COLORS.navyLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroContainer}
        >
          <View style={styles.heroContent}>
            {/* Title skeleton */}
            <SkeletonBox width={180} height={24} borderRadius={6} style={{ marginBottom: 8, opacity: 0.3 }} />
            {/* Subtitle skeleton */}
            <SkeletonBox width={240} height={14} borderRadius={4} style={{ marginBottom: 12, opacity: 0.2 }} />
            {/* Badge skeleton */}
            <SkeletonBox width={140} height={28} borderRadius={20} style={{ opacity: 0.25 }} />
          </View>
        </LinearGradient>

        {/* Content Area Skeleton */}
        <View style={styles.contentContainer}>
          {/* Progress Section Skeleton */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <SkeletonBox width={100} height={13} />
              <SkeletonBox width={70} height={13} />
            </View>
            <SkeletonBox width="100%" height={8} borderRadius={4} />
          </View>

          {/* How It Works Row Skeleton */}
          <View style={styles.infoRow}>
            <SkeletonBox width={36} height={36} borderRadius={10} />
            <View style={[styles.infoContent, { marginLeft: 12 }]}>
              <SkeletonBox width={100} height={15} style={{ marginBottom: 6 }} />
              <SkeletonBox width={200} height={13} />
            </View>
          </View>

          {/* Drawing Date Row Skeleton */}
          <View style={styles.infoRow}>
            <SkeletonBox width={36} height={36} borderRadius={10} />
            <View style={[styles.infoContent, { marginLeft: 12 }]}>
              <SkeletonBox width={90} height={15} style={{ marginBottom: 6 }} />
              <SkeletonBox width={180} height={13} style={{ marginBottom: 4 }} />
              <SkeletonBox width={140} height={13} />
            </View>
          </View>

          {/* Prize Section Skeleton */}
          <View style={styles.prizeSection}>
            <SkeletonBox width={140} height={15} style={{ marginBottom: 12 }} />
            <View style={[styles.prizeItem, { backgroundColor: COLORS.bgCard }]}>
              <SkeletonBox width={60} height={50} borderRadius={8} />
              <View style={[styles.prizeDetails, { marginLeft: 14 }]}>
                <SkeletonBox width={120} height={14} style={{ marginBottom: 6 }} />
                <SkeletonBox width={80} height={13} />
              </View>
            </View>
          </View>

          {/* Notification Banner Skeleton */}
          <View style={[styles.notificationBanner, { backgroundColor: COLORS.bgLight }]}>
            <SkeletonBox width={36} height={36} borderRadius={10} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonBox width="90%" height={12} style={{ marginBottom: 5 }} />
              <SkeletonBox width="70%" height={12} />
            </View>
          </View>
        </View>
      </View>

      {/* Footer CTA Skeleton */}
      <View style={styles.footerCta}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <SkeletonBox width="80%" height={13} style={{ marginBottom: 4 }} />
          <SkeletonBox width="60%" height={13} />
        </View>
        <SkeletonBox width={100} height={44} borderRadius={16} />
      </View>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const QuarterlyRewardsCard: React.FC<QuarterlyRewardsCardProps> = ({ onReportPress, isSignedIn = false, hasProfileEmail = false, refreshKey }) => {
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [scrollToPrizes, setScrollToPrizes] = useState(false);
  const modalScrollViewRef = useRef<ScrollView>(null);
  const prizeSectionY = useRef<number>(0);

  // Dynamic Type: the entry status tab is a file-folder style tab positioned
  // above the card with a negative top offset. At larger text sizes the tab
  // content grows, so we scale the offset and padding to keep it visible.
  // See Phase 2 of the accessibility audit.
  const { fontScale } = useFontScale();
  const tabScale = Math.min(Math.max(fontScale, 1), FONT_SCALE_CAP_BODY);
  const entryStatusDynamic = {
    top: -18 * tabScale,
    paddingTop: 5 * tabScale,
    paddingBottom: 18 + (8 * (tabScale - 1)),
  };

  const {
    currentDrawing,
    config,
    isLoading,
    error,
    calculated,
    hasEnteredCurrentRaffle,
    isNewQuarter,
    refresh: refreshRewards,
  } = useRewards();

  // Re-fetch rewards data whenever the caller bumps refreshKey
  // (pull-to-refresh on HomeScreen). Skip the first render — the context
  // already fetches on mount, so we only need to react to changes.
  const isFirstRefreshKey = useRef(true);
  useEffect(() => {
    if (refreshKey === undefined) return;
    if (isFirstRefreshKey.current) {
      isFirstRefreshKey.current = false;
      return;
    }
    refreshRewards();
  }, [refreshKey, refreshRewards]);

  // Slow pulsing animation for progress indicator — native driver for smooth 60fps
  const progressPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(progressPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(progressPulse, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => {
      pulseAnimation.stop();
      progressPulse.setValue(0);
    };
  }, [progressPulse]);

  // Scroll to prize section when modal opens via prize card tap
  useEffect(() => {
    if (showDetailsModal && scrollToPrizes) {
      const timer = setTimeout(() => {
        modalScrollViewRef.current?.scrollTo({ y: prizeSectionY.current, animated: true });
        setScrollToPrizes(false);
      }, 300); // wait for modal fade-in animation
      return () => clearTimeout(timer);
    }
  }, [showDetailsModal, scrollToPrizes]);

  // Opacity pulse for progress indicator glow (native driver compatible)
  // Resting state (value=0) is fully opaque; pulse dims to 0.6 then back
  const progressIndicatorOpacity = progressPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });

  // Loading state - show skeleton
  if (isLoading) {
    return <QuarterlyRewardsCardSkeleton />;
  }

  // Error or no drawing state
  if (error || !currentDrawing) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>
          {error || 'No active rewards program at this time.'}
        </Text>
      </View>
    );
  }

  const handleReportPress = () => {
    if (onReportPress) {
      onReportPress();
    } else {
      navigation.navigate('ReportForm');
    }
  };

  // Render prize item (for single or first prize)
  const renderPrizeItem = (prize?: Prize) => {
    if (!prize) {
      return (
        <View style={styles.prizeItem}>
          <View style={styles.prizeIllustration}>
            <GenericPrizeIllustration />
          </View>
          <View style={styles.prizeDetails}>
            <Text style={styles.prizeName}>Prize TBD</Text>
            <Text style={styles.prizeValue}>Check back soon!</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.prizeItem}>
        <View style={styles.prizeIllustration}>
          {prize.imageUrl ? (
            <Image
              source={{ uri: prize.imageUrl }}
              style={styles.prizeImage}
              contentFit="contain"
              cachePolicy="disk"
            />
          ) : (
            getPrizeIllustration(prize.category)
          )}
        </View>
        <View style={styles.prizeDetails}>
          <Text style={styles.prizeName}>{prize.name}</Text>
          <Text style={styles.prizeValue}>{prize.value}</Text>
          {prize.sponsor ? (
            <Text style={styles.prizeSponsor}>Sponsored by {prize.sponsor}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  // Details Modal
  const renderDetailsModal = () => {
    const drawingDateObj = new Date(currentDrawing.drawingDate);
    const drawingMonth = drawingDateObj.toLocaleDateString('en-US', { month: 'short' });
    const drawingDay = drawingDateObj.getDate();

    return (
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Gradient Header Banner */}
            <LinearGradient
              colors={[COLORS.navyDark, COLORS.navyLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalBanner}
            >
              <WaveBackground />
              <View style={styles.modalBannerContent}>
                {/* Top Row: Entry Status Chip (left) + Close X (right) */}
                <View style={styles.modalBannerTopRow}>
                  <View style={[
                    styles.modalStatusChip,
                    hasEnteredCurrentRaffle ? styles.modalStatusChipEntered : styles.modalStatusChipNotEntered,
                  ]}>
                    <Feather
                      name={hasEnteredCurrentRaffle ? 'check-circle' : 'alert-circle'}
                      size={14}
                      color={hasEnteredCurrentRaffle ? '#4CAF50' : '#FF9800'}
                    />
                    <Text style={[
                      styles.modalStatusChipText,
                      hasEnteredCurrentRaffle ? styles.modalStatusChipTextEntered : styles.modalStatusChipTextNotEntered,
                    ]}>
                      {hasEnteredCurrentRaffle ? "You're Entered" : 'Not Yet Entered'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowDetailsModal(false)}
                    style={styles.modalCloseX}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalBannerTitle}>{currentDrawing.name}</Text>
                <Text style={styles.modalBannerSubtitle}>
                  {currentDrawing.description}
                </Text>
              </View>
            </LinearGradient>

            <ScrollView ref={modalScrollViewRef} contentContainerStyle={styles.modalScrollContent}>

              {/* Entry Status Detail */}
              <View style={styles.modalSection}>
                <Text style={styles.modalText}>
                  {hasEnteredCurrentRaffle
                    ? `You're in the ${calculated.quarterDisplay} drawing. Good luck!`
                    : 'Tap "Enter Drawing" on the rewards card to join this quarter\'s prize drawing.'}
                </Text>
                {renderLinkedText(
                  config?.alternativeEntryText || 'No purchase or report necessary to enter.',
                  styles.modalText,
                )}
              </View>

              {/* Date Cards Row */}
              <View style={styles.modalDatesRow}>
                <View style={styles.modalDateCard}>
                  <View style={[styles.modalDateIconCircle, { backgroundColor: '#E3F2FD' }]}>
                    <Feather name="play-circle" size={18} color={COLORS.navyDark} />
                  </View>
                  <Text style={styles.modalDateLabel}>Opens</Text>
                  <Text style={styles.modalDateValue}>{formatDate(currentDrawing.startDate)}</Text>
                </View>
                <View style={styles.modalDateCard}>
                  <View style={[styles.modalDateIconCircle, { backgroundColor: '#FFF3E0' }]}>
                    <Feather name="x-circle" size={18} color={COLORS.orange} />
                  </View>
                  <Text style={styles.modalDateLabel}>Closes</Text>
                  <Text style={styles.modalDateValue}>{formatDate(currentDrawing.endDate)}</Text>
                </View>
                <View style={[styles.modalDateCard, styles.modalDateCardHighlight]}>
                  <View style={styles.modalDrawingDateBadge}>
                    <Text style={styles.modalDrawingMonth}>{drawingMonth}</Text>
                    <Text style={styles.modalDrawingDay}>{drawingDay}</Text>
                  </View>
                  <Text style={styles.modalDateLabel}>Drawing</Text>
                  <Text style={[styles.modalDateValue, { color: COLORS.navyDark, fontWeight: '700' }]}>
                    {formatDate(currentDrawing.drawingDate)}
                  </Text>
                </View>
              </View>

              {/* Prize List */}
              <View
                style={styles.modalSection}
                onLayout={(e) => { prizeSectionY.current = e.nativeEvent.layout.y; }}
              >
                <View style={styles.modalSectionHeader}>
                  <Feather name="gift" size={18} color={COLORS.navyDark} />
                  <Text style={styles.modalSectionTitle}>Prizes</Text>
                  {currentDrawing.prizes && currentDrawing.prizes.length > 0 && (
                    <View style={styles.modalPrizeCountBadge}>
                      <Text style={styles.modalPrizeCountText}>{currentDrawing.prizes.length}</Text>
                    </View>
                  )}
                </View>
                {currentDrawing.prizes && currentDrawing.prizes.length > 0 ? (
                  currentDrawing.prizes.map((prize) => (
                    prize.imageUrl ? (
                      <View key={prize.id} style={styles.modalPrizeCard}>
                        <Image
                          source={{ uri: prize.imageUrl }}
                          style={styles.modalPrizeImage}
                          contentFit="contain"
                          cachePolicy="disk"
                        />
                        <View style={styles.modalPrizeCardBody}>
                          <Text style={styles.modalPrizeCardName}>{prize.name}</Text>
                          <View style={styles.modalPrizeValueBadge}>
                            <Text style={styles.modalPrizeValueBadgeText}>{prize.value}</Text>
                          </View>
                          {prize.description ? (
                            <Text style={styles.modalPrizeCardDescription}>{prize.description}</Text>
                          ) : null}
                          {prize.sponsor ? (
                            <View style={styles.modalPrizeSponsorRow}>
                              <Feather name="heart" size={11} color={COLORS.textSecondary} />
                              <Text style={styles.modalPrizeCardSponsor}>Sponsored by {prize.sponsor}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ) : (
                      <View key={prize.id} style={styles.modalPrizeItemRow}>
                        <View style={styles.modalPrizeItemIcon}>
                          <Feather
                            name={getPrizeIcon(prize.category)}
                            size={18}
                            color={COLORS.navyDark}
                          />
                        </View>
                        <View style={styles.modalPrizeItemContent}>
                          <Text style={styles.modalPrizeItemName}>{prize.name}</Text>
                          {prize.description ? (
                            <Text style={styles.modalPrizeItemDesc}>{prize.description}</Text>
                          ) : null}
                        </View>
                        <View style={styles.modalPrizeValueBadgeSmall}>
                          <Text style={styles.modalPrizeValueBadgeSmallText}>{prize.value}</Text>
                        </View>
                      </View>
                    )
                  ))
                ) : (
                  <Text style={styles.modalText}>
                    Prizes for this quarter will be announced soon.
                  </Text>
                )}
              </View>

              {/* Eligibility */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Feather name="shield" size={18} color={COLORS.navyDark} />
                  <Text style={styles.modalSectionTitle}>Eligibility</Text>
                </View>
                <View style={styles.modalEligibilityList}>
                  {currentDrawing.eligibilityRequirements.map((req, idx) => (
                    <View key={idx} style={styles.modalEligibilityItem}>
                      <View style={styles.modalEligibilityBullet}>
                        <Feather name="check" size={12} color={COLORS.navyDark} />
                      </View>
                      <Text style={styles.modalEligibilityText}>{req}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Official Rules link */}
              <View style={styles.modalSection}>
                <TouchableOpacity
                  style={styles.officialRulesLink}
                  onPress={() => {
                    setShowDetailsModal(false);
                    setTimeout(() => setShowRulesModal(true), 250);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="View official sweepstakes rules"
                >
                  <Feather name="file-text" size={16} color={COLORS.navyDark} />
                  <Text style={styles.officialRulesLinkText}>View Official Rules</Text>
                  <Feather name="chevron-right" size={16} color={COLORS.navyDark} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDetailsModal(false)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.navyDark, COLORS.navyLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>

      </Modal>
    );
  };

  // Official Rules Modal (rendered as a top-level sibling so it doesn't conflict with the details modal)
  const renderRulesModal = () => (
    <Modal
      visible={showRulesModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowRulesModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[COLORS.navyDark, COLORS.navyLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalBanner}
          >
            <WaveBackground />
            <View style={styles.modalBannerContent}>
              <View style={styles.modalBannerTopRow}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  onPress={() => setShowRulesModal(false)}
                  style={styles.modalCloseX}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalBannerTitle}>Official Rules</Text>
              <Text style={styles.modalBannerSubtitle}>
                Fish Log Quarterly Rewards Sweepstakes
              </Text>
            </View>
          </LinearGradient>
          <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
            <Text style={styles.officialRulesBody}>
              {config?.legalDisclaimer ||
                'Official rules are temporarily unavailable. Please contact fishlogco@gmail.com for a copy of the official rules.'}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowRulesModal(false)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.navyDark, COLORS.navyLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Entry Status Tab - File folder style tab sticking up from behind */}
      <View style={[styles.entryStatusTab, { top: entryStatusDynamic.top }]}>
        <View style={[
          styles.entryStatusContent,
          {
            paddingTop: entryStatusDynamic.paddingTop,
            paddingBottom: entryStatusDynamic.paddingBottom,
          },
          hasEnteredCurrentRaffle ? styles.entryStatusEntered : styles.entryStatusNotEntered
        ]}>
          <Feather
            name={hasEnteredCurrentRaffle ? "check-circle" : "alert-circle"}
            size={13}
            color="#FFFFFF"
          />
          <Text style={styles.entryStatusText} maxFontSizeMultiplier={1.2}>
            {hasEnteredCurrentRaffle ? "Entered" : "Not Entered"}
          </Text>
        </View>
      </View>

      {/* Main Card Container */}
      <View style={styles.cardContainer}>

        {/* Hero Header */}
        <LinearGradient
          colors={[COLORS.navyDark, COLORS.navyLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroContainer}
        >
          <WaveBackground />

          <View style={styles.fishIllustrationContainer}>
            <HeroFishIllustration />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{currentDrawing.name}</Text>
            <Text style={styles.heroSubtitle}>
              Active contributors can win gear & prizes!
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {calculated.quarterDisplay} Drawing: {new Date(currentDrawing.drawingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Content Area */}
        <View style={styles.contentContainer}>

          {/* New Quarter Banner (for signed-in members who haven't entered yet) */}
          {isSignedIn && isNewQuarter && !hasEnteredCurrentRaffle && (
            <View style={styles.newQuarterBanner}>
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.newQuarterIcon}>
                <Feather name="star" size={18} color="white" />
              </View>
              <View style={styles.newQuarterContent}>
                <Text style={styles.newQuarterTitle}>New Quarter Started!</Text>
                <Text style={styles.newQuarterText}>
                  {calculated.quarterDisplay} drawing is now open. Submit a report to enter!
                </Text>
              </View>
            </View>
          )}

          {/* Entry Reminder (for signed-in members not yet entered, after new quarter acknowledged) */}
          {isSignedIn && !hasEnteredCurrentRaffle && !isNewQuarter && (
            <View style={styles.entryReminderBanner}>
              <Feather name="award" size={18} color={COLORS.navyDark} />
              <Text style={styles.entryReminderText}>
                Submit a harvest report to enter the {calculated.quarterDisplay} drawing
              </Text>
            </View>
          )}

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Quarter Progress</Text>
              <Text style={styles.daysLeft}>
                {calculated.daysRemaining === 0
                  ? 'Last day to enter!'
                  : `${calculated.daysRemaining} ${calculated.daysRemaining === 1 ? 'day' : 'days'} left!`}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[COLORS.navyDark, COLORS.navyLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${calculated.periodProgress}%` }]}
              />
              <Animated.View
                style={[
                  styles.progressIndicator,
                  {
                    left: `${calculated.periodProgress}%`,
                    opacity: progressIndicatorOpacity,
                  },
                ]}
              />
            </View>
          </View>

          {/* How It Works Row */}
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => setShowDetailsModal(true)}
          >
            <View style={styles.infoIcon}>
              <Feather name="info" size={18} color={COLORS.navyDark} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How It Works</Text>
              <Text style={styles.infoText}>
                Must be a registered user of the Fish Log Co. app.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Drawing Date Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Feather name="calendar" size={18} color={COLORS.navyDark} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Drawing Date</Text>
              <Text style={styles.infoText}>
                Winners selected at the end of each quarter.{'\n'}
                Next drawing: {calculated.formattedDrawingDate}
              </Text>
            </View>
          </View>

          {/* Prize Section — eye-catching card */}
          {(currentDrawing.prizes?.length ?? 0) > 1 ? (
            <View style={styles.prizeSectionCard}>
              <LinearGradient
                colors={['#FFECB3', '#FFFDF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <TouchableOpacity
                onPress={() => { setScrollToPrizes(true); setShowDetailsModal(true); }}
                activeOpacity={0.85}
              >
                <View style={styles.prizeSectionHeader}>
                  <View style={styles.prizeSectionHeaderPill}>
                    <Feather name="award" size={14} color={COLORS.orange} />
                    <Text style={styles.prizeSectionCardTitle}>
                      Current Quarter Prizes
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.prizeScrollContent}
              >
                {currentDrawing.prizes!.map((prize, index) => (
                  <TouchableOpacity
                    key={prize.name + index}
                    style={styles.prizeScrollItem}
                    onPress={() => { setScrollToPrizes(true); setShowDetailsModal(true); }}
                    activeOpacity={0.85}
                  >
                    {renderPrizeItem(prize)}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.prizeSectionCard}
              onPress={() => { setScrollToPrizes(true); setShowDetailsModal(true); }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FFECB3', '#FFFDF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.prizeSectionHeader}>
                <View style={styles.prizeSectionHeaderPill}>
                  <Feather name="award" size={14} color={COLORS.orange} />
                  <Text style={styles.prizeSectionCardTitle}>
                    Current Quarter Prize
                  </Text>
                </View>
              </View>
              <View style={{ paddingHorizontal: 14 }}>
                {renderPrizeItem(currentDrawing.prizes?.[0])}
              </View>
            </TouchableOpacity>
          )}

          {/* Notification Banner - only show if user hasn't added email to profile */}
          {!hasProfileEmail && (
            <TouchableOpacity
              style={styles.notificationBanner}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.navyDark, COLORS.navyLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.notificationIcon}>
                <Feather name="mail" size={18} color="white" />
              </View>
              <Text style={styles.notificationText}>
                Selected contributors will be notified via email. Make sure your account info is up to date!
              </Text>
              <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}

        </View>
      </View>

      {/* Footer CTA - Outside main card */}
      <View style={styles.footerCta}>
        <Text style={styles.footerText}>
          Report your catches to support NC fisheries data.
        </Text>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={handleReportPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.navyDark, COLORS.navyLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reportButtonGradient}
          />
          <Text style={styles.reportButtonText}>Report</Text>
          <SwimmingFishButton />
        </TouchableOpacity>
      </View>

      {renderDetailsModal()}
      {renderRulesModal()}
    </View>
  );
};

// ============================================
// COLORS
// ============================================

const COLORS = {
  navyDark: '#1E3A5F',
  navyLight: '#2D5A87',
  primary: '#1E3A5F',
  orange: '#FF8F00',
  white: '#FFFFFF',
  bgLight: '#E3EBF6',
  bgCard: '#F8FAFC',
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  border: '#f0f0f0',
};

// ============================================
// STYLES
// ============================================

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    marginTop: 20, // Extra space for the tab
  },

  // Entry Status Tab - File folder style (appears behind card)
  entryStatusTab: {
    position: 'absolute',
    top: -18,
    right: 16,
    zIndex: -1, // Behind the card
  },
  entryStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    // paddingTop/paddingBottom are applied dynamically based on font scale
    // (see QuarterlyRewardsCard component body).
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 6,
    minWidth: 120, // Wider tab
  },
  entryStatusEntered: {
    backgroundColor: '#4CAF50', // Solid green for better visibility
  },
  entryStatusNotEntered: {
    backgroundColor: '#FF9800', // Solid orange for better visibility
  },
  entryStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#FFFFFF', // White text for contrast
  },
  entryStatusTextEntered: {
    color: '#FFFFFF',
  },
  entryStatusTextNotEntered: {
    color: '#FFFFFF',
  },
  errorContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
  },
  errorText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Card Container
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    zIndex: 1, // Above the tab
    overflow: 'hidden',
  },

  // Hero Section
  heroContainer: {
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  fishIllustrationContainer: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -35 }],
  },
  heroContent: {
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Content Container
  contentContainer: {
    padding: 16,
  },

  // Progress Section
  progressSection: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  daysLeft: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navyDark,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.bgLight,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressIndicator: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.orange,
    borderWidth: 2.5,
    borderColor: COLORS.orange, // Static color; opacity is animated instead
    marginLeft: -6,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoIcon: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Prize Section
  prizeSectionCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  prizeSectionHeader: {
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  prizeSectionHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,143,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  prizeSectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  // Legacy — used in modal
  prizeSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  prizeSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  prizeScrollContent: {
    gap: 10,
    paddingVertical: 2,
  },
  prizeScrollItem: {
    width: 220,
  },
  prizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    padding: 12,
  },
  prizeIllustration: {
    width: 68,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  prizeImage: {
    width: 68,
    height: 58,
    borderRadius: 10,
  },
  prizeDetails: {
    flex: 1,
  },
  prizeName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  prizeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.orange,
  },
  prizeSponsor: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Notification Banner
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    overflow: 'hidden',
  },
  notificationIcon: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.white,
    lineHeight: 17,
  },

  // Footer CTA
  footerCta: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
    paddingRight: 12,
    lineHeight: 18,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 45,
    overflow: 'visible',
    shadowColor: COLORS.navyDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  reportButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    zIndex: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },

  // Modal Banner Header
  modalBanner: {
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  modalBannerContent: {
    zIndex: 1,
  },
  modalBannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  modalBannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 14,
  },
  modalBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalCloseX: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  modalStatusChipEntered: {
    backgroundColor: 'rgba(76,175,80,0.2)',
  },
  modalStatusChipNotEntered: {
    backgroundColor: 'rgba(255,152,0,0.25)',
  },
  modalStatusChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalStatusChipTextEntered: {
    color: '#81C784',
  },
  modalStatusChipTextNotEntered: {
    color: '#FFB74D',
  },

  modalScrollContent: {
    padding: 18,
  },
  modalSection: {
    marginBottom: 22,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  modalSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  modalText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },

  // Date Cards
  modalDatesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  modalDateCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalDateCardHighlight: {
    borderColor: COLORS.navyDark,
    borderWidth: 1.5,
    backgroundColor: '#F0F5FA',
  },
  modalDateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDrawingDateBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.navyDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDrawingMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDrawingDay: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: -2,
  },
  modalDateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  modalDateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Prize Count Badge
  modalPrizeCountBadge: {
    backgroundColor: COLORS.navyDark,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPrizeCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Prize Cards (with image)
  modalPrizeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalPrizeImage: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.bgCard,
  },
  modalPrizeCardBody: {
    padding: 14,
  },
  modalPrizeCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  modalPrizeValueBadge: {
    backgroundColor: '#FFF3E0',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalPrizeValueBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.orange,
  },
  modalPrizeCardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 6,
  },
  modalPrizeSponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  modalPrizeCardSponsor: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Prize Item Rows (no image)
  modalPrizeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalPrizeItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E3EBF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalPrizeItemContent: {
    flex: 1,
  },
  modalPrizeItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalPrizeItemDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalPrizeValueBadgeSmall: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  modalPrizeValueBadgeSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.orange,
  },

  // Eligibility
  modalEligibilityList: {
    gap: 6,
  },
  modalEligibilityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modalEligibilityBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E3EBF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  modalEligibilityText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  officialRulesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F0F4FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E2EF',
  },
  officialRulesLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navyDark,
  },
  officialRulesBody: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  modalButton: {
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },

  // New Quarter Banner
  newQuarterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  newQuarterIcon: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newQuarterContent: {
    flex: 1,
  },
  newQuarterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  newQuarterText: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
  },

  // Entry Reminder Banner (non-interactive)
  entryReminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  entryReminderText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.navyDark,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Enter Drawing Button
  enterDrawingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  enterDrawingText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navyDark,
    flex: 1,
  },

  // Eligibility Badge (Modal)
  eligibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  eligibilityBadgeInactive: {
    backgroundColor: '#FFF3E0',
  },
  eligibilityBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  eligibilityBadgeTextInactive: {
    color: '#FF9800',
  },
});

export default React.memo(QuarterlyRewardsCard);
