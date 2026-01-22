import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FishSpecies } from '../models/schemas';
import persistedStorage from '../utils/storage/persistedStorage';

// Cache keys for queries
export const QUERY_KEYS = {
  FISH_SPECIES: 'fishSpecies',
  FISH_SPECIES_BY_ID: (id: string) => ['fishSpecies', id],
};

// 1 day in milliseconds (for cache TTL)
const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Get all fish species
 */
export const fetchAllSpecies = async (): Promise<FishSpecies[]> => {
  // In a real app, this would be an API call
  // For now, we'll use static data loaded from a local import
  const speciesData = require('../data/fishSpeciesData');
  return speciesData;
};

/**
 * Get a species by ID
 */
export const fetchSpeciesById = async (id: string): Promise<FishSpecies | null> => {
  const allSpecies = await fetchAllSpecies();
  return allSpecies.find(species => species.id === id) || null;
};

/**
 * Search species by name
 */
export const searchSpeciesByName = async (query: string): Promise<FishSpecies[]> => {
  const allSpecies = await fetchAllSpecies();
  const lowerQuery = query.toLowerCase();
  
  return allSpecies.filter(species => 
    species.name.toLowerCase().includes(lowerQuery) || 
    species.scientificName.toLowerCase().includes(lowerQuery)
  );
};

// React Query hooks for easy component integration

/**
 * Hook to get all fish species
 */
export const useAllFishSpecies = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.FISH_SPECIES],
    queryFn: async () => {
      // First try to get from cache
      const cachedData = await persistedStorage.getItem<FishSpecies[]>(QUERY_KEYS.FISH_SPECIES);
      
      if (cachedData) {
        return cachedData;
      }
      
      // If no cache, fetch fresh data
      const freshData = await fetchAllSpecies();
      
      // Cache the data
      await persistedStorage.setItem(QUERY_KEYS.FISH_SPECIES, freshData, { ttl: ONE_DAY * 7 });
      
      return freshData;
    },
    staleTime: ONE_DAY, // Consider data fresh for a day
  });
};

/**
 * Hook to get a fish species by ID
 */
export const useFishSpeciesById = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.FISH_SPECIES_BY_ID(id),
    queryFn: () => fetchSpeciesById(id),
    enabled: !!id, // Only run if ID is provided
  });
};

/**
 * Hook to search fish species
 */
export const useSearchFishSpecies = (query: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.FISH_SPECIES, 'search', query],
    queryFn: () => searchSpeciesByName(query),
    enabled: query.length > 2, // Only search when query is at least 3 characters
  });
};