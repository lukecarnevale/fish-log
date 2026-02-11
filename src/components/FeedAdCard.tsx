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
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../styles/common';
import { Advertisement } from '../services/transformers/advertisementTransformer';
import { trackAdClick, trackAdImpression } from '../services/advertisementsService';
import CatchInfoBadge from './CatchInfoBadge';

interface FeedAdCardProps {
  ad: Advertisement;
  /** Set of ad IDs already tracked for impressions this session */
  trackedImpressions?: Set<string>;
}

const FeedAdCard: React.FC<FeedAdCardProps> = ({ ad, trackedImpressions }) => {
  // Track impression once when the card mounts (becomes visible)
  const hasTracked = useRef(false);
  useEffect(() => {
    if (!hasTracked.current && (!trackedImpressions || !trackedImpressions.has(ad.id))) {
      hasTracked.current = true;
      trackedImpressions?.add(ad.id);
      trackAdImpression(ad.id);
    }
  }, [ad.id, trackedImpressions]);

  const handlePress = useCallback(async () => {
    trackAdClick(ad.id);
    try {
      const canOpen = await Linking.canOpenURL(ad.linkUrl);
      if (canOpen) {
        await Linking.openURL(ad.linkUrl);
      }
    } catch {
      // Silently ignore
    }
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
          cachePolicy="memory-disk"
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
            <Feather name="shopping-bag" size={16} color={colors.white} />
          </View>
          <View style={styles.topTextContainer}>
            <Text style={styles.companyName}>{ad.companyName}</Text>
            <Text style={styles.sponsoredLabel}>Sponsored</Text>
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
          <Text style={styles.promoText} numberOfLines={2}>
            {ad.promoText}
          </Text>
          {ad.promoCode && (
            <View style={styles.promoCodeBadge}>
              <Feather name="tag" size={11} color={colors.primary} />
              <Text style={styles.promoCodeText}>{ad.promoCode}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handlePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="external-link" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Card container - matches CatchCard exactly
  container: {
    backgroundColor: colors.white,
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginVertical: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },

  // Photo section - same 220px as CatchCard
  photoContainer: {
    width: '100%',
    height: 220,
    backgroundColor: colors.lightestGray,
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
    color: colors.white,
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
    color: colors.textPrimary,
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
    color: colors.primary,
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
