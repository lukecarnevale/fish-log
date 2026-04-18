// components/FeedAdCard.tsx
//
// In-feed advertisement card for the catch feed.
// Visually matches CatchCard styling (same dimensions, shadows, border radius)
// but displays sponsored content instead of catch data.

import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { spacing } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { Advertisement } from '../services/transformers/advertisementTransformer';
import { trackAdClick, trackAdImpression } from '../services/advertisementsService';
import CatchInfoBadge from './CatchInfoBadge';
import { safeOpenURL } from '../utils/openURL';

// IAB/MRC viewability: ad must be on-screen 1 second before counting
const VIEWABILITY_THRESHOLD_MS = 1_000;

interface FeedAdCardProps {
  ad: Advertisement;
  /** Map of ad IDs → last impression timestamp for cooldown deduplication */
  trackedImpressions?: Map<string, number>;
}

const IMPRESSION_COOLDOWN_MS = 30_000; // 30 seconds

const FeedAdCard: React.FC<FeedAdCardProps> = ({ ad, trackedImpressions }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isFocused = useIsFocused();
  const viewabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track impression with 1-second viewability threshold and cooldown
  useEffect(() => {
    if (viewabilityTimer.current) {
      clearTimeout(viewabilityTimer.current);
      viewabilityTimer.current = null;
    }

    if (!isFocused) return;

    viewabilityTimer.current = setTimeout(() => {
      const now = Date.now();
      const lastTracked = trackedImpressions?.get(ad.id);

      if (!lastTracked || (now - lastTracked) > IMPRESSION_COOLDOWN_MS) {
        trackedImpressions?.set(ad.id, now);
        trackAdImpression(ad.id);
      }
    }, VIEWABILITY_THRESHOLD_MS);

    return () => {
      if (viewabilityTimer.current) {
        clearTimeout(viewabilityTimer.current);
      }
    };
  }, [ad.id, trackedImpressions, isFocused]);

  const handlePress = useCallback(() => {
    trackAdClick(ad.id);
    safeOpenURL(ad.linkUrl);
  }, [ad.id, ad.linkUrl]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.97}
    >
      {/* Image section with overlays - matches CatchCard 220px height */}
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: ad.imageUrl }}
          style={styles.photo}
          contentFit="cover"
          transition={300}
          cachePolicy="disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          placeholderContentFit="cover"
        />

        {/* Top gradient overlay */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.45)', 'transparent']}
          style={styles.topGradient}
        />

        {/* Company info overlay at top (matches angler section position) */}
        <View style={styles.topOverlay}>
          <View style={styles.companyIconContainer}>
            <Feather name="shopping-bag" size={16} color={theme.colors.textOnPrimary} />
          </View>
          <View style={styles.topTextContainer}>
            <Text style={styles.companyName} numberOfLines={1} maxFontSizeMultiplier={1.2}>{ad.companyName}</Text>
            <Text style={styles.sponsoredLabel} maxFontSizeMultiplier={1.15}>Sponsored</Text>
          </View>
        </View>

        {/* Bottom gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.55)']}
          style={styles.photoGradient}
        />

        {/* Bottom badges */}
        <View style={styles.infoOverlay}>
          <View style={styles.infoSpacer} />
          {ad.location && (
            <CatchInfoBadge
              text={ad.location}
              variant="location"
            />
          )}
        </View>
      </View>

      {/* Bottom section - promo text + CTA */}
      <View style={styles.bottomSection}>
        <View style={styles.promoRow}>
          <Text style={styles.promoText} numberOfLines={2} maxFontSizeMultiplier={1.2}>
            {ad.promoText}
          </Text>
          {ad.promoCode && (
            <View style={styles.promoCodeBadge}>
              <Feather name="tag" size={11} color={theme.colors.primary} />
              <Text style={styles.promoCodeText} maxFontSizeMultiplier={1.15}>{ad.promoCode}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handlePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="external-link" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  // Card container - matches CatchCard exactly
  container: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginVertical: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },

  // Photo section - Instagram-style 4:5 portrait ratio (matches CatchCard)
  photoContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: theme.colors.lightestGray,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },

  // Top gradient and company overlay (same position as angler info in CatchCard)
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  topTextContainer: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textOnPrimary,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sponsoredLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Info overlay at bottom of image (matches CatchCard)
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoSpacer: {
    flex: 1,
  },

  // Bottom section - matches CatchCard paddingHorizontal/paddingVertical
  bottomSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  promoText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  promoCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 84, 139, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  promoCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.3,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
});

const arePropsEqual = (prevProps: FeedAdCardProps, nextProps: FeedAdCardProps): boolean => {
  return prevProps.ad.id === nextProps.ad.id;
};

export default memo(FeedAdCard, arePropsEqual);
