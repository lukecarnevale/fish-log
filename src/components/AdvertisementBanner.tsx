// components/AdvertisementBanner.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../styles/common';
import { Advertisement, getActiveAdvertisements } from '../data/advertisementsData';

interface AdvertisementBannerProps {
  // Optional: pass a specific ad, otherwise shows first active ad
  advertisement?: Advertisement;
  // Optional: show a specific ad by ID
  advertisementId?: string;
  // Optional: callback when ad is pressed
  onPress?: (ad: Advertisement) => void;
}

const AdvertisementBanner: React.FC<AdvertisementBannerProps> = ({
  advertisement,
  advertisementId,
  onPress,
}) => {
  // Get the ad to display
  const getAdToDisplay = (): Advertisement | null => {
    if (advertisement) {
      return advertisement;
    }

    const activeAds = getActiveAdvertisements();

    if (advertisementId) {
      return activeAds.find((ad) => ad.id === advertisementId) || null;
    }

    // Return the first active ad (highest priority)
    return activeAds.length > 0 ? activeAds[0] : null;
  };

  const ad = getAdToDisplay();

  // Don't render if no ad is available
  if (!ad) {
    return null;
  }

  const handlePress = async () => {
    if (onPress) {
      onPress(ad);
    } else {
      // Default behavior: open the link
      try {
        const canOpen = await Linking.canOpenURL(ad.linkUrl);
        if (canOpen) {
          await Linking.openURL(ad.linkUrl);
        }
      } catch {
        // Silently ignore - URL was likely opened successfully
        // but the promise rejected due to app losing focus
      }
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Ad Image */}
      <Image
        source={ad.image}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Overlay with company info and promo */}
      <View style={styles.overlay}>
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.companyName}>{ad.companyName}</Text>
            <Text style={styles.promoText}>{ad.promoText}</Text>
            {ad.promoCode && (
              <Text style={styles.promoCodeText}>
                Use promo code: <Text style={styles.promoCode}>{ad.promoCode}</Text> on checkout
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
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
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
});

export default AdvertisementBanner;
