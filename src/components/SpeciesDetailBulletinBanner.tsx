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
import { borderRadius, spacing, shadows } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { useBulletins } from '../contexts/BulletinContext';
import type { Bulletin, BulletinType } from '../types/bulletin';
import { getBulletinTypeConfig } from '../constants/bulletin';
import { WaveAccent, WAVE_PRESETS } from './WaveAccent';

const BANNER_WAVE_MAP: Record<BulletinType, typeof WAVE_PRESETS[keyof typeof WAVE_PRESETS]> = {
  closure: WAVE_PRESETS.error,
  advisory: WAVE_PRESETS.warning,
  educational: WAVE_PRESETS.primary,
  info: WAVE_PRESETS.info,
};

// Banner-specific background/border colors (design system tokens, not parchment palette)
const getBannerStyleConfig = (themeColors: Theme['colors']): Record<BulletinType, {
  backgroundColor: string;
  borderColor: string;
}> => ({
  closure: { backgroundColor: themeColors.dangerLight, borderColor: themeColors.error },
  advisory: { backgroundColor: themeColors.warningLight, borderColor: themeColors.warning },
  educational: { backgroundColor: themeColors.primaryLight, borderColor: themeColors.primary },
  info: { backgroundColor: themeColors.lightestGray, borderColor: themeColors.secondary },
});

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
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { showBulletinDetail } = useBulletins();
  const [dismissed, setDismissed] = useState(false);
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
  const typeConfig = getBulletinTypeConfig(theme)[primaryBulletin.bulletinType];
  const bannerStyle = getBannerStyleConfig(theme.colors)[primaryBulletin.bulletinType];
  const iconColor = typeConfig.color;

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
    showBulletinDetail(primaryBulletin);
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: bannerStyle.backgroundColor,
          opacity: entranceAnim,
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`${typeConfig.label}: ${primaryBulletin.title}`}
    >
      {/* Icon + Content */}
      <View style={styles.content}>
        <Feather name={typeConfig.icon} size={20} color={iconColor} />
        <View style={styles.textContent}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: iconColor }]} maxFontSizeMultiplier={1.15}>
              {typeConfig.label}
            </Text>
            {bulletins.length > 1 && (
              <Text style={styles.moreCount} maxFontSizeMultiplier={1.15}>
                +{bulletins.length - 1} more
              </Text>
            )}
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {primaryBulletin.title}
          </Text>
          {primaryBulletin.description && (
            <Text style={styles.description} numberOfLines={1} maxFontSizeMultiplier={1.2}>
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
          <Text style={[styles.viewButtonText, { color: iconColor }]} maxFontSizeMultiplier={1.2}>
            View Details
          </Text>
          <Feather name="chevron-right" size={14} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={16} color={theme.colors.darkGray} />
        </TouchableOpacity>
      </View>
      <WaveAccent {...(BANNER_WAVE_MAP[primaryBulletin.bulletinType] ?? WAVE_PRESETS.primary)} />
    </Animated.View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  banner: {
    marginHorizontal: 0,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingBottom: spacing.sm + 28,
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
    color: theme.colors.darkGray,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.black,
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    color: theme.colors.darkGray,
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
