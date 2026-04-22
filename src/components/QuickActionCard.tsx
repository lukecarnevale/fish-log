// components/QuickActionCard.tsx
//
// Cash App-inspired quick action card with custom fish illustrations.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';
import { Image, ImageStyle } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';

interface QuickActionCardProps {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  image: ImageSourcePropType;
  imageStyle?: ImageStyle;
  onPress: () => void;
  /** If true, card is grayed out with lock icon and not tappable */
  disabled?: boolean;
  /** Message to show when card is disabled */
  disabledMessage?: string;
  /** Callback when disabled card is pressed (e.g., navigate to sign in) */
  onDisabledPress?: () => void;
  /** Optional render prop for badges/notifications (positioned in image area) */
  renderBadges?: () => React.ReactNode;
  /** Optional render prop for corner notification badge (top-right of card) */
  renderCornerBadge?: () => React.ReactNode;
  /** Optional render prop for badge below subtitle text */
  renderTextBadge?: () => React.ReactNode;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  subtitle,
  subtitleColor,
  image,
  imageStyle,
  onPress,
  disabled = false,
  disabledMessage = 'Sign in to unlock',
  onDisabledPress,
  renderBadges,
  renderCornerBadge,
  renderTextBadge,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.cardWrapper}>
      {/* Corner badge - positioned at top-right edge of card */}
      {!disabled && renderCornerBadge && (
        <View style={styles.cornerBadgeContainer}>
          {renderCornerBadge()}
        </View>
      )}
      <TouchableOpacity
        style={[styles.card, disabled && styles.cardDisabled]}
        onPress={disabled ? onDisabledPress : onPress}
        activeOpacity={disabled ? 0.7 : 0.7}
      >
      <View style={styles.textContainer}>
        <Text
          style={[styles.title, disabled && styles.titleDisabled]}
          numberOfLines={2}
          maxFontSizeMultiplier={1.3}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              subtitleColor && !disabled && { color: subtitleColor },
              disabled && styles.subtitleDisabled,
            ]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <Feather
        name={disabled ? 'lock' : 'chevron-right'}
        size={16}
        color={disabled ? theme.colors.textSecondary : theme.colors.textTertiary}
        style={styles.chevron}
      />
      <View style={styles.imageContainer}>
        <Image
          source={image}
          style={[styles.image, imageStyle, disabled && styles.imageDisabled]}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
        {/* Badges layer - positioned absolutely over the fish illustration */}
        {!disabled && renderBadges && (
          <View style={styles.badgesContainer}>
            {renderBadges()}
          </View>
        )}
      </View>

      {/* Text badge - positioned absolutely, rendered after image so it's on top */}
      {!disabled && renderTextBadge && (
        <View style={styles.textBadgeContainer}>
          {renderTextBadge()}
        </View>
      )}

      {/* Overlay for disabled state */}
      {disabled && (
        <View style={styles.disabledOverlay}>
          <View style={styles.lockBadge}>
            <Feather name="lock" size={14} color={theme.colors.textSecondary} />
            <Text
              style={styles.lockText}
              numberOfLines={2}
              maxFontSizeMultiplier={1.2}
            >
              {disabledMessage}
            </Text>
          </View>
        </View>
      )}
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  cardWrapper: {
    flex: 1,
    position: 'relative',
  },
  cornerBadgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 10,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    minHeight: 170,
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    // Shadow for iOS
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 3,
  },
  cardDisabled: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  textContainer: {
    zIndex: 1,
  },
  textBadgeContainer: {
    position: 'absolute',
    top: 54,
    left: 16,
    zIndex: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  titleDisabled: {
    color: theme.colors.textSecondary,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  subtitleDisabled: {
    color: theme.colors.textTertiary,
  },
  chevron: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  badgesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Badges will use absolute positioning within this container
  },
  image: {
    width: '100%',
    height: '85%',
  },
  imageDisabled: {
    opacity: 0.3,
  },
  disabledOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  lockText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

export default QuickActionCard;
