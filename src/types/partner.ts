// types/partner.ts
//
// Type definitions for the Partners table (Supabase).
// Used in the "Our Partners" section of the app footer.
//

/**
 * A partner/sponsor displayed in the app footer.
 * Maps to the `partners` table in Supabase.
 */
export interface Partner {
  id: string;
  name: string;
  iconUrl: string;
  websiteUrl: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Transform a raw Supabase `partners` row into a typed Partner object.
 */
export function transformPartner(row: Record<string, unknown>): Partner {
  return {
    id: row.id as string,
    name: row.name as string,
    iconUrl: row.icon_url as string,
    websiteUrl: row.website_url as string,
    displayOrder: row.display_order as number,
    isActive: row.is_active as boolean,
  };
}
