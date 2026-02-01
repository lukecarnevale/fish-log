// components/AchievementModal.tsx
//
// Modal displayed when a user unlocks an achievement.
// Shows a celebratory animation with the achievement details.
//

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import { colors, spacing, borderRadius, typography } from '../styles/common';

// Achievement color mapping - specific colors for each achievement code
const ACHIEVEMENT_COLORS: Record<string, string> = {
  // Special achievements
  rewards_entered: '#9C27B0', // Purple
  // Reporting milestones
  first_report: '#4CAF50', // Green
  reports_10: '#2E7D32', // Dark Green
  reports_50: '#1B5E20', // Darker Green
  reports_100: '#004D40', // Teal
  // Photo achievements
  photo_first: '#E91E63', // Pink
  // Fish count achievements
  fish_100: '#FF5722', // Deep Orange
  fish_500: '#E64A19', // Dark Orange
  // Streak achievements
  streak_3: '#FF9800', // Orange
  streak_7: '#F57C00', // Dark Orange
  streak_30: '#EF6C00', // Darker Orange
  // Species achievements
  species_all_5: '#2196F3', // Blue
  // Category fallbacks
  milestone: '#4CAF50',
  reporting: '#43A047',
  species: '#1976D2',
  streak: '#FB8C00',
  special: '#8E24AA',
  default: '#FFD700', // Gold
};

// Achievement icon mapping - specific icons for each achievement code
const ACHIEVEMENT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  // Special achievements
  rewards_entered: 'gift',
  // Reporting milestones
  first_report: 'flag',
  reports_10: 'trending-up',
  reports_50: 'award',
  reports_100: 'star',
  // Photo achievements
  photo_first: 'camera',
  // Fish count achievements
  fish_100: 'anchor',
  fish_500: 'award',
  // Streak achievements
  streak_3: 'zap',
  streak_7: 'zap',
  streak_30: 'zap',
  // Species achievements
  species_all_5: 'list',
  // Category fallbacks
  milestone: 'award',
  reporting: 'file-text',
  species: 'anchor',
  streak: 'zap',
  special: 'star',
  default: 'award',
};

/**
 * Get the color for an achievement based on its code or category.
 */
function getAchievementColor(code: string | undefined, category: string): string {
  if (code && ACHIEVEMENT_COLORS[code]) {
    return ACHIEVEMENT_COLORS[code];
  }
  return ACHIEVEMENT_COLORS[category] || ACHIEVEMENT_COLORS.default;
}

/**
 * Get the icon for an achievement based on its code, iconName, or category.
 */
function getAchievementIcon(code: string | undefined, iconName: string | undefined, category: string): keyof typeof Feather.glyphMap {
  // First, try to use the iconName from the database
  if (iconName && iconName in Feather.glyphMap) {
    return iconName as keyof typeof Feather.glyphMap;
  }
  // Then try the code-specific icon
  if (code && ACHIEVEMENT_ICONS[code]) {
    return ACHIEVEMENT_ICONS[code];
  }
  // Fall back to category icon
  return ACHIEVEMENT_ICONS[category] || ACHIEVEMENT_ICONS.default;
}

export interface AchievementData {
  id: string;
  code?: string;
  name: string;
  description: string;
  category: string;
  iconName?: string;
}

interface AchievementModalProps {
  visible: boolean;
  achievement: AchievementData | null;
  onClose: () => void;
}

const AchievementModal: React.FC<AchievementModalProps> = ({
  visible,
  achievement,
  onClose,
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Run celebration animation when modal appears
  useEffect(() => {
    if (visible && achievement) {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      glowAnim.setValue(0);

      // Start celebration sequence
      Animated.sequence([
        // Pop in with slight overshoot
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Gentle rotation wobble
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: -1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ).start();

      // Pulsing glow effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, achievement, scaleAnim, rotateAnim, glowAnim]);

  if (!achievement) return null;

  const category = achievement.category || 'default';
  const iconName = getAchievementIcon(achievement.code, achievement.iconName, category);
  const accentColor = getAchievementColor(achievement.code, category);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-5deg', '0deg', '5deg'],
  });

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      scrollable={false}
      avoidKeyboard={false}
      closeOnOverlayPress={true}
    >
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.headerText}>Achievement Unlocked!</Text>

        {/* Trophy Icon with Animation */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: accentColor,
              transform: [
                { scale: scaleAnim },
                { rotate },
              ],
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ]}
        >
          <Feather name={iconName as keyof typeof Feather.glyphMap} size={48} color={colors.white} />
        </Animated.View>

        {/* Achievement Name */}
        <Text style={styles.achievementName}>{achievement.name}</Text>

        {/* Achievement Description */}
        <Text style={styles.achievementDescription}>
          {achievement.description}
        </Text>

        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: `${accentColor}20` }]}>
          <Text style={[styles.categoryText, { color: accentColor }]}>
            {category.charAt(0).toUpperCase() + category.slice(1)} Achievement
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: accentColor }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Awesome!</Text>
        </TouchableOpacity>
      </View>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  headerText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  achievementName: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  achievementDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.circle,
    marginBottom: spacing.lg,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '600',
  },
  continueButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 150,
    alignItems: 'center',
  },
  continueButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default AchievementModal;
