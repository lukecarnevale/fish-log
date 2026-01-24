// services/fishSpeciesService.ts
//
// Service for fetching fish species data from Supabase.
// Includes caching for offline support.
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConnected } from '../config/supabase';
import { EnhancedFishSpecies } from '../types/fishSpecies';

// Cache key for offline storage
const CACHE_KEY = '@fish_species_cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// =============================================================================
// Type Definitions
// =============================================================================

interface SupabaseFishSpeciesRow {
  id: string;
  name: string;
  common_names: string[];
  scientific_name: string;
  image_primary: string;
  image_additional: string[];
  description: string;
  identification: string;
  max_size: string | null;
  habitat: string | null;
  distribution: string | null;
  regulations: {
    sizeLimit?: {
      min: number | null;
      max: number | null;
      unit: 'in' | 'cm';
      notes?: string;
    };
    bagLimit?: number | null;
    openSeasons?: { from: string; to: string }[] | null;
    closedAreas?: string[];
    specialRegulations?: string[];
  };
  conservation_status: string;
  fishing_tips: {
    techniques?: string[];
    baits?: string[];
    equipment?: string[];
    locations?: string[];
  };
  water_types: string[];
  species_group: string[];
  season_spring: boolean;
  season_summer: boolean;
  season_fall: boolean;
  season_winter: boolean;
  similar_species: {
    id: string;
    name: string;
    differentiatingFeatures: string;
  }[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CachedData {
  species: EnhancedFishSpecies[];
  cachedAt: number;
}

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * Transform a Supabase row to EnhancedFishSpecies type.
 */
export function transformFishSpecies(row: SupabaseFishSpeciesRow): EnhancedFishSpecies {
  return {
    id: row.id,
    name: row.name,
    commonNames: row.common_names || [],
    scientificName: row.scientific_name,
    images: {
      primary: row.image_primary,
      additional: row.image_additional || [],
    },
    description: row.description,
    identification: row.identification,
    maxSize: row.max_size || '',
    habitat: row.habitat || '',
    distribution: row.distribution || '',
    regulations: {
      sizeLimit: row.regulations?.sizeLimit || { min: null, max: null, unit: 'in' },
      bagLimit: row.regulations?.bagLimit ?? null,
      openSeasons: row.regulations?.openSeasons || null,
      closedAreas: row.regulations?.closedAreas,
      specialRegulations: row.regulations?.specialRegulations,
    },
    conservationStatus: row.conservation_status as EnhancedFishSpecies['conservationStatus'],
    fishingTips: {
      techniques: row.fishing_tips?.techniques || [],
      baits: row.fishing_tips?.baits || [],
      equipment: row.fishing_tips?.equipment || [],
      locations: row.fishing_tips?.locations || [],
    },
    categories: {
      type: row.water_types as ('Freshwater' | 'Saltwater' | 'Brackish')[],
      group: row.species_group || [],
    },
    seasons: {
      spring: row.season_spring,
      summer: row.season_summer,
      fall: row.season_fall,
      winter: row.season_winter,
    },
    similarSpecies: row.similar_species || [],
  };
}

// =============================================================================
// Cache Functions
// =============================================================================

/**
 * Get cached species data.
 */
async function getCachedSpecies(): Promise<EnhancedFishSpecies[] | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);

    // Check if cache is still valid
    if (Date.now() - data.cachedAt > CACHE_TTL) {
      console.log('📦 Fish species cache expired');
      return null;
    }

    console.log('📦 Using cached fish species data');
    return data.species;
  } catch {
    return null;
  }
}

/**
 * Save species data to cache.
 */
async function cacheSpecies(species: EnhancedFishSpecies[]): Promise<void> {
  try {
    const data: CachedData = {
      species,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    console.log('💾 Fish species data cached');
  } catch (error) {
    console.error('Failed to cache fish species:', error);
  }
}

/**
 * Clear the species cache.
 */
export async function clearSpeciesCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Fish species cache cleared');
  } catch (error) {
    console.error('Failed to clear species cache:', error);
  }
}

// =============================================================================
// Supabase Operations
// =============================================================================

/**
 * Fetch all active fish species from Supabase.
 */
async function fetchSpeciesFromSupabase(): Promise<EnhancedFishSpecies[]> {
  const { data, error } = await supabase
    .from('fish_species')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch fish species: ${error.message}`);
  }

  return (data || []).map(transformFishSpecies);
}

/**
 * Fetch a single fish species by ID from Supabase.
 */
async function fetchSpeciesByIdFromSupabase(id: string): Promise<EnhancedFishSpecies | null> {
  const { data, error } = await supabase
    .from('fish_species')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch fish species: ${error.message}`);
  }

  return data ? transformFishSpecies(data) : null;
}

/**
 * Search fish species by name from Supabase.
 */
async function searchSpeciesFromSupabase(query: string): Promise<EnhancedFishSpecies[]> {
  const { data, error } = await supabase
    .from('fish_species')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,scientific_name.ilike.%${query}%`)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to search fish species: ${error.message}`);
  }

  return (data || []).map(transformFishSpecies);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get all fish species.
 * Fetches from Supabase if connected, falls back to cache.
 */
export async function fetchAllFishSpecies(): Promise<EnhancedFishSpecies[]> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const species = await fetchSpeciesFromSupabase();
      // Update cache with fresh data
      await cacheSpecies(species);
      console.log('✅ Fish species fetched from Supabase');
      return species;
    } catch (error) {
      console.warn('⚠️ Failed to fetch from Supabase, using cache:', error);
    }
  }

  // Try cache
  const cached = await getCachedSpecies();
  if (cached) {
    return cached;
  }

  // No data available
  console.warn('⚠️ No fish species data available (no connection and no cache)');
  return [];
}

/**
 * Get a fish species by ID.
 */
export async function fetchFishSpeciesById(id: string): Promise<EnhancedFishSpecies | null> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      return await fetchSpeciesByIdFromSupabase(id);
    } catch (error) {
      console.warn('⚠️ Failed to fetch species by ID from Supabase:', error);
    }
  }

  // Try to find in cache
  const cached = await getCachedSpecies();
  if (cached) {
    return cached.find((s) => s.id === id) || null;
  }

  return null;
}

/**
 * Search fish species by name.
 */
export async function searchFishSpecies(query: string): Promise<EnhancedFishSpecies[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      return await searchSpeciesFromSupabase(query);
    } catch (error) {
      console.warn('⚠️ Failed to search species from Supabase:', error);
    }
  }

  // Search in cache
  const cached = await getCachedSpecies();
  if (cached) {
    const lowerQuery = query.toLowerCase();
    return cached.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.scientificName.toLowerCase().includes(lowerQuery) ||
        s.commonNames.some((cn) => cn.toLowerCase().includes(lowerQuery))
    );
  }

  return [];
}

/**
 * Refresh the species cache from Supabase.
 */
export async function refreshSpeciesCache(): Promise<boolean> {
  const connected = await isSupabaseConnected();

  if (!connected) {
    console.warn('⚠️ Cannot refresh cache - no connection');
    return false;
  }

  try {
    const species = await fetchSpeciesFromSupabase();
    await cacheSpecies(species);
    console.log('✅ Fish species cache refreshed');
    return true;
  } catch (error) {
    console.error('Failed to refresh species cache:', error);
    return false;
  }
}
