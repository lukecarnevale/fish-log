// components/promotions/CategoryTabs.tsx
//
// Horizontal scrollable category filter tabs for the Promotions Hub.

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
import { spacing, borderRadius } from '../../styles/common';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { Theme } from '../../styles/theme';
import type { AdCategory } from '../../services/transformers/advertisementTransformer';
import { getCategoryLabel, getCategoryIcon } from '../../services/promotionsService';

interface CategoryTabsProps {
  selectedCategory: AdCategory | null;
  onSelectCategory: (category: AdCategory | null) => void;
  /** Optional: counts per category for badges */
  categoryCounts?: Partial<Record<AdCategory, number>>;
}

const CATEGORIES: AdCategory[] = ['promotion', 'charter', 'gear', 'service', 'experience'];

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        disableIntervalMomentum
      >
        {/* "All" tab */}
        <TouchableOpacity
          style={[
            styles.tab,
            selectedCategory === null && styles.tabActive,
          ]}
          onPress={() => onSelectCategory(null)}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedCategory === null }}
          accessibilityLabel="All categories"
        >
          <Feather
            name="grid"
            size={14}
            color={selectedCategory === null ? theme.colors.white : theme.colors.secondary}
          />
          <Text
            style={[
              styles.tabText,
              selectedCategory === null && styles.tabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          const count = categoryCounts?.[cat];
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelectCategory(cat)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${getCategoryLabel(cat)} category${count ? `, ${count} items` : ''}`}
            >
              <Feather
                name={getCategoryIcon(cat) as any}
                size={14}
                color={isActive ? theme.colors.white : theme.colors.secondary}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {getCategoryLabel(cat)}
              </Text>
              {count !== undefined && count > 0 && !isActive && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(6, 116, 127, 0.08)',
    gap: 6,
  },
  tabActive: {
    backgroundColor: theme.colors.secondary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  tabTextActive: {
    color: theme.colors.white,
  },
  countBadge: {
    backgroundColor: 'rgba(6, 116, 127, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
});

export default CategoryTabs;
