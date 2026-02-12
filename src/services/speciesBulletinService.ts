// services/speciesBulletinService.ts
//
// Lightweight service for fetching bulletins that affect a specific species.
// Uses the affected_species_ids array on app_bulletins for efficient lookups.

import { supabase, isSupabaseConnected } from '../config/supabase';
import type { Bulletin, BulletinType, BulletinPriority } from '../types/bulletin';

// =============================================================================
// Priority ordering (matches bulletinService.ts)
// =============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  important: 1,
  normal: 2,
};

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

    const bulletins: Bulletin[] = data.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string) ?? null,
      notes: (row.notes as string) ?? null,
      bulletinType: (row.bulletin_type as BulletinType) ?? 'info',
      priority: (row.priority as BulletinPriority) ?? 'normal',
      imageUrls: (row.image_urls as string[]) ?? [],
      sourceUrl: (row.source_url as string) ?? null,
      sourceLabel: (row.source_label as string) ?? null,
      effectiveDate: (row.effective_date as string) ?? null,
      expirationDate: (row.expiration_date as string) ?? null,
      isActive: (row.is_active as boolean) ?? true,
      displayOrder: (row.display_order as number) ?? 0,
      affectedSpeciesIds: (row.affected_species_ids as string[]) ?? [],
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
      updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    }));

    // Sort by priority (urgent first), then display_order
    bulletins.sort((a, b) => {
      const priorityDiff =
        (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      if (priorityDiff !== 0) return priorityDiff;
      return a.displayOrder - b.displayOrder;
    });

    return bulletins;
  } catch (error) {
    console.warn('Failed to fetch species bulletins:', error);
    return [];
  }
}
