/**
 * src/services/transformers/index.ts
 *
 * Barrel export for all transformer modules.
 * Consolidates snake_case -> camelCase transformation utilities for Supabase data.
 *
 * Usage:
 * ```ts
 * import {
 *   transformAdvertisement,
 *   transformFishSpecies,
 *   transformUser,
 * } from '@/services/transformers';
 * ```
 */

// Advertisement Transformers
export {
  transformAdvertisement,
  transformAdvertisementList,
  type Advertisement,
  type SupabaseAdvertisement,
  type AdPlacement,
} from './advertisementTransformer';

// Fish Species Transformers
export {
  transformFishSpecies,
  transformFishSpeciesList,
  type SupabaseFishSpeciesRow,
} from './fishSpeciesTransformer';

// User Transformers
export {
  transformUser,
  transformUserList,
  transformSpeciesStat,
  transformSpeciesStatList,
  transformAchievement,
  transformAchievementList,
  transformUserAchievement,
  transformUserAchievementList,
  type User,
  type SupabaseUserRow,
  type SpeciesStat,
  type SupabaseSpeciesStatRow,
  type Achievement,
  type SupabaseAchievementRow,
  type UserAchievement,
  type SupabaseUserAchievementRow,
} from './userTransformer';
