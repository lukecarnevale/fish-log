// components/QuickActionCard.tsx
//
// Cash App-inspired quick action card with custom fish illustrations.

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ImageSourcePropType,
  ImageStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

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
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled]}
      onPress={disabled ? onDisabledPress : onPress}
      activeOpacity={disabled ? 0.7 : 0.7}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.title, disabled && styles.titleDisabled]}>{title}</Text>
        {subtitle && (
          <Text style={[
            styles.subtitle,
            subtitleColor && !disabled && { color: subtitleColor },
            disabled && styles.subtitleDisabled,
          ]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Feather
        name={disabled ? 'lock' : 'chevron-right'}
        size={16}
        color={disabled ? '#999' : '#CCC'}
        style={styles.chevron}
      />
      <View style={styles.imageContainer}>
        <Image
          source={image}
          style={[styles.image, imageStyle, disabled && styles.imageDisabled]}
          resizeMode="contain"
        />
      </View>

      {/* Overlay for disabled state */}
      {disabled && (
        <View style={styles.disabledOverlay}>
          <View style={styles.lockBadge}>
            <Feather name="lock" size={14} color="#666" />
            <Text style={styles.lockText}>{disabledMessage}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    height: 170,
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 3,
  },
  cardDisabled: {
    backgroundColor: '#F5F5F5',
  },
  textContainer: {
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  titleDisabled: {
    color: '#999',
  },
  subtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  subtitleDisabled: {
    color: '#BBB',
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
    color: '#666',
  },
});

export default QuickActionCard;
