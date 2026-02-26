// services/advertisementsService.ts
//
// Service for fetching advertisements from Supabase.
// Shows no ads when offline — avoids displaying stale promo codes or expired deals.

import { supabase, isSupabaseConnected } from '../config/supabase';
import { withConnection } from './base';
import {
  transformAdvertisement,
  type Advertisement,
  type AdPlacement,
} from './transformers/advertisementTransformer';

// =============================================================================
// Types
// =============================================================================

// Re-export types for backwards compatibility
export type { Advertisement, AdPlacement };

// =============================================================================
// Fetch Functions
// =============================================================================

/**
 * Fetch active advertisements from Supabase.
 * Optionally filter by placement location.
 */
export async function fetchAdvertisements(
  placement?: AdPlacement
): Promise<{ advertisements: Advertisement[]; fromCache: boolean }> {
  const connected = await isSupabaseConnected();

  if (!connected) {
    // No connection — show no ads rather than risk stale promo codes or expired deals
    console.log('📢 Offline — skipping advertisements');
    return { advertisements: [], fromCache: false };
  }

  try {
    let query = supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    // Filter by placement if specified
    if (placement) {
      query = query.contains('placements', [placement]);
    }

    // Filter by date range
    const now = new Date().toISOString();
    query = query
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`);

    const { data, error } = await query;

    if (error) {
      console.warn('Error fetching advertisements:', error.message);
      return { advertisements: [], fromCache: false };
    }

    if (data && data.length > 0) {
      const ads = data.map(row => transformAdvertisement(row as Record<string, unknown>));
      console.log(`📢 Fetched ${ads.length} advertisements from Supabase`);
      return { advertisements: ads, fromCache: false };
    }

    console.log('📢 No active advertisements in Supabase');
    return { advertisements: [], fromCache: false };
  } catch (error) {
    console.warn('Failed to fetch advertisements:', error);
    return { advertisements: [], fromCache: false };
  }
}

/**
 * Fetch a single advertisement by ID.
 */
export async function fetchAdvertisementById(id: string): Promise<Advertisement | null> {
  const connected = await isSupabaseConnected();

  if (!connected) {
    return null;
  }

  const result = await withConnection(
    async () =>
      await supabase
        .from('advertisements')
        .select('*')
        .eq('id', id)
        .single(),
    `fetchAdvertisementById(${id})`,
    null
  );

  if (result) {
    return transformAdvertisement(result as Record<string, unknown>);
  }

  return null;
}

/**
 * Track an advertisement click.
 * Uses an atomic RPC function to safely increment the counter.
 */
export async function trackAdClick(adId: string): Promise<void> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const { error } = await supabase.rpc('increment_ad_click', { ad_id: adId });
      if (error) {
        console.warn('Failed to track ad click via RPC:', error.message);
        // Fallback: raw SQL increment to avoid race conditions
        const { error: sqlError } = await supabase
          .from('advertisements')
          .update({ click_count: (await getCurrentCount(adId, 'click_count')) + 1 })
          .eq('id', adId);
        if (sqlError) {
          console.warn('Fallback click tracking also failed:', sqlError.message);
          return;
        }
      }
      console.log(`📊 Tracked click for ad: ${adId}`);
    } catch (error) {
      console.warn('Failed to track ad click:', error);
    }
  }
}

/**
 * Track an advertisement impression.
 * Uses an atomic RPC function to safely increment the counter.
 */
export async function trackAdImpression(adId: string): Promise<void> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const { error } = await supabase.rpc('increment_ad_impression', { ad_id: adId });
      if (error) {
        console.warn('Failed to track ad impression via RPC:', error.message);
        // Fallback: read-then-write increment
        const { error: sqlError } = await supabase
          .from('advertisements')
          .update({ impression_count: (await getCurrentCount(adId, 'impression_count')) + 1 })
          .eq('id', adId);
        if (sqlError) {
          console.warn('Fallback impression tracking also failed:', sqlError.message);
        }
      }
    } catch (error) {
      console.warn('Failed to track ad impression:', error);
    }
  }
}

/**
 * Helper to read the current count for fallback increment.
 * Only used when the RPC function is unavailable.
 */
async function getCurrentCount(adId: string, column: 'click_count' | 'impression_count'): Promise<number> {
  const { data } = await supabase
    .from('advertisements')
    .select(column)
    .eq('id', adId)
    .single();
  return (data as Record<string, number> | null)?.[column] ?? 0;
}
