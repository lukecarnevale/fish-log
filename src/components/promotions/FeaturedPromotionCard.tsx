// components/promotions/FeaturedPromotionCard.tsx
//
// Large hero-style featured promotion card for the top of the Promotions Hub.
// Full-width with gradient overlay and premium styling.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../styles/common';
import type { Advertisement } from '../../services/transformers/advertisementTransformer';
import { getCategoryLabel } from '../../services/promotionsService';
import { getRegionLabel } from '../../constants/regionOptions';
import { isValidUrl } from '../../utils/urlValidation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeaturedPromotionCardProps {
  promotion: Advertisement;
  localImage?: any;
  onPress?: (promotion: Advertisement) => void;
}

const FeaturedPromotionCard: React.FC<FeaturedPromotionCardProps> = ({
  promotion,
  localImage,
  onPress,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(promotion);
    } else if (promotion.linkUrl && isValidUrl(promotion.linkUrl)) {
      Linking.openURL(promotion.linkUrl);
    } else if (promotion.linkUrl) {
      console.warn('Blocked unsafe featured promotion URL:', promotion.linkUrl);
    }
  };

  const imageSource = localImage
    ? localImage
    : promotion.imageUrl
    ? { uri: promotion.imageUrl }
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Featured promotion: ${promotion.companyName}. ${promotion.description || promotion.promoText}`}
      accessibilityHint="Double tap to view deal"
    >
      {/* Background image */}
      {imageSource && (
        <Image
          source={imageSource}
          style={styles.backgroundImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={300}
        />
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(6, 58, 93, 0.15)',
          'rgba(6, 58, 93, 0.5)',
          'rgba(6, 58, 93, 0.85)',
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Featured badge */}
      <View style={styles.featuredBadge}>
        <Feather name="star" size={10} color={colors.white} />
        <Text style={styles.featuredBadgeText}>Featured</Text>
      </View>

      {/* Content overlay (bottom) */}
      <View style={styles.contentOverlay}>
        {/* Category + area row */}
        <View style={styles.metaRow}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>
              {getCategoryLabel(promotion.category)}
            </Text>
          </View>
          {promotion.areaCodes.length > 0 && (
            <View style={styles.areaChip}>
              <Feather name="map-pin" size={10} color="rgba(255,255,255,0.9)" />
              <Text style={styles.areaChipText}>
                {getRegionLabel(promotion.areaCodes[0])}
              </Text>
            </View>
          )}
        </View>

        {/* Company name */}
        <Text style={styles.companyName}>{promotion.companyName}</Text>

        {/* Promo text */}
        <Text style={styles.promoText} numberOfLines={2}>
          {promotion.description || promotion.promoText}
        </Text>

        {/* Bottom row: promo code + CTA */}
        <View style={styles.bottomRow}>
          {promotion.promoCode && (
            <View style={styles.promoCodeBadge}>
              <Text style={styles.promoCodeLabel}>Code: </Text>
              <Text style={styles.promoCodeValue}>{promotion.promoCode}</Text>
            </View>
          )}
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>View Deal</Text>
            <Feather name="arrow-right" size={14} color={colors.white} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
    ...shadows.medium,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 127, 37, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  areaChipText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  companyName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  promoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  promoCodeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  promoCodeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    gap: 6,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
});

export default FeaturedPromotionCard;
