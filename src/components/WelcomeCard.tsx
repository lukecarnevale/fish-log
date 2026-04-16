// components/WelcomeCard.tsx
//
// Unified welcome card for the HomeScreen showing greeting, rewards status,
// and achievement badges. Only renders when the user has a name or is a
// rewards member.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import WaveBackground from './WaveBackground';
import { spacing, borderRadius } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { getAchievementColor, getAchievementIcon } from '../constants/achievementMappings';
import { UserAchievement } from '../types/user';

interface WelcomeCardProps {
  userName: string;
  profileImage: string | null;
  nauticalGreeting: string;
  rewardsMember: boolean;
  rewardsMemberEmail: string | null;
  userAchievements: UserAchievement[];
  hasProfileEmail: boolean;
  onProfilePress: () => void;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({
  userName,
  profileImage,
  nauticalGreeting,
  rewardsMember,
  rewardsMemberEmail,
  userAchievements,
  hasProfileEmail,
  onProfilePress,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!userName && !rewardsMember) return null;

  return (
    <View style={styles.card}>
      {/* Greeting Section */}
      {userName !== '' && (
        <View style={[styles.greeting, { position: 'relative', overflow: 'hidden' }]}>
          <WaveBackground />
          <View style={styles.greetingIcon}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={{ width: 60, height: 60, borderRadius: 30 }}
                contentFit="cover"
                cachePolicy="disk"
                recyclingKey={`home-avatar-${profileImage}`}
                transition={200}
              />
            ) : (
              <Feather name="anchor" size={30} color={theme.colors.white} />
            )}
          </View>
          <View style={[styles.greetingText, { zIndex: 1 }]}>
            <Text style={styles.greetingLine}>{nauticalGreeting},</Text>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.greetingLine}>Enjoy your fishing today!</Text>
          </View>
        </View>
      )}

      {/* Rewards Status Section */}
      {rewardsMember ? (
        <TouchableOpacity
          style={[
            styles.rewardsSection,
            userName !== '' && styles.rewardsSectionWithGreeting,
          ]}
          onPress={onProfilePress}
          activeOpacity={0.7}
        >
          <View style={styles.rewardsIcon}>
            <Feather name="award" size={18} color={theme.colors.secondary} />
          </View>
          <View style={styles.rewardsContent}>
            <Text style={styles.rewardsTitle}>Rewards Member</Text>
            <Text style={styles.rewardsEmail} numberOfLines={1} maxFontSizeMultiplier={1.2}>{rewardsMemberEmail}</Text>
          </View>
          {userAchievements.length > 0 ? (
            <View style={styles.achievementIconsRow}>
              {[...userAchievements]
                .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
                .slice(0, 3)
                .map((ua, index) => {
                  const category = ua.achievement.category || 'default';
                  const code = ua.achievement.code;
                  const iconName = getAchievementIcon(code, ua.achievement.iconName, category);
                  const bgColor = getAchievementColor(code, category);
                  return (
                    <View
                      key={ua.id}
                      style={[
                        styles.achievementIconBadge,
                        { backgroundColor: bgColor },
                        index > 0 && { marginLeft: -8 },
                      ]}
                    >
                      <Feather name={iconName} size={14} color={theme.colors.white} />
                    </View>
                  );
                })}
              {userAchievements.length > 3 && (
                <View
                  key="achievement-overflow"
                  style={[styles.achievementIconBadge, styles.achievementCountBadge, { marginLeft: -8 }]}
                >
                  <Text style={styles.achievementCountText} maxFontSizeMultiplier={1.1}>+{userAchievements.length - 3}</Text>
                </View>
              )}
            </View>
          ) : (
            <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
          )}
        </TouchableOpacity>
      ) : userName !== '' ? (
        <TouchableOpacity
          style={styles.joinRewards}
          onPress={onProfilePress}
          activeOpacity={0.7}
        >
          <View style={styles.joinIcon}>
            <Feather name="gift" size={16} color={theme.colors.secondary} />
          </View>
          <Text style={styles.joinText} numberOfLines={2} maxFontSizeMultiplier={1.2}>
            {hasProfileEmail ? 'Sign In to Rewards Program' : 'Join Rewards Program'}
          </Text>
          <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.secondary,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  greetingIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  greetingText: {
    flex: 1,
  },
  greetingLine: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.white,
    opacity: 0.9,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.white,
    marginVertical: 2,
  },
  rewardsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rewardsSectionWithGreeting: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  rewardsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  rewardsContent: {
    flex: 1,
  },
  rewardsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rewardsEmail: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  joinRewards: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 245, 245, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  joinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  joinText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.white,
  },
  achievementIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementCountBadge: {
    backgroundColor: theme.colors.primary,
  },
  achievementCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.white,
  },
});

export default React.memo(WelcomeCard);
