// components/MandatoryHarvestCard.tsx
//
// Redesigned Mandatory Harvest Reporting info card with navy header,
// fish species icons in colored circles, yellow "When/What" info cards,
// and pill-shaped action buttons.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Ellipse, Path, Circle } from 'react-native-svg';

const HEADER_BG = '#0B548B';

// Fish species data with colors
const species = [
  { name: 'Flounder', bodyColor: '#4CAF50', tailColor: '#388E3C', bgColor: '#E8F5E9' },
  { name: 'Red Drum', bodyColor: '#E57373', tailColor: '#C62828', bgColor: '#FFEBEE' },
  { name: 'Spotted Seatrout', bodyColor: '#64B5F6', tailColor: '#1976D2', bgColor: '#E3F2FD' },
  { name: 'Striped Bass', bodyColor: '#90A4AE', tailColor: '#546E7A', bgColor: '#ECEFF1' },
  { name: 'Weakfish', bodyColor: '#FFB74D', tailColor: '#F57C00', bgColor: '#FFF3E0' },
];

// Fish icon component
const FishIcon: React.FC<{ bodyColor: string; tailColor: string }> = ({
  bodyColor,
  tailColor,
}) => (
  <Svg width={26} height={18} viewBox="0 0 40 28">
    <Ellipse cx={18} cy={14} rx={16} ry={8} fill={bodyColor} />
    <Path d="M32 14 Q40 8 38 14 Q40 20 32 14" fill={tailColor} />
    <Circle cx={6} cy={12} r={2} fill="white" />
  </Svg>
);

interface MandatoryHarvestCardProps {
  onLearnMore?: () => void;
  onDismiss?: () => void;
}

const MandatoryHarvestCard: React.FC<MandatoryHarvestCardProps> = ({
  onLearnMore,
  onDismiss,
}) => {
  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore();
    } else {
      Linking.openURL('https://www.deq.nc.gov/about/divisions/marine-fisheries/science-and-statistics/mandatory-harvest-reporting/mandatory-harvest-reporting-recreational').catch((err) =>
        console.error('Could not open link', err)
      );
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mandatory Harvest Reporting</Text>
        <Text style={styles.subtitle}>
          NC State Law
        </Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Fish Grid */}
        <View style={styles.fishGrid}>
          {species.map((fish) => (
            <View key={fish.name} style={styles.fishItem}>
              <View
                style={[styles.fishCircle, { backgroundColor: fish.bgColor }]}
              >
                <FishIcon bodyColor={fish.bodyColor} tailColor={fish.tailColor} />
              </View>
              <Text style={styles.fishName}>{fish.name}</Text>
            </View>
          ))}
        </View>

        {/* Info Cards */}
        <View style={styles.infoBox}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>When</Text>
            <Text style={styles.infoText}>
              At end of trip (boat reaches shore or you stop fishing).
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>What</Text>
            <Text style={styles.infoText}>
              Only fish you keep — not released fish.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={handleLearnMore}
            activeOpacity={0.7}
          >
            <Feather name="external-link" size={16} color="#666" />
            <Text style={styles.btnOutlineText}>Learn More</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSolid}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Feather name="thumbs-up" size={16} color="white" />
            <Text style={styles.btnSolidText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  // Header
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // Body
  body: {
    padding: 16,
  },

  // Fish Grid
  fishGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  fishItem: {
    alignItems: 'center',
    flex: 1,
  },
  fishCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fishName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Info Cards
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 10,
    borderTopWidth: 3,
    borderTopColor: '#FFB74D',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E65100',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },

  // Buttons
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: 'white',
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  btnSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: HEADER_BG,
  },
  btnSolidText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default MandatoryHarvestCard;
