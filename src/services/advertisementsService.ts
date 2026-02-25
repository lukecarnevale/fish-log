// services/advertisementsService.ts
//
// Service for fetching advertisements from Supabase.
// Falls back to local data if Supabase is unavailable.

import { supabase, isSupabaseConnected } from '../config/supabase';
import { withConnection } from './base';
import { advertisements as localAdvertisements, Advertisement as LocalAdvertisement } from '../data/advertisementsData';
import {
  transformAdvertisement,
  transformAdvertisementSafe,
  type Advertisement,
  type AdPlacement,
  type AdCategory,
} from './transformers/advertisementTransformer';

// =============================================================================
// Types
// =============================================================================

// Re-export types for backwards compatibility
export type { Advertisement, AdPlacement, AdCategory };

/**
 * Convert local advertisement to the new format.
 */
function convertLocalAdvertisement(local: LocalAdvertisement): Advertisement {
  return {
    id: local.id,
    companyName: local.companyName,
    promoText: local.promoText,
    promoCode: local.promoCode,
    linkUrl: local.linkUrl,
    imageUrl: '', // Local ads use require(), not URLs
    isActive: local.isActive,
    priority: local.priority || 99,
    placements: ['home'], // Default placement
    startDate: local.startDate,
    endDate: local.endDate,
    clickCount: 0,
    impressionCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Promotions Hub fields - use local ad extended fields if available
    category: (local as any).category || 'promotion',
    areaCodes: (local as any).areaCodes || [],
    description: (local as any).description,
    contactPhone: (local as any).contactPhone,
    contactEmail: (local as any).contactEmail,
    contactWebsite: (local as any).contactWebsite,
    featured: (local as any).featured || false,
    badgeText: (local as any).badgeText,
  };
}

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

  if (connected) {
    try {
      let query = supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .limit(100);

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
        throw error;
      }

      if (data && data.length > 0) {
        const ads = data
          .map(row => transformAdvertisementSafe(row as Record<string, unknown>))
          .filter((ad): ad is Advertisement => ad !== null);

        // Check if any image URLs are placeholder URLs (not yet configured)
        const hasPlaceholderUrls = ads.some(ad =>
          ad.imageUrl.includes('your-supabase-url') ||
          ad.imageUrl.includes('placeholder') ||
          !ad.imageUrl.startsWith('https://')
        );

        if (hasPlaceholderUrls) {
          console.log('📢 Supabase ads have placeholder URLs, using local data');
          throw new Error('Placeholder URLs detected');
        }

        console.log(`📢 Fetched ${ads.length} advertisements from Supabase`);
        return { advertisements: ads, fromCache: false };
      }

      // Supabase query succeeded but returned 0 active ads — this is a valid
      // "no active partnerships" state. Return empty so the UI hides the ad
      // section cleanly instead of falling through to stale local data.
      console.log('📢 No active advertisements in Supabase');
      return { advertisements: [], fromCache: false };
    } catch (error) {
      console.warn('Failed to fetch advertisements from Supabase, using local data:', error);
    }
  }

  // Fall back to local data only when Supabase is unreachable or errored.
  // This ensures offline users still see sponsor content.
  console.log('📢 Using local advertisement data (offline fallback)');
  const localAds = localAdvertisements
    .filter(ad => ad.isActive)
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
    .map(convertLocalAdvertisement);

  return { advertisements: localAds, fromCache: true };
}

/**
 * Fetch a single advertisement by ID.
 */
export async function fetchAdvertisementById(id: string): Promise<Advertisement | null> {
  const connected = await isSupabaseConnected();

  if (connected) {
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
  }

  // Fall back to local data
  const localAd = localAdvertisements.find(ad => ad.id === id);
  return localAd ? convertLocalAdvertisement(localAd) : null;
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
