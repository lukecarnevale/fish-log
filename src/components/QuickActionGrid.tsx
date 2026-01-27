// components/QuickActionGrid.tsx
//
// 2x2 grid of quick action cards with fish illustrations.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import QuickActionCard from './QuickActionCard';
import { RootStackParamList } from '../types';
import { SCREEN_LABELS } from '../constants/screenLabels';

// Card images
const cardImages = {
  reportCatch: require('../assets/cards/card_report_catch.png'),
  pastReports: require('../assets/cards/card_past_reports.png'),
  speciesGuide: require('../assets/cards/card_species_guide.png'),
  catchFeed: require('../assets/cards/card_catch_feed.png'),
};

interface QuickActionGridProps {
  onNavigate: (screen: keyof RootStackParamList) => void;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <QuickActionCard
          title={SCREEN_LABELS.reportCatch.title}
          image={cardImages.reportCatch}
          onPress={() => onNavigate('ReportForm')}
        />
        <View style={styles.gap} />
        <QuickActionCard
          title={SCREEN_LABELS.pastReports.title}
          subtitle={SCREEN_LABELS.pastReports.subtitle}
          subtitleColor="#1E3A5F"
          image={cardImages.pastReports}
          onPress={() => onNavigate('PastReports')}
        />
      </View>
      <View style={styles.row}>
        <QuickActionCard
          title={SCREEN_LABELS.speciesGuide.title}
          subtitle={SCREEN_LABELS.speciesGuide.subtitle}
          subtitleColor="#2D9596"
          image={cardImages.speciesGuide}
          onPress={() => onNavigate('SpeciesInfo')}
        />
        <View style={styles.gap} />
        <QuickActionCard
          title={SCREEN_LABELS.catchFeed.title}
          subtitle={SCREEN_LABELS.catchFeed.subtitle}
          subtitleColor="#81C784"
          image={cardImages.catchFeed}
          imageStyle={{ width: '140%', height: '110%', marginLeft: -20 }}
          onPress={() => onNavigate('CatchFeed')}
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

export default QuickActionGrid;
