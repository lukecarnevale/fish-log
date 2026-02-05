// services/fishSpeciesService.ts
//
// Service for fetching fish species data from Supabase.
// Includes caching for offline support.
//

import { supabase, isSupabaseConnected } from '../config/supabase';
import { createCache } from '../utils/cache';
import { EnhancedFishSpecies } from '../types/fishSpecies';
import { transformFishSpecies, type SupabaseFishSpeciesRow } from './transformers/fishSpeciesTransformer';

// Cache instance for fish species with 7-day TTL
const speciesCache = createCache<EnhancedFishSpecies[]>('@fish_species_cache', {
  ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Re-export SupabaseFishSpeciesRow from the transformers module for backwards compatibility.
 * See fishSpeciesTransformer.ts for type definition details.
 */
export type { SupabaseFishSpeciesRow };

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * Re-export transformFishSpecies from the transformers module.
 * See fishSpeciesTransformer.ts for transformation details.
 */
export { transformFishSpecies };

/**
 * Clear the species cache.
 */
export async function clearSpeciesCache(): Promise<void> {
  await speciesCache.clear();
  console.log('🗑️ Fish species cache cleared');
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
      await speciesCache.set(species);
      console.log('✅ Fish species fetched from Supabase');
      return species;
    } catch (error) {
      console.warn('⚠️ Failed to fetch from Supabase, using cache:', error);
    }
  }

  // Try cache
  const cached = await speciesCache.get();
  if (cached) {
    console.log('📦 Using cached fish species data');
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
  const cached = await speciesCache.get();
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
  const cached = await speciesCache.get();
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
    await speciesCache.set(species);
    console.log('✅ Fish species cache refreshed');
    return true;
  } catch (error) {
    console.error('Failed to refresh species cache:', error);
    return false;
  }
}
