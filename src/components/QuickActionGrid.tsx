// components/QuickActionGrid.tsx
//
// 2x2 grid of quick action cards with fish illustrations.
// Enhanced with playful notifications and counters on cards.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import QuickActionCard from './QuickActionCard';
import {
  CounterBubble,
  NewDotNotification,
  ActivityBadge,
  ActivityDots,
} from './CardBadges';
import { RootStackParamList } from '../types';
import { SCREEN_LABELS } from '../constants/screenLabels';

// Card images
const cardImages = {
  reportCatch: require('../assets/cards/card_report_catch.png'),
  pastReports: require('../assets/cards/card_past_reports.png'),
  speciesGuide: require('../assets/cards/card_species_guide.png'),
  catchFeed: require('../assets/cards/card_catch_feed.png'),
};

/** Badge data for quick action cards */
export interface CardBadgeData {
  /** Past Reports card */
  pastReportsCount: number;
  hasNewReport: boolean;
  /** Species Guide card */
  totalSpecies: number;
  /** Catch Feed card */
  newCatchesCount: number;
}

interface QuickActionGridProps {
  onNavigate: (screen: keyof RootStackParamList) => void;
  /** Whether the user is signed in (rewards member) */
  isSignedIn?: boolean;
  /** Badge data for cards */
  badgeData?: CardBadgeData;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({
  onNavigate,
  isSignedIn = false,
  badgeData,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Report Catch - NO BADGES (per spec) */}
        <QuickActionCard
          title={SCREEN_LABELS.reportCatch.title}
          image={cardImages.reportCatch}
          onPress={() => onNavigate('ReportForm')}
        />
        <View style={styles.gap} />
        {/* Past Reports - Counter bubble + new report dot */}
        <QuickActionCard
          title={SCREEN_LABELS.pastReports.title}
          subtitle={SCREEN_LABELS.pastReports.subtitle}
          subtitleColor="#1E3A5F"
          image={cardImages.pastReports}
          onPress={() => onNavigate('PastReports')}
          disabled={!isSignedIn}
          disabledMessage="Sign in to view"
          onDisabledPress={() => onNavigate('Profile')}
          renderCornerBadge={badgeData ? () => (
            <NewDotNotification
              visible={badgeData.hasNewReport}
              color="#f59e0b"
              size={12}
              delay={200}
            />
          ) : undefined}
          renderBadges={badgeData ? () => (
            <>
              {/* Counter bubble - top right of fish */}
              {badgeData.pastReportsCount > 0 && (
                <View style={badgeStyles.pastReportsCounter}>
                  <CounterBubble
                    count={badgeData.pastReportsCount}
                    gradientColors={['#4dc9c9', '#3ba8a8']}
                    shadowColor="rgba(77, 201, 201, 0.4)"
                    size={32}
                    delay={100}
                  />
                </View>
              )}
            </>
          ) : undefined}
        />
      </View>
      <View style={styles.row}>
        {/* Species Guide - Count badge */}
        <QuickActionCard
          title={SCREEN_LABELS.speciesGuide.title}
          subtitle={SCREEN_LABELS.speciesGuide.subtitle}
          subtitleColor="#2D9596"
          image={cardImages.speciesGuide}
          imageStyle={{
            position: 'absolute',
            bottom: -28,
            left: -13,
            right: 0,
            width: '120%',
            height: '120%',
          }}
          onPress={() => onNavigate('SpeciesInfo')}
          renderBadges={badgeData ? () => (
            <>
              {/* Species count badge - bottom right of fish */}
              {badgeData.totalSpecies > 0 && (
                <View style={badgeStyles.speciesCounter}>
                  <CounterBubble
                    count={badgeData.totalSpecies}
                    gradientColors={['#1a365d', '#2d4a6f']}
                    shadowColor="rgba(26, 54, 93, 0.3)"
                    size={34}
                    delay={300}
                  />
                </View>
              )}
            </>
          ) : undefined}
        />
        <View style={styles.gap} />
        {/* Catch Feed - Activity badge + bouncing dots */}
        <QuickActionCard
          title={SCREEN_LABELS.catchFeed.title}
          subtitle={SCREEN_LABELS.catchFeed.subtitle}
          subtitleColor="#81C784"
          image={cardImages.catchFeed}
          imageStyle={{ width: '140%', height: '110%', marginLeft: 0 }}
          onPress={() => onNavigate('CatchFeed')}
          disabled={!isSignedIn}
          disabledMessage="Sign in to view"
          onDisabledPress={() => onNavigate('Profile')}
          renderTextBadge={badgeData && badgeData.newCatchesCount > 0 ? () => (
            <ActivityBadge
              count={badgeData.newCatchesCount}
              gradientColors={['#48bb78', '#38a169']}
              shadowColor="rgba(72, 187, 120, 0.4)"
              delay={400}
            />
          ) : undefined}
          renderBadges={badgeData ? () => (
            <>
              {/* Activity dots - right side of fish */}
              <View style={badgeStyles.catchFeedDots}>
                <ActivityDots
                  visible={badgeData.newCatchesCount > 0}
                  color="#48bb78"
                  dotSize={6}
                  delay={500}
                />
              </View>
            </>
          ) : undefined}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  gap: {
    width: 12,
  },
});

// Badge positioning styles (absolute within the badgesContainer)
const badgeStyles = StyleSheet.create({
  // Past Reports: counter at top-right of fish
  pastReportsCounter: {
    position: 'absolute',
    top: -4,
    right: 8,
  },
  // Species Guide: counter at center of card (shifted up)
  speciesCounter: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: [{ translateX: -17 }, { translateY: -17 }],
  },
  // Catch Feed: activity dots at bottom-right
  catchFeedDots: {
    position: 'absolute',
    bottom: 12,
    right: 8,
  },
});

export default QuickActionGrid;
