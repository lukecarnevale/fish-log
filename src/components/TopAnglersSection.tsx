// components/TopAnglersSection.tsx
//
// Premium "This Week's Top Anglers" section component for the Catch Feed.
// Features a dark navy blue background with glassmorphism cards,
// trophy/award icons, and elegant typography.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { TopAngler } from '../types/catchFeed';
import { colors, spacing } from '../styles/common';
import { TrophyIcon, FishIcon, RulerIcon } from './icons/TopAnglerIcons';

// Premium color palette
const COLORS = {
  navyDark: '#0A3D62',
  navyLight: '#1A5276',
  gold: '#FFD700',
  goldDark: '#FFA500',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  white: '#FFFFFF',
  textLight: 'rgba(255, 255, 255, 0.9)',
  textMuted: 'rgba(255, 255, 255, 0.65)',
};

interface TopAnglerCardProps {
  angler: TopAngler;
  rank: number;
}

const TopAnglerCard: React.FC<TopAnglerCardProps> = ({ angler, rank }) => {
  const getRankColor = () => {
    switch (rank) {
      case 1:
        return COLORS.gold;
      case 2:
        return COLORS.silver;
      case 3:
        return COLORS.bronze;
      default:
        return COLORS.white;
    }
  };

  const getCategoryIcon = () => {
    const color = getRankColor();
    switch (angler.type) {
      case 'catches':
        return <TrophyIcon color={color} size={22} />;
      case 'species':
        return <FishIcon color={color} size={22} />;
      case 'length':
        return <RulerIcon color={color} size={22} />;
      default:
        return <Feather name="star" size={22} color={color} />;
    }
  };

  const getCategoryTitle = () => {
    switch (angler.type) {
      case 'catches':
        return 'Most Catches';
      case 'species':
        return 'Most Species';
      case 'length':
        return 'Longest Catch';
      default:
        return angler.label;
    }
  };

  const formatValue = () => {
    if (angler.type === 'length') {
      return typeof angler.value === 'string' ? angler.value : `${angler.value}"`;
    }
    return angler.value.toString();
  };

  return (
    <View style={styles.anglerCard}>
      {/* Glassmorphism background */}
      <View style={styles.cardGlass}>
        {/* Category title */}
        <Text style={styles.categoryTitle}>{getCategoryTitle()}</Text>

        {/* Icon with glow effect */}
        <View style={[styles.iconContainer, { shadowColor: getRankColor() }]}>
          {getCategoryIcon()}
        </View>

        {/* Angler name */}
        <Text style={styles.anglerName} numberOfLines={1}>
          {angler.displayName}
        </Text>

        {/* Value */}
        <Text style={[styles.anglerValue, { color: getRankColor() }]}>
          {formatValue()}
        </Text>

        {/* Label */}
        <Text style={styles.anglerLabel}>{angler.label}</Text>
      </View>
    </View>
  );
};

interface TopAnglersSectionProps {
  anglers: TopAngler[];
}

const TopAnglersSection: React.FC<TopAnglersSectionProps> = ({ anglers }) => {
  if (anglers.length === 0) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.navyDark, COLORS.navyLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Feather name="award" size={18} color={COLORS.gold} />
          </View>
          <Text style={styles.headerTitle}>This Week's Top Anglers</Text>
        </View>

        {/* Angler cards */}
        <View style={styles.cardsRow}>
          {anglers.map((angler, index) => (
            <TopAnglerCard
              key={`${angler.type}-${index}`}
              angler={angler}
              rank={index + 1}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 20,
    overflow: 'hidden',
    // Premium shadow
    shadowColor: COLORS.navyDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },

  // Decorative circles
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },

  // Cards row
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Individual angler card
  anglerCard: {
    flex: 1,
    minHeight: 155,
  },
  cardGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    // Add subtle inner glow/shadow for depth
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Category title
  categoryTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: 'center',
  },

  // Icon container
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    // Glow effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },

  // Angler info
  anglerName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  anglerValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  anglerLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
});

export default TopAnglersSection;
