// constants/achievementMappings.ts
//
// Shared achievement color and icon mappings used across the app.
// These are referenced by HomeScreen (badges) and ProfileScreen (achievement list).
//

import { Feather } from '@expo/vector-icons';

// Achievement color mapping - specific colors for each achievement code
export const ACHIEVEMENT_COLORS: Record<string, string> = {
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
  seasonal: '#00BCD4', // Cyan - for seasonal achievements
  special: '#8E24AA',
  default: '#FFD700', // Gold
};

// Achievement icon mapping - specific icons for each achievement code
export const ACHIEVEMENT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
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
  seasonal: 'sun', // For seasonal achievements
  special: 'star',
  default: 'award',
};

/**
 * Get the color for an achievement based on its code or category.
 */
export function getAchievementColor(code: string | undefined, category: string): string {
  if (code && ACHIEVEMENT_COLORS[code]) {
    return ACHIEVEMENT_COLORS[code];
  }
  return ACHIEVEMENT_COLORS[category] || ACHIEVEMENT_COLORS.default;
}

/**
 * Get the icon for an achievement based on its code, iconName, or category.
 */
export function getAchievementIcon(code: string | undefined, iconName: string | null | undefined, category: string): keyof typeof Feather.glyphMap {
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
