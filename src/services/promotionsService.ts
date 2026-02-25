// services/promotionsService.ts
//
// Service for the Promotions Hub — fetches promotions filtered by area/category,
// and handles partner inquiry submissions.

import { supabase, isSupabaseConnected } from '../config/supabase';
import { advertisements as localAdvertisements } from '../data/advertisementsData';
import {
  transformAdvertisementSafe,
  type Advertisement,
  type AdCategory,
} from './transformers/advertisementTransformer';
import type { PartnerInquiry } from '../types/partnerInquiry';
import { PartnerInquirySchema } from './validators/promotionSchemas';
import { addToInquiryQueue } from './partnerInquiryQueue';

// Re-export for convenience
export type { Advertisement, AdCategory };

// Valid categories for local data validation
const VALID_CATEGORIES: AdCategory[] = ['promotion', 'charter', 'gear', 'service', 'experience'];

function validateCategory(value: unknown): AdCategory {
  return VALID_CATEGORIES.includes(value as AdCategory) ? (value as AdCategory) : 'promotion';
}

// =============================================================================
// Fetch Promotions
// =============================================================================

/**
 * Fetch promotions for the Promotions Hub.
 * Supports filtering by area region code and/or category.
 * Results are sorted: featured first, then by priority.
 */
export async function fetchPromotions(options?: {
  area?: string;
  category?: AdCategory;
  limit?: number;
  offset?: number;
}): Promise<{ promotions: Advertisement[]; fromCache: boolean; total?: number }> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      let query = supabase
        .from('advertisements')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('priority', { ascending: true })
        .limit(options?.limit || 100);

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      // Filter by area if specified
      if (options?.area) {
        query = query.contains('area_codes', [options.area]);
      }

      // Filter by category if specified
      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data, error, count } = await query;

      if (error) {
        console.warn('Error fetching promotions:', error.message);
        throw error;
      }

      if (data && data.length > 0) {
        // Use safe transformer that skips invalid rows
        const promotions = data
          .map(row => transformAdvertisementSafe(row as Record<string, unknown>))
          .filter((ad): ad is Advertisement => ad !== null);

        if (promotions.length === 0) {
          console.warn('All advertisements failed validation, using local fallback');
          throw new Error('No valid advertisements');
        }

        // Check for placeholder URLs
        const hasPlaceholderUrls = promotions.some(ad =>
          ad.imageUrl.includes('your-supabase-url') ||
          ad.imageUrl.includes('placeholder') ||
          (!ad.imageUrl.startsWith('https://') && ad.imageUrl.length > 0)
        );

        if (hasPlaceholderUrls) {
          console.log('🏪 Promotions have placeholder URLs, using local data');
          throw new Error('Placeholder URLs detected');
        }

        // Filter by date range in JS for correct AND logic
        const now = new Date();
        const dateFiltered = promotions.filter(ad => {
          const startOk = !ad.startDate || new Date(ad.startDate) <= now;
          const endOk = !ad.endDate || new Date(ad.endDate) >= now;
          return startOk && endOk;
        });

        if (dateFiltered.length !== promotions.length) {
          console.log(`🏪 Filtered ${promotions.length - dateFiltered.length} expired promotions`);
        }

        console.log(`🏪 Fetched ${dateFiltered.length} promotions from Supabase`);
        return { promotions: dateFiltered, fromCache: false, total: count ?? undefined };
      }

      // No results from Supabase — fall through to local data
      // (Supabase category/area data may not be populated yet)
      console.log('🏪 No matching promotions in Supabase, falling back to local data');
    } catch (error) {
      console.warn('Failed to fetch promotions from Supabase, using local data:', error);
    }
  }

  // Fall back to local data
  console.log('🏪 Using local promotion data (offline fallback)');
  const localPromos = localAdvertisements
    .filter(ad => ad.isActive)
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
    .map(local => ({
      id: local.id,
      companyName: local.companyName,
      promoText: local.promoText,
      promoCode: local.promoCode,
      linkUrl: local.linkUrl,
      imageUrl: '',
      isActive: local.isActive,
      priority: local.priority || 99,
      placements: ['home' as const],
      startDate: local.startDate,
      endDate: local.endDate,
      clickCount: 0,
      impressionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: validateCategory((local as any).category),
      areaCodes: Array.isArray((local as any).areaCodes) ? (local as any).areaCodes : [],
      description: typeof (local as any).description === 'string' ? (local as any).description : undefined,
      contactPhone: typeof (local as any).contactPhone === 'string' ? (local as any).contactPhone : undefined,
      contactEmail: typeof (local as any).contactEmail === 'string' ? (local as any).contactEmail : undefined,
      contactWebsite: typeof (local as any).contactWebsite === 'string' ? (local as any).contactWebsite : undefined,
      featured: (local as any).featured === true,
      badgeText: typeof (local as any).badgeText === 'string' ? (local as any).badgeText : undefined,
    }));

  // Apply local filters
  let filtered = localPromos;
  if (options?.category) {
    filtered = filtered.filter(p => p.category === options.category);
  }
  if (options?.area) {
    filtered = filtered.filter(p => p.areaCodes.length === 0 || p.areaCodes.includes(options.area!));
  }

  return { promotions: filtered, fromCache: true };
}

/**
 * Get the available categories with counts from the current promotions.
 */
export function getCategoryLabel(category: AdCategory): string {
  const labels: Record<AdCategory, string> = {
    promotion: 'Deals',
    charter: 'Charters',
    gear: 'Gear',
    service: 'Services',
    experience: 'Experiences',
  };
  return labels[category] || category;
}

/**
 * Get Feather icon name for a category.
 */
export function getCategoryIcon(category: AdCategory): string {
  const icons: Record<AdCategory, string> = {
    promotion: 'tag',
    charter: 'navigation',
    gear: 'tool',
    service: 'life-buoy',
    experience: 'compass',
  };
  return icons[category] || 'tag';
}

// =============================================================================
// Partner Inquiries
// =============================================================================

/**
 * Map Supabase error codes to user-friendly messages.
 */
function mapSupabaseError(error: { code?: string; message?: string }): string {
  if (error.code === '23505') {
    return 'This email has already submitted an inquiry.';
  }
  if (error.code === '23502') {
    return 'Please fill in all required fields.';
  }
  return 'Submission failed. Please try again.';
}

/**
 * Submit a partner inquiry to Supabase.
 * Validates input, queues offline, and maps errors to user-friendly messages.
 */
export async function submitPartnerInquiry(
  inquiry: PartnerInquiry,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // Validate input via Zod schema before touching the database
  const parsed = PartnerInquirySchema.safeParse(inquiry);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message || 'Invalid form data';
    console.warn('Partner inquiry validation failed:', parsed.error.errors);
    return { success: false, error: firstError };
  }

  const connected = await isSupabaseConnected();

  // Queue offline for later sync
  if (!connected) {
    console.log('🤝 No connection, queuing partner inquiry for later');
    return await addToInquiryQueue(inquiry);
  }

  try {
    const { error } = await supabase.from('partner_inquiries').insert({
      business_name: inquiry.businessName,
      contact_name: inquiry.contactName,
      email: inquiry.email,
      phone: inquiry.phone || null,
      website: inquiry.website || null,
      business_type: inquiry.businessType,
      area_codes: inquiry.areaCodes,
      message: inquiry.message,
      user_id: userId || null,
    });

    if (error) {
      // Network-related errors: queue for retry
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        console.warn('Network error submitting inquiry, queuing for retry');
        return await addToInquiryQueue(inquiry);
      }
      console.error('Failed to submit partner inquiry:', error.message);
      return { success: false, error: mapSupabaseError(error) };
    }

    console.log('🤝 Partner inquiry submitted successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to submit partner inquiry:', error);
    // Queue for retry on unexpected errors
    return await addToInquiryQueue(inquiry);
  }
}
