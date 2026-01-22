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
