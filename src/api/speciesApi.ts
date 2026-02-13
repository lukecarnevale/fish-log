import { useQuery } from '@tanstack/react-query';
import { EnhancedFishSpecies } from '../types/fishSpecies';
import {
  fetchAllFishSpecies,
  fetchFishSpeciesById,
  searchFishSpecies,
} from '../services/fishSpeciesService';

// Cache keys for queries
export const QUERY_KEYS = {
  FISH_SPECIES: 'fishSpecies',
  FISH_SPECIES_BY_ID: (id: string) => ['fishSpecies', id],
};

// 1 day in milliseconds (for cache TTL)
const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Get all fish species from Supabase
 */
export const fetchAllSpecies = fetchAllFishSpecies;

/**
 * Get a species by ID from Supabase
 */
export const fetchSpeciesById = fetchFishSpeciesById;

/**
 * Search species by name from Supabase
 */
export const searchSpeciesByName = searchFishSpecies;

// React Query hooks for easy component integration

/**
 * Hook to get all fish species
 */
export const useAllFishSpecies = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.FISH_SPECIES],
    queryFn: fetchAllFishSpecies,
    staleTime: ONE_DAY, // Consider data fresh for a day
  });
};

/**
 * Hook to get a fish species by ID
 */
export const useFishSpeciesById = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.FISH_SPECIES_BY_ID(id),
    queryFn: () => fetchFishSpeciesById(id),
    enabled: !!id, // Only run if ID is provided
  });
};

/**
 * Hook to search fish species
 */
export const useSearchFishSpecies = (query: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.FISH_SPECIES, 'search', query],
    queryFn: () => searchFishSpecies(query),
    enabled: query.length > 2, // Only search when query is at least 3 characters
  });
};