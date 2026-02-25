// components/promotions/AreaSelector.tsx
//
// Horizontal scrollable pill bar for selecting a NC coastal region.
// Pre-selects the user's preferred area and allows browsing other regions.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/common';

interface AreaSelectorProps {
  /** Currently selected region code, or null for "All Areas" */
  selectedArea: string | null;
  /** Callback when an area is selected */
  onSelectArea: (area: string | null) => void;
  /** Available regions to show */
  regions: { value: string; shortLabel: string }[];
}

const AreaSelector: React.FC<AreaSelectorProps> = ({
  selectedArea,
  onSelectArea,
  regions,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        disableIntervalMomentum
      >
        {/* "All Areas" pill */}
        <TouchableOpacity
          style={[
            styles.pill,
            selectedArea === null && styles.pillSelected,
          ]}
          onPress={() => onSelectArea(null)}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedArea === null }}
          accessibilityLabel="All Areas"
        >
          <Feather
            name="map-pin"
            size={13}
            color={selectedArea === null ? colors.white : colors.primary}
            style={styles.pillIcon}
          />
          <Text
            style={[
              styles.pillText,
              selectedArea === null && styles.pillTextSelected,
            ]}
          >
            All Areas
          </Text>
        </TouchableOpacity>

        {/* Region pills */}
        {regions.map((region) => (
          <TouchableOpacity
            key={region.value}
            style={[
              styles.pill,
              selectedArea === region.value && styles.pillSelected,
            ]}
            onPress={() => onSelectArea(region.value)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedArea === region.value }}
            accessibilityLabel={region.shortLabel}
          >
            <Text
              style={[
                styles.pillText,
                selectedArea === region.value && styles.pillTextSelected,
              ]}
            >
              {region.shortLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(11, 84, 139, 0.15)',
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillIcon: {
    marginRight: 4,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  pillTextSelected: {
    color: colors.white,
  },
});

export default AreaSelector;
