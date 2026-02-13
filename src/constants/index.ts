// constants/index.ts
//
// Barrel export for all constants used in DMF harvest reporting.
//

// Area of Harvest options
export {
  AREA_OPTIONS,
  AREA_LABELS,
  getAreaByLabel,
  getAreaByCode,
  getAreaCodeFromLabel,
  getAreaLabelFromCode,
  type AreaOption,
} from './areaOptions';

// Gear Type options
export {
  GEAR_OPTIONS,
  NON_HOOK_GEAR_OPTIONS,
  GEAR_LABELS,
  NON_HOOK_GEAR_LABELS,
  HOOK_AND_LINE_CODE,
  getGearByLabel,
  getGearByCode,
  getGearCodeFromLabel,
  getGearLabelFromCode,
  isHookAndLine,
  mapFishingMethodToGearCode,
  type GearOption,
} from './gearOptions';

// Species definitions
export {
  SPECIES,
  SPECIES_DISPLAY_NAMES,
  getSpeciesById,
  getSpeciesByDisplayName,
  getDMFCountField,
  getDMFFlagField,
  getSpeciesCountKey,
  aggregateFishEntries,
  speciesToDMFPayload,
  createEmptySpeciesCounts,
  getTotalFishCount,
  hasAnyFish,
  type SpeciesInfo,
  type SpeciesCounts,
  type DMFSpeciesPayload,
} from './species';

// Screen labels
export {
  SCREEN_LABELS,
  type ScreenLabelKey,
} from './screenLabels';

// Achievement mappings
export {
  ACHIEVEMENT_COLORS,
  ACHIEVEMENT_ICONS,
  getAchievementColor,
  getAchievementIcon,
} from './achievementMappings';

// Species themes and colors
export {
  SPECIES_THEMES,
  getSpeciesTheme,
  getAllSpeciesThemes,
  type SpeciesTheme,
} from './speciesColors';

// Species aliases
export { SPECIES_ALIASES } from './speciesAliases';

// FAQ data
export {
  MANDATORY_HARVEST_FAQS,
  FULL_FAQ_URL,
  type FaqItem,
} from './faqData';

// Sponsor data
export {
  SPONSORS,
  type Sponsor,
} from './sponsorsData';

// UI constants
export { HEADER_HEIGHT } from './ui';
