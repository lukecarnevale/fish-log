import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../styles/common';

export interface FilterChipConfig {
  key: string;
  label: string;
  icon: string;
  isActive: boolean;
  onToggle: () => void;
  count?: number;
  color: string;
}

interface SpeciesFilterChipsProps {
  filters: FilterChipConfig[];
  isExpanded: boolean;
}

const SpeciesFilterChips: React.FC<SpeciesFilterChipsProps> = ({ filters, isExpanded }) => {
  const expandAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    if (isExpanded) {
      Animated.spring(expandAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isExpanded, expandAnim]);

  const chipsOpacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const chipsTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  return (
    <Animated.View
      style={[
        chipStyles.row,
        {
          opacity: chipsOpacity,
          transform: [{ translateY: chipsTranslateY }],
        },
      ]}
      pointerEvents={isExpanded ? 'auto' : 'none'}
    >
      {filters.map((filter) => {
        const chipColor = filter.color;

        return (
          <View key={filter.key} style={chipStyles.chipWrapper}>
            <TouchableOpacity
              style={[
                chipStyles.chip,
                {
                  borderColor: chipColor,
                  backgroundColor: filter.isActive ? chipColor : colors.white,
                },
              ]}
              onPress={filter.onToggle}
              activeOpacity={0.7}
            >
              <Feather
                name={filter.icon as any}
                size={14}
                color={filter.isActive ? colors.white : chipColor}
              />
              <Text
                style={[
                  chipStyles.label,
                  { color: filter.isActive ? colors.white : chipColor },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>

            {filter.count != null && filter.count > 0 && (
              <View style={chipStyles.badge}>
                <Text style={chipStyles.badgeText}>{filter.count}</Text>
              </View>
            )}
          </View>
        );
      })}
    </Animated.View>
  );
};

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chipWrapper: {
    position: 'relative',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
});

export default SpeciesFilterChips;
