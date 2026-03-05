// services/speciesBulletinService.ts
//
// Lightweight service for fetching bulletins that affect a specific species.
// Uses the affected_species_ids array on app_bulletins for efficient lookups.

import { supabase, isSupabaseConnected } from '../config/supabase';
import { transformBulletin, sortBulletinsByPriority } from './bulletinService';
import type { Bulletin } from '../types/bulletin';

// =============================================================================
// Fetch
// =============================================================================

/**
 * Fetch all active bulletins that affect a specific species.
 * Queries app_bulletins WHERE speciesId = ANY(affected_species_ids).
 * Returns bulletins sorted by priority then display_order.
 */
export async function fetchBulletinsForSpecies(
  speciesId: string
): Promise<Bulletin[]> {
  const connected = await isSupabaseConnected();
  if (!connected) return [];

  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('app_bulletins')
      .select('*')
      .contains('affected_species_ids', [speciesId])
      .eq('is_active', true)
      .or(`expiration_date.is.null,expiration_date.gte.${today}`)
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('Error fetching species bulletins:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    const bulletins = data.map((row) =>
      transformBulletin(row as Record<string, unknown>)
    );

    return sortBulletinsByPriority(bulletins);
  } catch (error) {
    console.warn('Failed to fetch species bulletins:', error);
    return [];
  }
}
