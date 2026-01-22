// constants/gearOptions.ts
//
// NC DMF Gear Type options with official codes.
// These codes are required for DMF ArcGIS submission when Hook & Line is not used.
//

export interface GearOption {
  /** DMF gear code (submitted to ArcGIS) */
  value: string;
  /** Display label shown to user */
  label: string;
}

/**
 * Official NC DMF Gear Type options
 *
 * Each gear type has a specific code that must be submitted to the DMF ArcGIS API.
 * The `value` field contains the code, `label` contains the display name.
 *
 * Note: "Hook & line" (code "1") is handled separately via the Hook field.
 * When Hook = "Yes", the Gear field should be null.
 * When Hook = "No", one of these gear codes must be provided.
 *
 * Source: NC DMF Mandatory Harvest Reporting system
 */
export const GEAR_OPTIONS: readonly GearOption[] = [
  { value: "1", label: "Hook & Line" },
  { value: "2", label: "Dip Net, A-frame Net" },
  { value: "3", label: "Cast Net" },
  { value: "4", label: "Gill Net" },
  { value: "5", label: "Seine" },
  { value: "6", label: "Trawl" },
  { value: "7", label: "Trap" },
  { value: "8", label: "Gig/Spear" },
  { value: "9", label: "Hand" },
  { value: "10", label: "Other" },
] as const;

/**
 * Gear options excluding Hook & Line
 * (for use in gear picker when Hook & Line is not selected)
 */
export const NON_HOOK_GEAR_OPTIONS: readonly GearOption[] = GEAR_OPTIONS.filter(
  opt => opt.value !== "1"
);

/**
 * Get just the display labels for picker components
 * (for backwards compatibility with existing UI)
 */
export const GEAR_LABELS: readonly string[] = GEAR_OPTIONS.map(opt => opt.label);

/**
 * Labels for non-hook gear types
 */
export const NON_HOOK_GEAR_LABELS: readonly string[] = NON_HOOK_GEAR_OPTIONS.map(
  opt => opt.label
);

/**
 * The Hook & Line gear code
 */
export const HOOK_AND_LINE_CODE = "1";

/**
 * Find gear option by label (case-insensitive)
 *
 * @param label - The display label to search for
 * @returns The matching GearOption or undefined
 */
export function getGearByLabel(label: string | null | undefined): GearOption | undefined {
  if (!label) return undefined;
  const normalizedLabel = label.toLowerCase().trim();
  return GEAR_OPTIONS.find(
    opt => opt.label.toLowerCase() === normalizedLabel
  );
}

/**
 * Find gear option by DMF code
 *
 * @param code - The DMF gear code
 * @returns The matching GearOption or undefined
 */
export function getGearByCode(code: string | null | undefined): GearOption | undefined {
  if (!code) return undefined;
  return GEAR_OPTIONS.find(opt => opt.value === code);
}

/**
 * Get DMF gear code from a display label
 *
 * @param label - The display label
 * @returns The DMF code or undefined if not found
 */
export function getGearCodeFromLabel(label: string): string | undefined {
  return getGearByLabel(label)?.value;
}

/**
 * Get display label from a DMF gear code
 *
 * @param code - The DMF gear code
 * @returns The display label or undefined if not found
 */
export function getGearLabelFromCode(code: string): string | undefined {
  return getGearByCode(code)?.label;
}

/**
 * Check if a gear label represents Hook & Line
 *
 * @param label - The display label to check
 * @returns True if the label is Hook & Line
 */
export function isHookAndLine(label: string | null | undefined): boolean {
  if (!label) return false;
  const normalizedLabel = label.toLowerCase().trim();
  return normalizedLabel === "hook & line" || normalizedLabel === "hook and line";
}

/**
 * Map existing fishing method labels to DMF gear codes
 *
 * This helps bridge the current app's fishing method options
 * to the DMF gear code system.
 *
 * @param method - The fishing method label from current app
 * @returns The DMF gear code or undefined
 */
export function mapFishingMethodToGearCode(method: string | null | undefined): string | undefined {
  if (!method) return undefined;
  const normalizedMethod = method.toLowerCase().trim();

  // Direct mappings for current app's fishing methods
  const methodMappings: Record<string, string> = {
    "hook & line": "1",
    "hook and line": "1",
    "gig": "8",
    "gig/spear": "8",
    "cast net": "3",
    "gill net": "4",
    "other": "10",
  };

  return methodMappings[normalizedMethod] || getGearCodeFromLabel(method);
}

export default GEAR_OPTIONS;
