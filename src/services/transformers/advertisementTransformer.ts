/**
 * src/services/transformers/advertisementTransformer.ts
 *
 * Transformer for converting Supabase advertisement rows to camelCase TypeScript types.
 * Consolidates snake_case -> camelCase transformations for the Advertisement entity.
 * Uses Zod validation to ensure data integrity at runtime.
 */

import { AdvertisementRowSchema } from '../validators/promotionSchemas';

export type AdPlacement = 'home' | 'catch_feed' | 'past_reports' | 'more_menu' | 'profile' | 'promotions';

export type AdCategory = 'promotion' | 'charter' | 'gear' | 'service' | 'experience';

/**
 * Advertisement type (camelCase, TypeScript-friendly).
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
  location?: string;
  startDate?: string;
  endDate?: string;
  clickCount: number;
  impressionCount: number;
  createdAt: string;
  updatedAt: string;
  // Promotions Hub fields
  category: AdCategory;
  areaCodes: string[];
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWebsite?: string;
  featured: boolean;
  badgeText?: string;
}

/**
 * Raw Supabase advertisement row (snake_case).
 */
export interface SupabaseAdvertisement {
  id: string;
  company_name: string;
  promo_text: string;
  promo_code?: string;
  link_url: string;
  image_url: string;
  is_active: boolean;
  priority: number;
  placements: AdPlacement[];
  location?: string;
  start_date?: string;
  end_date?: string;
  click_count: number;
  impression_count: number;
  created_at: string;
  updated_at: string;
  // Promotions Hub fields
  category?: string;
  area_codes?: string[];
  description?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_website?: string;
  featured?: boolean;
  badge_text?: string;
}

/**
 * Transform a Supabase advertisement row to the camelCase Advertisement type.
 *
 * Handles the following field mappings:
 * - company_name -> companyName
 * - promo_text -> promoText
 * - promo_code -> promoCode
 * - link_url -> linkUrl
 * - image_url -> imageUrl
 * - is_active -> isActive
 * - start_date -> startDate
 * - end_date -> endDate
 * - click_count -> clickCount
 * - impression_count -> impressionCount
 * - created_at -> createdAt
 * - updated_at -> updatedAt
 */
export function transformAdvertisement(row: Record<string, unknown>): Advertisement {
  // Validate with Zod schema for runtime safety
  const validated = AdvertisementRowSchema.parse(row);

  return {
    id: validated.id,
    companyName: validated.company_name,
    promoText: validated.promo_text,
    promoCode: validated.promo_code ?? undefined,
    linkUrl: validated.link_url ?? '',
    imageUrl: validated.image_url ?? '',
    isActive: validated.is_active,
    priority: validated.priority,
    placements: validated.placements as AdPlacement[],
    location: validated.location ?? undefined,
    startDate: validated.start_date ?? undefined,
    endDate: validated.end_date ?? undefined,
    clickCount: validated.click_count,
    impressionCount: validated.impression_count,
    createdAt: validated.created_at,
    updatedAt: validated.updated_at,
    // Promotions Hub fields
    category: validated.category as AdCategory,
    areaCodes: validated.area_codes,
    description: validated.description ?? undefined,
    contactPhone: validated.contact_phone ?? undefined,
    contactEmail: validated.contact_email ?? undefined,
    contactWebsite: validated.contact_website ?? undefined,
    featured: validated.featured,
    badgeText: validated.badge_text ?? undefined,
  };
}

/**
 * Safe version of transformAdvertisement that returns null on invalid data
 * instead of throwing. Use when processing lists where some rows may be corrupted.
 */
export function transformAdvertisementSafe(row: Record<string, unknown>): Advertisement | null {
  try {
    return transformAdvertisement(row);
  } catch (error) {
    console.warn('Skipping invalid advertisement:', (error as Error).message);
    return null;
  }
}

/**
 * Transform a list of Supabase advertisement rows to camelCase Advertisement types.
 * Skips invalid rows gracefully using transformAdvertisementSafe.
 */
export function transformAdvertisementList(rows: Record<string, unknown>[]): Advertisement[] {
  return rows
    .map(transformAdvertisementSafe)
    .filter((ad): ad is Advertisement => ad !== null);
}
