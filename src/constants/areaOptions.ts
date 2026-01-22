// constants/areaOptions.ts
//
// NC DMF Area of Harvest options with official codes.
// These codes are required for DMF ArcGIS submission.
//

export interface AreaOption {
  /** DMF area code (submitted to ArcGIS) */
  value: string;
  /** Display label shown to user */
  label: string;
}

/**
 * Official NC DMF Area of Harvest options
 *
 * Each area has a specific code that must be submitted to the DMF ArcGIS API.
 * The `value` field contains the code, `label` contains the display name.
 *
 * Source: NC DMF Mandatory Harvest Reporting system
 */
export const AREA_OPTIONS: readonly AreaOption[] = [
  { value: "1", label: "Albemarle Sound" },
  { value: "2", label: "Alligator River" },
  { value: "80", label: "Back Bay" },
  { value: "3", label: "Bay River" },
  { value: "5", label: "Bogue Sound" },
  { value: "6", label: "Cape Fear River" },
  { value: "7", label: "Chowan River" },
  { value: "8", label: "Core Sound" },
  { value: "9", label: "Croatan Sound" },
  { value: "10", label: "Currituck Sound" },
  { value: "53", label: "Inland Waterway (Brunswick)" },
  { value: "54", label: "Inland Waterway (Onslow)" },
  { value: "13", label: "Lake Mattamuskeet" },
  { value: "11", label: "Lockwood's Folly River" },
  { value: "12", label: "Masonboro Sound" },
  { value: "29", label: "Neuse River" },
  { value: "30", label: "New River" },
  { value: "31", label: "Newport River" },
  { value: "43", label: "North River (Carteret County)" },
  { value: "22", label: "Ocean > 3 Miles (North of Cape Hatteras)" },
  { value: "23", label: "Ocean > 3 Miles (South of Cape Hatteras)" },
  { value: "20", label: "Ocean 0 - 3 Miles (North of Cape Hatteras)" },
  { value: "21", label: "Ocean 0 - 3 Miles (South of Cape Hatteras)" },
  { value: "33", label: "Pamlico River" },
  { value: "34", label: "Pamlico Sound" },
  { value: "35", label: "Pasquotank River" },
  { value: "36", label: "Perquimans River" },
  { value: "52", label: "Pungo River" },
  { value: "37", label: "Roanoke River" },
  { value: "45", label: "Roanoke Sound" },
  { value: "38", label: "Shallotte River" },
  { value: "39", label: "Stump Sound (New River Inlet to Surf City)" },
  { value: "41", label: "Topsail Sound (Surf City to Topsail Inlet)" },
  { value: "42", label: "White Oak River" },
] as const;

/**
 * Get just the display labels for picker components
 * (for backwards compatibility with existing UI)
 */
export const AREA_LABELS: readonly string[] = AREA_OPTIONS.map(opt => opt.label);

/**
 * Find area option by label (case-insensitive)
 *
 * @param label - The display label to search for
 * @returns The matching AreaOption or undefined
 */
export function getAreaByLabel(label: string | null | undefined): AreaOption | undefined {
  if (!label) return undefined;
  const normalizedLabel = label.toLowerCase().trim();
  return AREA_OPTIONS.find(
    opt => opt.label.toLowerCase() === normalizedLabel
  );
}

/**
 * Find area option by DMF code
 *
 * @param code - The DMF area code
 * @returns The matching AreaOption or undefined
 */
export function getAreaByCode(code: string | null | undefined): AreaOption | undefined {
  if (!code) return undefined;
  return AREA_OPTIONS.find(opt => opt.value === code);
}

/**
 * Get DMF area code from a display label
 *
 * @param label - The display label
 * @returns The DMF code or undefined if not found
 */
export function getAreaCodeFromLabel(label: string): string | undefined {
  return getAreaByLabel(label)?.value;
}

/**
 * Get display label from a DMF area code
 *
 * @param code - The DMF area code
 * @returns The display label or undefined if not found
 */
export function getAreaLabelFromCode(code: string): string | undefined {
  return getAreaByCode(code)?.label;
}

export default AREA_OPTIONS;
