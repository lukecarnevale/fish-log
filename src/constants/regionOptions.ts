// constants/regionOptions.ts
//
// NC coastal region groupings for the Promotions Hub area filter.
// These are simplified regions that map to groups of DMF area codes,
// used for filtering promotions/charters by geographic area.

export interface RegionOption {
  /** Region code used in advertisements.area_codes */
  value: string;
  /** Display label */
  label: string;
  /** Short label for pills/chips */
  shortLabel: string;
}

/**
 * NC Coastal regions for promotions filtering.
 *
 * These are broad geographic regions that advertisers select when
 * targeting their promotions to specific areas of the NC coast.
 */
export const REGION_OPTIONS: readonly RegionOption[] = [
  { value: 'OBX', label: 'Outer Banks', shortLabel: 'OBX' },
  { value: 'NEC', label: 'Northeast Coast', shortLabel: 'NE Coast' },
  { value: 'CRC', label: 'Crystal Coast', shortLabel: 'Crystal Coast' },
  { value: 'WIL', label: 'Wilmington Area', shortLabel: 'Wilmington' },
  { value: 'BRN', label: 'Brunswick Coast', shortLabel: 'Brunswick' },
  { value: 'PAM', label: 'Pamlico Sound', shortLabel: 'Pamlico' },
  { value: 'ALB', label: 'Albemarle Region', shortLabel: 'Albemarle' },
] as const;

/**
 * Get region by code
 */
export function getRegionByCode(code: string): RegionOption | undefined {
  return REGION_OPTIONS.find(r => r.value === code);
}

/**
 * Get display label for a region code
 */
export function getRegionLabel(code: string): string {
  return getRegionByCode(code)?.label || code;
}
