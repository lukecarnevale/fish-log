/**
 * src/services/transformers/userTransformer.ts
 *
 * Transformer for converting Supabase user rows to camelCase TypeScript types.
 * Consolidates snake_case -> camelCase transformations for the User entity and related types.
 */

/**
 * User type (camelCase, TypeScript-friendly).
 * Represents a Rewards Member (user who has opted into the Rewards Program).
 */
export interface User {
  id: string;
  deviceId: string | null;
  email: string | null;
  authId: string | null;
  anonymousUserId: string | null;
  firstName: string | null;
  lastName: string | null;
  zipCode: string | null;
  profileImageUrl: string | null;
  preferredAreaCode: string | null;
  preferredAreaLabel: string | null;
  hasLicense: boolean;
  wrcId: string | null;
  phone: string | null;
  wantsTextConfirmation: boolean;
  wantsEmailConfirmation: boolean;
  licenseType: string | null;
  licenseIssueDate: string | null;
  licenseExpiryDate: string | null;
  primaryHarvestArea: string | null;
  primaryFishingMethod: string | null;
  totalReports: number;
  totalFish: number;
  currentStreak: number;
  longestStreak: number;
  lastReportDate: string | null;
  rewardsOptedInAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Raw Supabase user row (snake_case).
 */
export interface SupabaseUserRow {
  id: string;
  device_id: string | null;
  email: string | null;
  auth_id: string | null;
  anonymous_user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  zip_code: string | null;
  profile_image_url: string | null;
  preferred_area_code: string | null;
  preferred_area_label: string | null;
  has_license: boolean;
  wrc_id: string | null;
  phone: string | null;
  wants_text_confirmation: boolean;
  wants_email_confirmation: boolean;
  license_type: string | null;
  license_issue_date: string | null;
  license_expiry_date: string | null;
  primary_harvest_area: string | null;
  primary_fishing_method: string | null;
  total_reports: number;
  total_fish_reported: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_active_at: string | null;
  rewards_opted_in_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transform a Supabase user row to the camelCase User type.
 *
 * Handles the following field mappings:
 * - device_id -> deviceId
 * - auth_id -> authId
 * - anonymous_user_id -> anonymousUserId
 * - first_name -> firstName
 * - last_name -> lastName
 * - zip_code -> zipCode
 * - profile_image_url -> profileImageUrl
 * - preferred_area_code -> preferredAreaCode
 * - preferred_area_label -> preferredAreaLabel
 * - has_license -> hasLicense
 * - wrc_id -> wrcId
 * - wants_text_confirmation -> wantsTextConfirmation
 * - wants_email_confirmation -> wantsEmailConfirmation
 * - license_type -> licenseType
 * - license_issue_date -> licenseIssueDate
 * - license_expiry_date -> licenseExpiryDate
 * - primary_harvest_area -> primaryHarvestArea
 * - primary_fishing_method -> primaryFishingMethod
 * - total_reports -> totalReports
 * - total_fish_reported -> totalFish
 * - current_streak_days -> currentStreak
 * - longest_streak_days -> longestStreak
 * - last_active_at -> lastReportDate
 * - rewards_opted_in_at -> rewardsOptedInAt
 * - created_at -> createdAt
 * - updated_at -> updatedAt
 */
export function transformUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    deviceId: row.device_id as string | null,
    email: row.email as string | null,
    authId: row.auth_id as string | null,
    anonymousUserId: row.anonymous_user_id as string | null,
    firstName: row.first_name as string | null,
    lastName: row.last_name as string | null,
    zipCode: row.zip_code as string | null,
    profileImageUrl: row.profile_image_url as string | null,
    preferredAreaCode: row.preferred_area_code as string | null,
    preferredAreaLabel: row.preferred_area_label as string | null,
    hasLicense: row.has_license as boolean,
    wrcId: row.wrc_id as string | null,
    phone: row.phone as string | null,
    wantsTextConfirmation: (row.wants_text_confirmation as boolean) ?? false,
    wantsEmailConfirmation: (row.wants_email_confirmation as boolean) ?? false,
    licenseType: row.license_type as string | null,
    licenseIssueDate: row.license_issue_date as string | null,
    licenseExpiryDate: row.license_expiry_date as string | null,
    primaryHarvestArea: row.primary_harvest_area as string | null,
    primaryFishingMethod: row.primary_fishing_method as string | null,
    totalReports: row.total_reports as number,
    totalFish: row.total_fish_reported as number,
    currentStreak: row.current_streak_days as number,
    longestStreak: row.longest_streak_days as number,
    lastReportDate: row.last_active_at as string | null,
    rewardsOptedInAt: row.rewards_opted_in_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Transform a list of Supabase user rows to camelCase User types.
 */
export function transformUserList(rows: Record<string, unknown>[]): User[] {
  return rows.map(transformUser);
}

/**
 * Per-species statistics type (camelCase).
 */
export interface SpeciesStat {
  species: string;
  totalCount: number;
  largestLength: number | null;
  lastCaughtDate: string | null;
}

/**
 * Raw Supabase species stat row (snake_case).
 */
export interface SupabaseSpeciesStatRow {
  species: string;
  total_count: number;
  largest_length: number | null;
  last_caught_at: string | null;
}

/**
 * Transform a Supabase species stat row to the camelCase SpeciesStat type.
 *
 * Handles the following field mappings:
 * - total_count -> totalCount
 * - largest_length -> largestLength
 * - last_caught_at -> lastCaughtDate
 */
export function transformSpeciesStat(row: Record<string, unknown>): SpeciesStat {
  return {
    species: row.species as string,
    totalCount: row.total_count as number,
    largestLength: row.largest_length as number | null,
    lastCaughtDate: row.last_caught_at as string | null,
  };
}

/**
 * Transform a list of Supabase species stat rows to camelCase SpeciesStat types.
 */
export function transformSpeciesStatList(rows: Record<string, unknown>[]): SpeciesStat[] {
  return rows.map(transformSpeciesStat);
}

/**
 * Achievement type (camelCase).
 */
export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  iconName: string | null;
  category: 'milestone' | 'streak' | 'species' | 'seasonal' | 'special';
  requirement?: Record<string, unknown>;
  sortOrder?: number;
  isActive: boolean;
}

/**
 * Raw Supabase achievement row (snake_case).
 */
export interface SupabaseAchievementRow {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string | null;
  category: 'milestone' | 'streak' | 'species' | 'seasonal' | 'special';
  requirement?: Record<string, unknown>;
  sort_order?: number;
  is_active: boolean;
}

/**
 * Transform a Supabase achievement row to the camelCase Achievement type.
 *
 * Handles the following field mappings:
 * - icon -> iconName (note: DB column is 'icon', not 'icon_name')
 * - sort_order -> sortOrder
 * - is_active -> isActive
 */
export function transformAchievement(row: Record<string, unknown>): Achievement {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    description: row.description as string,
    iconName: (row.icon as string) || null,
    category: row.category as Achievement['category'],
    requirement: row.requirement as Record<string, unknown> | undefined,
    sortOrder: row.sort_order as number | undefined,
    isActive: row.is_active as boolean,
  };
}

/**
 * Transform a list of Supabase achievement rows to camelCase Achievement types.
 */
export function transformAchievementList(rows: Record<string, unknown>[]): Achievement[] {
  return rows.map(transformAchievement);
}

/**
 * User achievement type (camelCase).
 */
export interface UserAchievement {
  id: string;
  achievementId: string;
  achievement: Achievement;
  earnedAt: string;
  progress: number | null;
}

/**
 * Raw Supabase user achievement row (snake_case).
 */
export interface SupabaseUserAchievementRow {
  id: string;
  achievement_id: string;
  achievement?: Record<string, unknown>;
  earned_at: string;
  progress: number | null;
}

/**
 * Transform a Supabase user achievement row to the camelCase UserAchievement type.
 *
 * Handles the following field mappings:
 * - achievement_id -> achievementId
 * - earned_at -> earnedAt
 */
export function transformUserAchievement(
  row: Record<string, unknown>,
  achievement: Achievement
): UserAchievement {
  return {
    id: row.id as string,
    achievementId: row.achievement_id as string,
    achievement,
    earnedAt: row.earned_at as string,
    progress: row.progress as number | null,
  };
}

/**
 * Transform a list of Supabase user achievement rows to camelCase UserAchievement types.
 */
export function transformUserAchievementList(
  rows: Record<string, unknown>[],
  achievements: Map<string, Achievement>
): UserAchievement[] {
  return rows.map(row => {
    const achievementId = row.achievement_id as string;
    const achievement = achievements.get(achievementId);
    return transformUserAchievement(row, achievement || ({} as Achievement));
  });
}
