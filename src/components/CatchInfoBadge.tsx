// components/CatchInfoBadge.tsx
//
// Premium badge component for displaying catch information
// (species, size, location) with glassmorphism styling.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../styles/common';
import { SpeciesTheme } from '../constants/speciesColors';

type BadgeVariant = 'species' | 'size' | 'location';

interface CatchInfoBadgeProps {
  text: string;
  variant: BadgeVariant;
  icon?: keyof typeof Feather.glyphMap;
  speciesTheme?: SpeciesTheme;
  maxWidth?: number;
}

/**
 * Premium badge component with glassmorphism styling.
 *
 * Variants:
 * - species: Prominent white badge, species-colored accent dot
 * - size: Subtle semi-transparent badge
 * - location: Subtle semi-transparent badge, truncates text
 */
const CatchInfoBadge: React.FC<CatchInfoBadgeProps> = ({
  text,
  variant,
  icon,
  speciesTheme,
  maxWidth,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'species':
        return styles.speciesContainer;
      case 'size':
        return styles.sizeContainer;
      case 'location':
        return [styles.locationContainer, maxWidth ? { maxWidth } : null];
      default:
        return styles.speciesContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'species':
        return styles.speciesText;
      case 'size':
        return styles.sizeText;
      case 'location':
        return styles.locationText;
      default:
        return styles.speciesText;
    }
  };

  const getIconColor = () => {
    if (variant === 'species' && speciesTheme) {
      return speciesTheme.primary;
    }
    return 'rgba(255, 255, 255, 0.9)';
  };

  const getIcon = (): keyof typeof Feather.glyphMap => {
    if (icon) return icon;
    switch (variant) {
      case 'size':
        return 'maximize-2';
      case 'location':
        return 'map-pin';
      default:
        return 'circle';
    }
  };

  // Species badge has special design with colored dot
  if (variant === 'species') {
    return (
      <View style={styles.speciesContainer}>
        {speciesTheme && (
          <View style={[styles.speciesDot, { backgroundColor: speciesTheme.primary }]} />
        )}
        <Text style={styles.speciesText} numberOfLines={1}>
          {text}
        </Text>
      </View>
    );
  }

  return (
    <View style={getContainerStyle()}>
      <Feather
        name={getIcon()}
        size={11}
        color={getIconColor()}
        style={styles.icon}
      />
      <Text
        style={getTextStyle()}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Species badge - premium glassmorphism, prominent
  speciesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  speciesDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  speciesText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },

  // Size badge - subtle glassmorphism
  sizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    opacity: 0.9,
  },

  // Location badge - subtle, truncates long text
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    maxWidth: 150,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    opacity: 0.9,
    flexShrink: 1,
  },

  // Shared icon style
  icon: {
    marginRight: spacing.xxs,
  },
});

export default CatchInfoBadge;
