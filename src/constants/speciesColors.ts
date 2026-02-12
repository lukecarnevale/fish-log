// constants/speciesColors.ts
//
// Species-based color theming for the Catch Feed.
// Each NC mandatory harvest species gets a unique color theme
// for visual differentiation in the feed.

export interface SpeciesTheme {
  id: string;
  name: string;
  primary: string;      // Accent bar color
  light: string;        // Badge/placeholder background
  icon: string;         // Icon tint color
  gradient: [string, string];  // For gradient accent effects
}

/**
 * Color themes for each NC mandatory harvest species.
 * Colors are inspired by the actual fish coloring.
 */
export const SPECIES_THEMES: Record<string, SpeciesTheme> = {
  red_drum: {
    id: 'red_drum',
    name: 'Red Drum',
    primary: '#E57373',     // Coral red (matches copper/bronze coloring)
    light: '#FFEBEE',
    icon: '#C62828',
    gradient: ['#E57373', '#EF9A9A'],
  },
  flounder: {
    id: 'flounder',
    name: 'Southern Flounder',
    primary: '#8D6E63',     // Brown/tan (bottom-dwelling, sandy coloring)
    light: '#EFEBE9',
    icon: '#5D4037',
    gradient: ['#8D6E63', '#A1887F'],
  },
  spotted_seatrout: {
    id: 'spotted_seatrout',
    name: 'Spotted Seatrout',
    primary: '#4DB6AC',     // Teal/turquoise (spotted silvery-green)
    light: '#E0F2F1',
    icon: '#00897B',
    gradient: ['#4DB6AC', '#80CBC4'],
  },
  weakfish: {
    id: 'weakfish',
    name: 'Weakfish',
    primary: '#90A4AE',     // Silver/gray (silvery coloring)
    light: '#ECEFF1',
    icon: '#546E7A',
    gradient: ['#90A4AE', '#B0BEC5'],
  },
  striped_bass: {
    id: 'striped_bass',
    name: 'Striped Bass',
    primary: '#1E3A5F',     // Navy (dark stripes on silver)
    light: '#E3EBF6',
    icon: '#0D47A1',
    gradient: ['#1E3A5F', '#2D5A87'],
  },
  default: {
    id: 'default',
    name: 'Fish',
    primary: '#0B548B',     // App primary ocean blue
    light: '#C3E0F7',
    icon: '#0B548B',
    gradient: ['#0B548B', '#1976D2'],
  },
};

/**
 * Get the color theme for a species based on its name.
 * Matches against common names and variations.
 */
export function getSpeciesTheme(species: string): SpeciesTheme {
  const normalized = species.toLowerCase().trim();

  // Red Drum / Redfish
  if (
    normalized.includes('red drum') ||
    normalized.includes('redfish') ||
    normalized.includes('channel bass') ||
    normalized.includes('puppy drum')
  ) {
    return SPECIES_THEMES.red_drum;
  }

  // Southern Flounder
  if (
    normalized.includes('flounder') ||
    normalized.includes('fluke')
  ) {
    return SPECIES_THEMES.flounder;
  }

  // Spotted Seatrout / Speckled Trout
  if (
    normalized.includes('seatrout') ||
    normalized.includes('sea trout') ||
    normalized.includes('speckled trout') ||
    normalized.includes('spotted trout') ||
    normalized.includes('spec')
  ) {
    return SPECIES_THEMES.spotted_seatrout;
  }

  // Weakfish / Gray Trout
  if (
    normalized.includes('weakfish') ||
    normalized.includes('gray trout') ||
    normalized.includes('grey trout') ||
    normalized.includes('squeteague')
  ) {
    return SPECIES_THEMES.weakfish;
  }

  // Striped Bass / Striper / Rockfish
  if (
    normalized.includes('striped bass') ||
    normalized.includes('striper') ||
    normalized.includes('rockfish') ||
    normalized.includes('linesider')
  ) {
    return SPECIES_THEMES.striped_bass;
  }

  // Default for unknown species
  return SPECIES_THEMES.default;
}

/**
 * Get all available species themes for UI listings.
 */
export function getAllSpeciesThemes(): SpeciesTheme[] {
  return [
    SPECIES_THEMES.red_drum,
    SPECIES_THEMES.flounder,
    SPECIES_THEMES.spotted_seatrout,
    SPECIES_THEMES.weakfish,
    SPECIES_THEMES.striped_bass,
  ];
}
