// constants/species.ts
//
// NC DMF Species definitions with official field names.
// Maps user-friendly species names to DMF ArcGIS field names.
//

export interface SpeciesInfo {
  /** Unique identifier for the species */
  id: string;
  /** Display name shown to user */
  displayName: string;
  /** Alternative names users might search for */
  alternativeNames: string[];
  /** DMF field name for the count (e.g., "NumRD" for Red Drum) */
  dmfCountField: string;
  /** DMF field name for the yes/no flag (e.g., "RedDr") - sent as null */
  dmfFlagField: string;
}

/**
 * Official NC DMF reportable species
 *
 * These are the five species that require mandatory harvest reporting in NC.
 * Each species has a specific field name for the DMF ArcGIS API.
 *
 * DMF Field Pattern:
 * - Count field (e.g., NumRD): String containing the number harvested
 * - Flag field (e.g., RedDr): Always sent as null (legacy field)
 *
 * Source: NC DMF Mandatory Harvest Reporting system
 */
export const SPECIES: readonly SpeciesInfo[] = [
  {
    id: "red_drum",
    displayName: "Red Drum",
    alternativeNames: ["Redfish", "Channel Bass", "Puppy Drum", "Red"],
    dmfCountField: "NumRD",
    dmfFlagField: "RedDr",
  },
  {
    id: "flounder",
    displayName: "Flounder",
    alternativeNames: ["Southern Flounder", "Summer Flounder", "Fluke"],
    dmfCountField: "NumF",
    dmfFlagField: "Flound",
  },
  {
    id: "spotted_seatrout",
    displayName: "Spotted Seatrout",
    alternativeNames: ["Speckled Trout", "Specks", "Specs", "Speck"],
    dmfCountField: "NumSS",
    dmfFlagField: "SST",
  },
  {
    id: "weakfish",
    displayName: "Weakfish",
    alternativeNames: ["Gray Trout", "Grey Trout", "Squeteague"],
    dmfCountField: "NumW",
    dmfFlagField: "Weakf",
  },
  {
    id: "striped_bass",
    displayName: "Striped Bass",
    alternativeNames: ["Striper", "Rockfish", "Rock", "Linesider"],
    dmfCountField: "NumSB",
    dmfFlagField: "Striped",
  },
] as const;

/**
 * Display names for the species picker
 * Matches the current app's species list format
 */
export const SPECIES_DISPLAY_NAMES: readonly string[] = [
  "Red Drum",
  "Flounder",
  "Spotted Seatrout (speckled trout)",
  "Striped Bass",
  "Weakfish (gray trout)",
];

/**
 * Map from display name (including parenthetical) to species ID
 */
const DISPLAY_NAME_TO_ID: Record<string, string> = {
  "Red Drum": "red_drum",
  "Flounder": "flounder",
  "Southern Flounder": "flounder",
  "Spotted Seatrout (speckled trout)": "spotted_seatrout",
  "Spotted Seatrout": "spotted_seatrout",
  "Striped Bass": "striped_bass",
  "Weakfish (gray trout)": "weakfish",
  "Weakfish": "weakfish",
};

/**
 * Find species by ID
 *
 * @param id - The species ID (e.g., "red_drum")
 * @returns The matching SpeciesInfo or undefined
 */
export function getSpeciesById(id: string | null | undefined): SpeciesInfo | undefined {
  if (!id) return undefined;
  return SPECIES.find(s => s.id === id);
}

/**
 * Find species by display name (handles parenthetical variations)
 *
 * @param displayName - The display name from the picker
 * @returns The matching SpeciesInfo or undefined
 */
export function getSpeciesByDisplayName(displayName: string | null | undefined): SpeciesInfo | undefined {
  if (!displayName) return undefined;

  const id = DISPLAY_NAME_TO_ID[displayName];
  if (id) {
    return getSpeciesById(id);
  }

  // Fallback: try matching by base display name
  const normalizedName = displayName.toLowerCase().trim();
  return SPECIES.find(
    s => s.displayName.toLowerCase() === normalizedName ||
         s.alternativeNames.some(alt => alt.toLowerCase() === normalizedName)
  );
}

/**
 * Get DMF count field name for a species
 *
 * @param displayName - The display name from the picker
 * @returns The DMF field name (e.g., "NumRD") or undefined
 */
export function getDMFCountField(displayName: string): string | undefined {
  return getSpeciesByDisplayName(displayName)?.dmfCountField;
}

/**
 * Get DMF flag field name for a species
 *
 * @param displayName - The display name from the picker
 * @returns The DMF field name (e.g., "RedDr") or undefined
 */
export function getDMFFlagField(displayName: string): string | undefined {
  return getSpeciesByDisplayName(displayName)?.dmfFlagField;
}

/**
 * Species counts interface for form data
 */
export interface SpeciesCounts {
  redDrum: number;
  flounder: number;
  spottedSeatrout: number;
  weakfish: number;
  stripedBass: number;
}

/**
 * Create empty species counts object
 */
export function createEmptySpeciesCounts(): SpeciesCounts {
  return {
    redDrum: 0,
    flounder: 0,
    spottedSeatrout: 0,
    weakfish: 0,
    stripedBass: 0,
  };
}

/**
 * Map from species ID to SpeciesCounts key
 */
const SPECIES_ID_TO_COUNT_KEY: Record<string, keyof SpeciesCounts> = {
  red_drum: "redDrum",
  flounder: "flounder",
  spotted_seatrout: "spottedSeatrout",
  weakfish: "weakfish",
  striped_bass: "stripedBass",
};

/**
 * Get the SpeciesCounts key for a species display name
 *
 * @param displayName - The display name from the picker
 * @returns The key for SpeciesCounts object
 */
export function getSpeciesCountKey(displayName: string | null | undefined): keyof SpeciesCounts | undefined {
  if (!displayName) return undefined;
  const species = getSpeciesByDisplayName(displayName);
  if (species) {
    return SPECIES_ID_TO_COUNT_KEY[species.id];
  }
  return undefined;
}

/**
 * Aggregate fish entries by species into SpeciesCounts
 *
 * Takes the current app's fish entries format and produces
 * aggregated counts per species for DMF submission.
 *
 * @param entries - Array of fish entries with species and count
 * @returns Aggregated counts per species
 */
export function aggregateFishEntries(
  entries: Array<{ species: string; count: number }>
): SpeciesCounts {
  const counts = createEmptySpeciesCounts();

  for (const entry of entries) {
    const key = getSpeciesCountKey(entry.species);
    if (key) {
      counts[key] += entry.count;
    }
  }

  return counts;
}

/**
 * DMF species payload structure with exact field names
 */
export interface DMFSpeciesPayload {
  // Count fields (as strings per DMF spec)
  NumRD: string;
  NumF: string;
  NumSS: string;
  NumW: string;
  NumSB: string;
  // Flag fields (always null - legacy fields)
  RedDr: null;
  Flound: null;
  SST: null;
  Weakf: null;
  Striped: null;
}

/**
 * Convert SpeciesCounts to DMF payload format
 *
 * Returns an object with DMF field names as keys and string counts as values.
 *
 * @param counts - The species counts
 * @returns Object with DMF field names and string values
 */
export function speciesToDMFPayload(counts: SpeciesCounts): DMFSpeciesPayload {
  return {
    // Count fields (as strings)
    NumRD: counts.redDrum.toString(),
    NumF: counts.flounder.toString(),
    NumSS: counts.spottedSeatrout.toString(),
    NumW: counts.weakfish.toString(),
    NumSB: counts.stripedBass.toString(),
    // Flag fields (always null per DMF spec)
    RedDr: null,
    Flound: null,
    SST: null,
    Weakf: null,
    Striped: null,
  };
}

/**
 * Get total fish count from SpeciesCounts
 *
 * @param counts - The species counts
 * @returns Total number of fish across all species
 */
export function getTotalFishCount(counts: SpeciesCounts): number {
  return (
    counts.redDrum +
    counts.flounder +
    counts.spottedSeatrout +
    counts.weakfish +
    counts.stripedBass
  );
}

/**
 * Check if at least one species has a count > 0
 *
 * @param counts - The species counts
 * @returns True if any species has been reported
 */
export function hasAnyFish(counts: SpeciesCounts): boolean {
  return getTotalFishCount(counts) > 0;
}

export default SPECIES;
