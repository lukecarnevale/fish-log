import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { UserAchievement } from '../../types/user';
import { getAchievementColor, getAchievementIcon } from '../../constants/achievementMappings';
import { colors } from '../../styles/common';
import { styles, localStyles } from '../../styles/profileScreenStyles';

interface ProfileAchievementsProps {
  achievements: UserAchievement[];
}

const ProfileAchievements: React.FC<ProfileAchievementsProps> = ({ achievements }) => {
  return (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Achievements</Text>
      <View style={localStyles.achievementsContainer}>
        {[...achievements]
          .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
          .map((ua) => {
            const category = ua.achievement.category || 'default';
            const code = ua.achievement.code;
            const iconName = getAchievementIcon(code, ua.achievement.iconName, category);
            const bgColor = getAchievementColor(code, category);
            return (
              <View key={ua.id} style={localStyles.achievementCard}>
                <View style={[localStyles.achievementIconCircle, { backgroundColor: bgColor }]}>
                  <Feather
                    name={iconName}
                    size={20}
                    color={colors.white}
                  />
                </View>
                <View style={localStyles.achievementTextContainer}>
                  <Text style={localStyles.achievementName}>{ua.achievement.name}</Text>
                  <Text style={localStyles.achievementDescription} numberOfLines={2}>
                    {ua.achievement.description}
                  </Text>
                </View>
              </View>
            );
          })}
      </View>
    </View>
  );
};

export default ProfileAchievements;
