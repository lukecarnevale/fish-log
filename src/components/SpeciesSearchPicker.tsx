// components/SpeciesSearchPicker.tsx
//
// Searchable species picker for the "Log a Catch" flow.
// Searches the full fish_species table via Supabase, with a free-text
// fallback when no DB match is found.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/common';
import { useAllFishSpecies, useSearchFishSpecies } from '../api/speciesApi';
import { EnhancedFishSpecies } from '../types/fishSpecies';
import BottomDrawer from './BottomDrawer';

export interface SpeciesSelection {
  name: string;
  imageUrl?: string;
  isCustom?: boolean; // true when user typed a custom name not in the DB
}

interface SpeciesSearchPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (species: SpeciesSelection) => void;
  selectedSpecies?: string;
}

const SpeciesSearchPicker: React.FC<SpeciesSearchPickerProps> = ({
  visible,
  onClose,
  onSelect,
  selectedSpecies,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allSpecies, isLoading: allLoading } = useAllFishSpecies();
  const { data: searchResults, isLoading: searchLoading } = useSearchFishSpecies(searchQuery);

  const isSearching = searchQuery.length > 2;
  const displaySpecies = isSearching ? searchResults : allSpecies;
  const isLoading = isSearching ? searchLoading : allLoading;

  const hasNoResults = isSearching && !searchLoading && (!searchResults || searchResults.length === 0);

  const handleSelect = useCallback((name: string, imageUrl?: string, isCustom?: boolean) => {
    onSelect({ name, imageUrl, isCustom });
    setSearchQuery('');
    onClose();
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const renderItem = useCallback(({ item }: { item: EnhancedFishSpecies }) => {
    const isSelected = item.name === selectedSpecies;
    return (
      <TouchableOpacity
        style={[pickerStyles.speciesRow, isSelected && pickerStyles.speciesRowSelected]}
        onPress={() => handleSelect(item.name, item.images?.primary)}
        activeOpacity={0.7}
      >
        {item.images?.primary ? (
          <Image
            source={{ uri: item.images.primary }}
            style={pickerStyles.speciesImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[pickerStyles.speciesImage, pickerStyles.speciesImagePlaceholder]}>
            <Feather name="help-circle" size={20} color={colors.mediumGray} />
          </View>
        )}
        <View style={pickerStyles.speciesInfo}>
          <Text style={pickerStyles.speciesName} numberOfLines={1}>{item.name}</Text>
          {item.scientificName ? (
            <Text style={pickerStyles.speciesScientific} numberOfLines={1}>{item.scientificName}</Text>
          ) : null}
        </View>
        {isSelected && (
          <Feather name="check-circle" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  }, [selectedSpecies, handleSelect]);

  const keyExtractor = useCallback((item: EnhancedFishSpecies, index: number) => item.name + index, []);

  return (
    <BottomDrawer
      visible={visible}
      onClose={handleClose}
      maxHeight="85%"
      minHeight="70%"
      showCloseButton
    >
      <View style={pickerStyles.container}>
        <Text style={pickerStyles.title}>Select Species</Text>

        {/* Search input */}
        <View style={pickerStyles.searchContainer}>
          <Feather name="search" size={18} color={colors.mediumGray} style={pickerStyles.searchIcon} />
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search species..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={18} color={colors.mediumGray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {isLoading ? (
          <View style={pickerStyles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={pickerStyles.loadingText}>Searching...</Text>
          </View>
        ) : (
          <FlatList
            data={displaySpecies ?? []}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={pickerStyles.list}
            contentContainerStyle={pickerStyles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              hasNoResults ? (
                <View style={pickerStyles.noResultsContainer}>
                  <Text style={pickerStyles.noResultsText}>No species found for "{searchQuery}"</Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              // Free text fallback: show when user has typed something
              searchQuery.length > 0 ? (
                <TouchableOpacity
                  style={pickerStyles.customSpeciesRow}
                  onPress={() => handleSelect(searchQuery.trim(), undefined, true)}
                  activeOpacity={0.7}
                >
                  <View style={[pickerStyles.speciesImage, pickerStyles.customSpeciesIcon]}>
                    <Feather name="edit-3" size={20} color={colors.secondary} />
                  </View>
                  <View style={pickerStyles.speciesInfo}>
                    <Text style={pickerStyles.customSpeciesLabel}>Log as custom species</Text>
                    <Text style={pickerStyles.customSpeciesName}>"{searchQuery.trim()}"</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mediumGray} />
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </View>
    </BottomDrawer>
  );
};

const pickerStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightestGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    height: 44,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  speciesRowSelected: {
    backgroundColor: colors.primaryLight + '15',
  },
  speciesImage: {
    width: 64,
    height: 40,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  speciesImagePlaceholder: {
    backgroundColor: colors.lightestGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speciesInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  speciesName: {
    fontSize: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    color: colors.textPrimary,
  },
  speciesScientific: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  noResultsContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customSpeciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: colors.secondaryLight + '10',
    borderRadius: borderRadius.md,
  },
  customSpeciesIcon: {
    backgroundColor: colors.secondaryLight + '25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSpeciesLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customSpeciesName: {
    fontSize: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    color: colors.secondary,
    marginTop: 2,
  },
});

export default SpeciesSearchPicker;
