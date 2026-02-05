// types/user.ts
//
// Type definitions for user management with Supabase.
// Supports both device-based anonymous users and email-authenticated users.
//

/**
 * User record from Supabase.
 * Represents a Rewards Member (user who has opted into the Rewards Program).
 * Links to their anonymous user history via anonymousUserId.
 */
export interface User {
  id: string;
  deviceId: string | null;
  email: string | null;

  // Link to Supabase auth user (for RLS policies)
  authId: string | null;

  // Link to anonymous user history
  anonymousUserId: string | null;

  // Profile info
  firstName: string | null;
  lastName: string | null;
  zipCode: string | null;
  profileImageUrl: string | null;

  // Preferred area of harvest (pre-fills report form)
  preferredAreaCode: string | null;
  preferredAreaLabel: string | null;

  // License info (cached for DMF submissions)
  hasLicense: boolean;
  wrcId: string | null;

  // Contact preferences
  phone: string | null;
  wantsTextConfirmation: boolean;
  wantsEmailConfirmation: boolean;

  // License details (for DMF submissions)
  licenseType: string | null;
  licenseIssueDate: string | null;
  licenseExpiryDate: string | null;

  // Fishing preferences
  primaryHarvestArea: string | null;
  primaryFishingMethod: string | null;

  // Denormalized stats for quick access
  totalReports: number;
  totalFish: number;
  currentStreak: number;
  longestStreak: number;
  lastReportDate: string | null;

  // Rewards Program
  rewardsOptedInAt: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * User input for creating or updating a user.
 */
export interface UserInput {
  deviceId?: string;
  email?: string;
  anonymousUserId?: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;
  profileImageUrl?: string;
  preferredAreaCode?: string;
  preferredAreaLabel?: string;
  hasLicense?: boolean;
  wrcId?: string;
  phone?: string;
  wantsTextConfirmation?: boolean;
  wantsEmailConfirmation?: boolean;
  licenseType?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  primaryHarvestArea?: string;
  primaryFishingMethod?: string;
  rewardsOptedInAt?: string;
}

/**
 * Input for converting an anonymous user to a rewards member.
 */
export interface ConvertToMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  zipCode?: string;
  wrcId?: string;
}

/**
 * User stats for display.
 */
export interface UserStats {
  totalReports: number;
  totalFish: number;
  currentStreak: number;
  longestStreak: number;
  lastReportDate: string | null;
  speciesStats: SpeciesStat[];
  achievements: UserAchievement[];
}

/**
 * Per-species statistics.
 */
export interface SpeciesStat {
  species: string;
  totalCount: number;
  largestLength: number | null;
  lastCaughtDate: string | null;
}

/**
 * Achievement definition.
 * Note: category values match database constraint: 'milestone', 'streak', 'species', 'seasonal', 'special'
 */
export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  iconName: string | null;
  category: 'milestone' | 'streak' | 'species' | 'seasonal' | 'special';
  requirement?: Record<string, unknown>;  // Optional - column doesn't exist in DB yet
  sortOrder?: number;  // Optional - column doesn't exist in DB yet
  isActive: boolean;
}

/**
 * User's earned achievement.
 */
export interface UserAchievement {
  id: string;
  achievementId: string;
  achievement: Achievement;
  earnedAt: string;
  progress: number | null;
}

/**
 * Request to merge device user into email account.
 * Note: Field names match database columns (device_id, email)
 */
export interface DeviceMergeRequest {
  id: string;
  deviceId: string;  // Maps to device_id column
  email: string;  // Maps to email column
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  mergeToken?: string;  // Optional until migration adds column
  expiresAt?: string;  // Optional until migration adds column
  createdAt: string;
  completedAt: string | null;
}

/**
 * Transform Supabase user row to User type.
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
 * Transform Supabase species stat row to SpeciesStat type.
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
 * Transform Supabase achievement row to Achievement type.
 * Note: DB column is 'icon' not 'icon_name', and requirement/sort_order may not exist
 */
export function transformAchievement(row: Record<string, unknown>): Achievement {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    description: row.description as string,
    iconName: (row.icon as string) || null,  // DB column is 'icon'
    category: row.category as Achievement['category'],
    requirement: row.requirement as Record<string, unknown> | undefined,
    sortOrder: row.sort_order as number | undefined,
    isActive: row.is_active as boolean,
  };
}

/**
 * Transform Supabase user achievement row to UserAchievement type.
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
