import React from 'react';
import { View, Text } from 'react-native';
import { FishingStats } from './profileScreen.types';
import { styles, localStyles } from '../../styles/profileScreenStyles';

interface ProfileStatsProps {
  fishingStats: FishingStats;
  statsLoading: boolean;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ fishingStats, statsLoading }) => {
  return (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Fishing Statistics</Text>
      <View style={styles.statsContainer}>
        {statsLoading ? (
          <>
            <View style={styles.statCard}>
              <View style={localStyles.skeletonStatValue} />
              <View style={localStyles.skeletonStatLabel} />
            </View>
            <View style={styles.statCard}>
              <View style={localStyles.skeletonStatValue} />
              <View style={localStyles.skeletonStatLabel} />
            </View>
            <View style={styles.statCard}>
              <View style={localStyles.skeletonStatValue} />
              <View style={localStyles.skeletonStatLabel} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{fishingStats.totalCatches}</Text>
              <Text style={styles.statLabel}>Catches</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{fishingStats.uniqueSpecies}</Text>
              <Text style={styles.statLabel}>Species</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {fishingStats.largestFish !== null ? `${fishingStats.largestFish}"` : '--'}
              </Text>
              <Text style={styles.statLabel}>Largest Fish</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default ProfileStats;
