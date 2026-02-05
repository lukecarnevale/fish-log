/**
 * src/services/transformers/advertisementTransformer.ts
 *
 * Transformer for converting Supabase advertisement rows to camelCase TypeScript types.
 * Consolidates snake_case -> camelCase transformations for the Advertisement entity.
 */

export type AdPlacement = 'home' | 'catch_feed' | 'past_reports' | 'more_menu' | 'profile';

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
  startDate?: string;
  endDate?: string;
  clickCount: number;
  impressionCount: number;
  createdAt: string;
  updatedAt: string;
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
  start_date?: string;
  end_date?: string;
  click_count: number;
  impression_count: number;
  created_at: string;
  updated_at: string;
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
 * Transform a list of Supabase advertisement rows to camelCase Advertisement types.
 */
export function transformAdvertisementList(rows: Record<string, unknown>[]): Advertisement[] {
  return rows.map(transformAdvertisement);
}
