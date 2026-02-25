// components/promotions/PromotionCard.tsx
//
// Business-card style promotion card for the grid layout in the Promotions Hub.
// Designed to feel premium — pearl white with subtle depth, clean typography.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../styles/common';
import type { Advertisement } from '../../services/transformers/advertisementTransformer';
import { getCategoryIcon, getCategoryLabel } from '../../services/promotionsService';
import { getRegionLabel } from '../../constants/regionOptions';
import { isValidUrl } from '../../utils/urlValidation';

interface PromotionCardProps {
  promotion: Advertisement;
  /** Local image source for offline/fallback ads */
  localImage?: any;
  onPress?: (promotion: Advertisement) => void;
}

/** Generate a consistent background color from company name */
function getInitialsColor(name: string): string {
  const hues = ['#0B548B', '#06747F', '#FF7F25', '#2E7D32', '#5C6BC0', '#8E24AA'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hues[Math.abs(hash) % hues.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

const PromotionCard: React.FC<PromotionCardProps> = ({
  promotion,
  localImage,
  onPress,
}) => {
  const [imageError, setImageError] = useState(false);
  const handleImageError = useCallback(() => setImageError(true), []);

  const handlePress = () => {
    if (onPress) {
      onPress(promotion);
    } else if (promotion.linkUrl && isValidUrl(promotion.linkUrl)) {
      Linking.openURL(promotion.linkUrl);
    } else if (promotion.linkUrl) {
      console.warn('Blocked unsafe promotion URL:', promotion.linkUrl);
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
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${promotion.companyName}: ${promotion.promoText}`}
      accessibilityHint="Double tap to open promotion"
    >
      {/* Image or placeholder */}
      <View style={styles.imageContainer}>
        {imageSource && !imageError ? (
          <>
            <Image
              source={imageSource}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
              onError={handleImageError}
            />
            {/* Badge overlay */}
            {promotion.badgeText && (
              <View style={styles.badgeOverlay}>
                <Text style={styles.badgeText}>{promotion.badgeText}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: getInitialsColor(promotion.companyName) }]}>
            <Text style={styles.placeholderInitials}>
              {getInitials(promotion.companyName)}
            </Text>
            {promotion.badgeText && (
              <View style={styles.badgeOverlay}>
                <Text style={styles.badgeText}>{promotion.badgeText}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Category pill */}
        <View style={styles.categoryRow}>
          <View style={styles.categoryPill}>
            <Feather
              name={getCategoryIcon(promotion.category) as any}
              size={10}
              color={colors.secondary}
            />
            <Text style={styles.categoryText}>
              {getCategoryLabel(promotion.category)}
            </Text>
          </View>
        </View>

        {/* Company name */}
        <Text style={styles.companyName} numberOfLines={1}>
          {promotion.companyName}
        </Text>

        {/* Promo text */}
        <Text style={styles.promoText} numberOfLines={2}>
          {promotion.promoText}
        </Text>

        {/* Bottom row: area + promo code */}
        <View style={styles.bottomRow}>
          {promotion.areaCodes.length > 0 && (
            <View style={styles.areaBadge}>
              <Feather name="map-pin" size={9} color={colors.darkGray} />
              <Text style={styles.areaText} numberOfLines={1}>
                {getRegionLabel(promotion.areaCodes[0])}
              </Text>
            </View>
          )}

          {promotion.promoCode && (
            <View style={styles.promoCodeBadge}>
              <Text style={styles.promoCodeText}>{promotion.promoCode}</Text>
            </View>
          )}
        </View>
      </View>

      {/* External link indicator */}
      <View style={styles.linkIndicator}>
        <Feather name="external-link" size={12} color={colors.mediumGray} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.pearlWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.85)',
    borderLeftColor: 'rgba(255, 255, 255, 0.85)',
    borderRightColor: 'rgba(6, 58, 93, 0.10)',
    borderBottomColor: 'rgba(6, 58, 93, 0.15)',
    overflow: 'hidden',
    ...shadows.small,
  },
  imageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: colors.lightestGray,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 116, 127, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    gap: 3,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 3,
  },
  promoText: {
    fontSize: 12,
    color: colors.darkGray,
    lineHeight: 16,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  areaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  areaText: {
    fontSize: 10,
    color: colors.darkGray,
  },
  promoCodeBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  promoCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  linkIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
});

export default PromotionCard;
