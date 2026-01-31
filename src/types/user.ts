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

  // License info (cached for DMF submissions)
  hasLicense: boolean;
  wrcId: string | null;

  // Contact preferences
  phone: string | null;

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
  hasLicense?: boolean;
  wrcId?: string;
  phone?: string;
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
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: 'reporting' | 'species' | 'streak' | 'special';
  requirement: Record<string, unknown>;
  sortOrder: number;
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
 */
export interface DeviceMergeRequest {
  id: string;
  deviceUserId: string;
  targetEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  mergeToken: string;
  expiresAt: string;
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
    hasLicense: row.has_license as boolean,
    wrcId: row.wrc_id as string | null,
    phone: row.phone as string | null,
    totalReports: row.total_reports as number,
    totalFish: row.total_fish as number,
    currentStreak: row.current_streak as number,
    longestStreak: row.longest_streak as number,
    lastReportDate: row.last_report_date as string | null,
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
    lastCaughtDate: row.last_caught_date as string | null,
  };
}

/**
 * Transform Supabase achievement row to Achievement type.
 */
export function transformAchievement(row: Record<string, unknown>): Achievement {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    iconName: row.icon_name as string,
    category: row.category as Achievement['category'],
    requirement: row.requirement as Record<string, unknown>,
    sortOrder: row.sort_order as number,
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
