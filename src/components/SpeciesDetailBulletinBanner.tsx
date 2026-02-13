// components/SpeciesDetailBulletinBanner.tsx
//
// Full-width banner shown at the top of species detail view.
// Color-coded by bulletin type, with "View Details" CTA that opens BulletinModal.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, borderRadius, spacing, shadows } from '../styles/common';
import BulletinModal from './BulletinModal';
import type { Bulletin, BulletinType } from '../types/bulletin';

// =============================================================================
// Type configuration per bulletin type (matches BulletinModal pattern)
// =============================================================================

const BANNER_CONFIG: Record<BulletinType, {
  backgroundColor: string;
  borderColor: string;
  iconName: keyof typeof Feather.glyphMap;
  label: string;
}> = {
  closure: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.error,
    iconName: 'alert-octagon',
    label: 'CLOSURE',
  },
  advisory: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
    iconName: 'alert-triangle',
    label: 'ADVISORY',
  },
  educational: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    iconName: 'book-open',
    label: 'NOTICE',
  },
  info: {
    backgroundColor: colors.lightestGray,
    borderColor: colors.secondary,
    iconName: 'info',
    label: 'INFO',
  },
};

// =============================================================================
// Component
// =============================================================================

interface SpeciesDetailBulletinBannerProps {
  /** Bulletins linked to this species, sorted by priority. */
  bulletins: Bulletin[];
  /** Called when the banner is dismissed (session only). */
  onDismiss?: () => void;
}

export const SpeciesDetailBulletinBanner: React.FC<
  SpeciesDetailBulletinBannerProps
> = ({ bulletins, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null);
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (bulletins.length > 0 && !dismissed) {
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [bulletins, dismissed, entranceAnim]);

  if (bulletins.length === 0 || dismissed) return null;

  // Show the most urgent bulletin first
  const primaryBulletin = bulletins[0];
  const config = BANNER_CONFIG[primaryBulletin.bulletinType] ?? BANNER_CONFIG.info;
  const iconColor =
    primaryBulletin.bulletinType === 'closure'
      ? colors.error
      : primaryBulletin.bulletinType === 'advisory'
        ? colors.warning
        : colors.primary;

  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  const handleDismiss = () => {
    Animated.timing(entranceAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
      onDismiss?.();
    });
  };

  const handleViewDetails = () => {
    setSelectedBulletin(primaryBulletin);
  };

  const handleModalClose = () => {
    setSelectedBulletin(null);
  };

  // handleDismiss is intentionally not called from modal —
  // permanent dismissal is handled by the BulletinModal's "Don't show again" button

  return (
    <>
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: config.backgroundColor,
            borderLeftColor: config.borderColor,
            opacity: entranceAnim,
            transform: [{ translateY }],
          },
        ]}
        accessibilityRole="alert"
        accessibilityLabel={`${config.label}: ${primaryBulletin.title}`}
      >
        {/* Icon + Content */}
        <View style={styles.content}>
          <Feather name={config.iconName} size={20} color={iconColor} />
          <View style={styles.textContent}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: iconColor }]}>
                {config.label}
              </Text>
              {bulletins.length > 1 && (
                <Text style={styles.moreCount}>
                  +{bulletins.length - 1} more
                </Text>
              )}
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {primaryBulletin.title}
            </Text>
            {primaryBulletin.description && (
              <Text style={styles.description} numberOfLines={1}>
                {primaryBulletin.description}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={handleViewDetails}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewButtonText, { color: iconColor }]}>
              View Details
            </Text>
            <Feather name="chevron-right" size={14} color={iconColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={16} color={colors.darkGray} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* BulletinModal — reuses existing modal component */}
      <BulletinModal
        visible={selectedBulletin !== null}
        bulletin={selectedBulletin}
        onClose={handleModalClose}
        onDismiss={() => {
          handleModalClose();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 0,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    padding: spacing.sm,
    ...shadows.small,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  textContent: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  moreCount: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.darkGray,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    color: colors.darkGray,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingLeft: 32, // Align with text content (icon width + gap)
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
});

export default SpeciesDetailBulletinBanner;
