// services/bulletinService.ts
//
// Service for fetching app bulletins from Supabase.
// Returns empty array when offline (bulletins are network-only content).

import { supabase, isSupabaseConnected } from '../config/supabase';
import type { Bulletin } from '../types/bulletin';

// =============================================================================
// Transformer
// =============================================================================

/**
 * Transform a Supabase row into a typed Bulletin object.
 */
function transformBulletin(row: Record<string, unknown>): Bulletin {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    notes: (row.notes as string) ?? null,
    bulletinType: (row.bulletin_type as Bulletin['bulletinType']) ?? 'info',
    priority: (row.priority as Bulletin['priority']) ?? 'normal',
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
  };
}

// =============================================================================
// Priority ordering for sorting
// =============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  important: 1,
  normal: 2,
};

// =============================================================================
// Fetch Functions
// =============================================================================

/**
 * Fetch all active bulletins from Supabase.
 * Filters by is_active, effective_date, and expiration_date.
 * Orders by priority (urgent first), then display_order.
 */
export async function fetchActiveBulletins(): Promise<Bulletin[]> {
  const connected = await isSupabaseConnected();

  if (!connected) {
    return [];
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from('app_bulletins')
      .select('*')
      .eq('is_active', true)
      .or(`expiration_date.is.null,expiration_date.gte.${today}`)
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('Error fetching bulletins:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const bulletins = data.map((row) =>
      transformBulletin(row as Record<string, unknown>)
    );

    // Sort by priority (urgent first), then by display_order
    bulletins.sort((a, b) => {
      const priorityDiff =
        (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      if (priorityDiff !== 0) return priorityDiff;
      return a.displayOrder - b.displayOrder;
    });

    console.log(`📋 Fetched ${bulletins.length} active bulletin(s)`);
    return bulletins;
  } catch (error) {
    console.warn('Failed to fetch bulletins:', error);
    return [];
  }
}
