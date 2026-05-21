// components/AchievementBadgesRow.tsx
//
// Horizontal scrollable strip of badge icons for earned achievements.
// Renders the achievement's `icon` text as a Feather icon name when valid,
// otherwise falls back to a generic award icon.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { EarnedAchievement } from '../types/catchFeed';

interface AchievementBadgesRowProps {
  achievements: EarnedAchievement[];
}

// Feather icon names known to ship with the bundled set. If the DB stores a
// non-Feather icon string we fall back to 'award'. We don't import all the
// names from @expo/vector-icons just for a runtime check — Feather will
// silently render a question mark, so we guard on a small allowlist of
// common ones we'd expect to see for fishing achievements.
const FEATHER_ALLOWLIST = new Set([
  'award',
  'star',
  'target',
  'zap',
  'anchor',
  'compass',
  'trending-up',
  'map-pin',
  'sun',
  'moon',
  'cloud',
  'wind',
  'thermometer',
  'flag',
  'gift',
  'shield',
  'heart',
  'sunrise',
  'sunset',
  'check-circle',
]);

const AchievementBadgesRow: React.FC<AchievementBadgesRowProps> = ({ achievements }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (achievements.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Achievements</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {achievements.map((a) => {
          const featherName =
            a.icon && FEATHER_ALLOWLIST.has(a.icon) ? a.icon : 'award';
          return (
            <TouchableOpacity
              key={a.code}
              style={styles.badge}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert(a.name, a.description ?? 'Achievement earned.')
              }
              accessibilityLabel={`${a.name} achievement`}
            >
              <View style={styles.badgeIconContainer}>
                <Feather
                  name={featherName as React.ComponentProps<typeof Feather>['name']}
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.badgeName} numberOfLines={1}>
                {a.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textTertiary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    scrollContent: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
    },
    badge: {
      width: 72,
      alignItems: 'center',
    },
    badgeIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    badgeName: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontWeight: '600',
    },
  });

export default AchievementBadgesRow;
