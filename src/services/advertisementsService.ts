// services/advertisementsService.ts
//
// Service for fetching advertisements from Supabase.
// Falls back to local data if Supabase is unavailable.

import { supabase, isSupabaseConnected } from '../config/supabase';
import { advertisements as localAdvertisements, Advertisement as LocalAdvertisement } from '../data/advertisementsData';

// =============================================================================
// Types
// =============================================================================

/**
 * Advertisement placement locations in the app.
 */
export type AdPlacement = 'home' | 'catch_feed' | 'past_reports' | 'more_menu' | 'profile';

/**
 * Advertisement from the database.
 */
export interface Advertisement {
  id: string;
  companyName: string;
  promoText: string;
  promoCode?: string;
  linkUrl: string;
  imageUrl: string;
  isActive: boolean;
  priority: number;
  placements: AdPlacement[];
  startDate?: string;
  endDate?: string;
  clickCount: number;
  impressionCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transform a Supabase row to Advertisement type.
 */
function transformAdvertisement(row: Record<string, unknown>): Advertisement {
  return {
    id: row.id as string,
    companyName: row.company_name as string,
    promoText: row.promo_text as string,
    promoCode: row.promo_code as string | undefined,
    linkUrl: row.link_url as string,
    imageUrl: row.image_url as string,
    isActive: row.is_active as boolean,
    priority: row.priority as number,
    placements: row.placements as AdPlacement[],
    startDate: row.start_date as string | undefined,
    endDate: row.end_date as string | undefined,
    clickCount: row.click_count as number,
    impressionCount: row.impression_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

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
        throw error;
      }

      if (data && data.length > 0) {
        const ads = data.map(row => transformAdvertisement(row as Record<string, unknown>));

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
    } catch (error) {
      console.warn('Failed to fetch advertisements from Supabase, using local data:', error);
    }
  }

  // Fall back to local data
  console.log('📢 Using local advertisement data');
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
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.warn('Error fetching advertisement:', error.message);
        return null;
      }

      if (data) {
        return transformAdvertisement(data as Record<string, unknown>);
      }
    } catch (error) {
      console.warn('Failed to fetch advertisement from Supabase:', error);
    }
  }

  // Fall back to local data
  const localAd = localAdvertisements.find(ad => ad.id === id);
  return localAd ? convertLocalAdvertisement(localAd) : null;
}

/**
 * Track an advertisement click.
 */
export async function trackAdClick(adId: string): Promise<void> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const { error } = await supabase.rpc('increment_ad_click', { ad_id: adId });
      if (error) {
        // Try manual update if RPC doesn't exist
        await supabase
          .from('advertisements')
          .update({ click_count: supabase.rpc('increment', { x: 1 }) })
          .eq('id', adId);
      }
      console.log(`📊 Tracked click for ad: ${adId}`);
    } catch (error) {
      console.warn('Failed to track ad click:', error);
    }
  }
}

/**
 * Track an advertisement impression.
 */
export async function trackAdImpression(adId: string): Promise<void> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const { error } = await supabase.rpc('increment_ad_impression', { ad_id: adId });
      if (error) {
        // Try manual update if RPC doesn't exist
        await supabase
          .from('advertisements')
          .update({ impression_count: supabase.rpc('increment', { x: 1 }) })
          .eq('id', adId);
      }
    } catch (error) {
      // Silently ignore impression tracking failures
    }
  }
}
