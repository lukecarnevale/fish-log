// components/AdvertisementBanner.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../styles/common';
import {
  Advertisement as RemoteAdvertisement,
  fetchAdvertisements,
  trackAdClick,
  trackAdImpression,
  AdPlacement,
} from '../services/advertisementsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12; // Gap between cards
const CARD_MARGIN = spacing.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const SNAP_WIDTH = CARD_WIDTH + CARD_GAP; // Width including gap for snapping

// Auto-rotation interval in milliseconds
const AUTO_ROTATE_INTERVAL = 5000;

// Impression tracking: minimum time (ms) before the same ad can count as a new
// impression. Prevents rapid screen-switching from inflating counts.
const IMPRESSION_COOLDOWN_MS = 30_000; // 30 seconds

// IAB/MRC viewability standard: ad must be on-screen for at least 1 continuous
// second before it counts as a valid impression.
const VIEWABILITY_THRESHOLD_MS = 1_000; // 1 second

/**
 * Display ad type — all ads come from Supabase.
 */
interface DisplayAd {
  id: string;
  companyName: string;
  promoText: string;
  promoCode?: string;
  linkUrl: string;
  imageUrl: string;
}

interface AdvertisementBannerProps {
  // Optional: placement location to fetch ads for
  placement?: AdPlacement;
  // Optional: callback when ad is pressed
  onPress?: (ad: DisplayAd) => void;
  // Optional: disable auto-rotation
  autoRotate?: boolean;
}

/**
 * Convert remote advertisement to display format.
 */
function toDisplayAd(ad: RemoteAdvertisement): DisplayAd {
  return {
    id: ad.id,
    companyName: ad.companyName,
    promoText: ad.promoText,
    promoCode: ad.promoCode,
    linkUrl: ad.linkUrl,
    imageUrl: ad.imageUrl,
  };
}

const AdvertisementBanner: React.FC<AdvertisementBannerProps> = ({
  placement,
  onPress,
  autoRotate = true,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const autoRotateTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isJumping = useRef(false);

  // State for fetched ads
  const [fetchedAds, setFetchedAds] = useState<DisplayAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Screen focus state — used to only track impressions when the user can
  // actually see the banner (not when the screen is behind another in the stack).
  const isFocused = useIsFocused();

  // Map of adId → timestamp of last recorded impression. Using a time-based
  // approach (instead of a simple Set) lets us re-count impressions on return
  // visits while still deduplicating rapid-fire events.
  const impressionTimestamps = useRef(new Map<string, number>());

  // Timer handle for the IAB 1-second viewability threshold
  const viewabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch ads from Supabase (returns empty when offline)
  useEffect(() => {
    const loadAds = async () => {
      setIsLoading(true);
      try {
        const { advertisements } = await fetchAdvertisements(placement);
        setFetchedAds(advertisements.map(toDisplayAd));
      } catch (error) {
        console.warn('Failed to fetch ads:', error);
        setFetchedAds([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAds();
  }, [placement]);

  // Get ads to display
  const originalAds: DisplayAd[] = fetchedAds;

  // Create circular array: [last, ...original, first] for infinite scroll
  // Only do this if we have more than 1 ad
  const ads = originalAds.length > 1
    ? [originalAds[originalAds.length - 1], ...originalAds, originalAds[0]]
    : originalAds;

  const isCircular = originalAds.length > 1;

  // Scroll to initial position (index 1 for circular, 0 for single)
  useEffect(() => {
    if (originalAds.length === 0) return;
    if (isCircular && scrollViewRef.current) {
      // Start at index 1 (first real item) without animation
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: SNAP_WIDTH,
          animated: false,
        });
      }, 50);
    }
  }, [isCircular, originalAds.length]);

  // Start auto-rotation timer
  const startAutoRotate = useCallback(() => {
    if (!autoRotate || originalAds.length <= 1) return;

    // Clear any existing timer
    if (autoRotateTimer.current) {
      clearInterval(autoRotateTimer.current);
    }

    autoRotateTimer.current = setInterval(() => {
      if (!isUserScrolling && !isJumping.current) {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % originalAds.length;
          const scrollIndex = isCircular ? nextIndex + 1 : nextIndex;
          scrollViewRef.current?.scrollTo({
            x: scrollIndex * SNAP_WIDTH,
            animated: true,
          });
          return nextIndex;
        });
      }
    }, AUTO_ROTATE_INTERVAL);
  }, [autoRotate, originalAds.length, isUserScrolling, isCircular]);

  // Stop auto-rotation timer
  const stopAutoRotate = useCallback(() => {
    if (autoRotateTimer.current) {
      clearInterval(autoRotateTimer.current);
      autoRotateTimer.current = null;
    }
  }, []);

  // Setup auto-rotation on mount
  useEffect(() => {
    if (originalAds.length === 0) return;
    startAutoRotate();
    return () => stopAutoRotate();
  }, [startAutoRotate, stopAutoRotate, originalAds.length]);

  // Restart auto-rotation when user stops scrolling
  useEffect(() => {
    if (originalAds.length === 0) return;
    if (!isUserScrolling) {
      startAutoRotate();
    }
  }, [isUserScrolling, startAutoRotate, originalAds.length]);

  // Clear cooldown timestamps when the screen regains focus so that returning
  // to the home screen counts as a fresh set of impressions (standard behavior
  // in top ad-supported apps like YouTube, Instagram, etc.).
  useEffect(() => {
    if (isFocused) {
      impressionTimestamps.current.clear();
    }
  }, [isFocused]);

  // Track impression with IAB viewability: the ad must be visible (screen
  // focused) for at least VIEWABILITY_THRESHOLD_MS continuous seconds, and the
  // same ad can't be re-counted within IMPRESSION_COOLDOWN_MS.
  useEffect(() => {
    // Cancel any pending viewability timer when deps change
    if (viewabilityTimer.current) {
      clearTimeout(viewabilityTimer.current);
      viewabilityTimer.current = null;
    }

    if (originalAds.length === 0 || !isFocused) return;

    const currentAd = originalAds[currentIndex];
    if (!currentAd) return;

    // Start the 1-second viewability timer
    viewabilityTimer.current = setTimeout(() => {
      const now = Date.now();
      const lastTracked = impressionTimestamps.current.get(currentAd.id);

      if (!lastTracked || (now - lastTracked) > IMPRESSION_COOLDOWN_MS) {
        impressionTimestamps.current.set(currentAd.id, now);
        trackAdImpression(currentAd.id);
      }
    }, VIEWABILITY_THRESHOLD_MS);

    return () => {
      if (viewabilityTimer.current) {
        clearTimeout(viewabilityTimer.current);
        viewabilityTimer.current = null;
      }
    };
  }, [currentIndex, originalAds, isFocused]);

  // Don't render if loading or no ads available
  if (isLoading || originalAds.length === 0) {
    return null;
  }

  const handlePress = async (ad: DisplayAd) => {
    trackAdClick(ad.id);

    if (onPress) {
      onPress(ad);
    } else {
      try {
        const canOpen = await Linking.canOpenURL(ad.linkUrl);
        if (canOpen) {
          await Linking.openURL(ad.linkUrl);
        }
      } catch {
        // Silently ignore - URL was likely opened successfully
      }
    }
  };

  const handleScrollBegin = () => {
    setIsUserScrolling(true);
    stopAutoRotate();
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isJumping.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const scrollIndex = Math.round(offsetX / SNAP_WIDTH);

    if (isCircular) {
      // Handle circular scrolling
      if (scrollIndex === 0) {
        // Scrolled to the cloned last item (at beginning)
        // Jump to the real last item
        isJumping.current = true;
        const realLastIndex = originalAds.length;
        scrollViewRef.current?.scrollTo({
          x: realLastIndex * SNAP_WIDTH,
          animated: false,
        });
        setCurrentIndex(originalAds.length - 1);
        setTimeout(() => {
          isJumping.current = false;
        }, 50);
      } else if (scrollIndex === ads.length - 1) {
        // Scrolled to the cloned first item (at end)
        // Jump to the real first item
        isJumping.current = true;
        scrollViewRef.current?.scrollTo({
          x: SNAP_WIDTH,
          animated: false,
        });
        setCurrentIndex(0);
        setTimeout(() => {
          isJumping.current = false;
        }, 50);
      } else {
        // Normal scroll within bounds
        setCurrentIndex(scrollIndex - 1);
      }
    } else {
      setCurrentIndex(Math.max(0, Math.min(scrollIndex, originalAds.length - 1)));
    }

    // Restart auto-rotation after a delay
    setTimeout(() => {
      setIsUserScrolling(false);
    }, 1000);
  };

  const renderAdImage = (ad: DisplayAd) => {
    return (
      <ExpoImage
        source={{ uri: ad.imageUrl }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />
    );
  };

  const renderAd = (ad: DisplayAd, index: number) => (
    <TouchableOpacity
      key={`${ad.id}-${index}`}
      style={[
        styles.adCard,
        index < ads.length - 1 && { marginRight: CARD_GAP },
      ]}
      onPress={() => handlePress(ad)}
      activeOpacity={0.9}
    >
      {/* Ad Image */}
      {renderAdImage(ad)}

      {/* Overlay with company info and promo */}
      <View style={styles.overlay}>
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.companyName}>{ad.companyName}</Text>
            <Text style={styles.promoText}>{ad.promoText}</Text>
            {ad.promoCode && (
              <Text style={styles.promoCodeText}>
                Use code: <Text style={styles.promoCode}>{ad.promoCode}</Text>
              </Text>
            )}
          </View>
          <View style={styles.ctaContainer}>
            <Feather name="external-link" size={16} color={colors.white} />
          </View>
        </View>
      </View>

      {/* Sponsored label */}
      <View style={styles.sponsoredBadge}>
        <Text style={styles.sponsoredText}>Sponsored</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPaginationDots = () => {
    if (originalAds.length <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        {originalAds.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SNAP_WIDTH}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
      >
        {ads.map((ad, index) => renderAd(ad, index))}
      </ScrollView>
      {renderPaginationDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: CARD_MARGIN,
  },
  adCard: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 160,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  companyName: {
    ...typography.subtitle,
    color: colors.white,
    fontWeight: '700',
    marginBottom: 2,
  },
  promoText: {
    ...typography.bodySmall,
    color: colors.white,
    opacity: 0.9,
  },
  promoCodeText: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.85,
    marginTop: 4,
  },
  promoCode: {
    fontWeight: '700',
    color: '#FFD700',
  },
  ctaContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  sponsoredText: {
    ...typography.caption,
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  paginationDotActive: {
    backgroundColor: colors.primary,
    width: 20,
  },
});

export default AdvertisementBanner;
