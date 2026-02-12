// services/userProfileService.ts
//
// Service for managing user profile data and stats.
// Handles profile CRUD operations, caching, and synchronization.
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConnected } from '../config/supabase';
import {
  User,
  UserInput,
  UserStats,
  SpeciesStat,
  Achievement,
  UserAchievement,
  transformUser,
  transformSpeciesStat,
  transformAchievement,
  transformUserAchievement,
} from '../types/user';
import { getAuthState } from './authService';
import { backfillUserStatsFromReports } from './statsService';
import { findUserByDeviceId, findUserByEmail, createUserInSupabase } from './userService';
import { getDeviceId } from '../utils/deviceId';

// Storage keys
const STORAGE_KEYS = {
  currentUser: '@current_user',
  userStats: '@user_stats',
  userProfile: 'userProfile', // Used by ProfileScreen
} as const;

// =============================================================================
// Local Storage Helpers
// =============================================================================

/**
 * Get cached user from local storage.
 */
export async function getCachedUser(): Promise<User | null> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.currentUser);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Save user to local storage.
 */
export async function cacheUser(user: User): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to cache user:', error);
  }
}

/**
 * Get cached user stats from local storage.
 */
export async function getCachedStats(): Promise<UserStats | null> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.userStats);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Save user stats to local storage.
 */
export async function cacheStats(stats: UserStats): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.userStats, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to cache stats:', error);
  }
}

/**
 * Sync user data to the userProfile storage key (used by ProfileScreen).
 * This merges the Supabase user data with any existing profile data.
 */
export async function syncToUserProfile(user: User): Promise<void> {
  try {
    // Get existing profile data
    const existingProfile = await AsyncStorage.getItem(STORAGE_KEYS.userProfile);
    const profileData = existingProfile ? JSON.parse(existingProfile) : {};

    // Merge with user data from Supabase (user data takes precedence for matching fields)
    const updatedProfile = {
      ...profileData,
      firstName: user.firstName || profileData.firstName,
      lastName: user.lastName || profileData.lastName,
      email: user.email || profileData.email,
      phone: user.phone || profileData.phone,
      wantTextConfirmation: user.wantsTextConfirmation ?? profileData.wantTextConfirmation,
      wantEmailConfirmation: user.wantsEmailConfirmation ?? profileData.wantEmailConfirmation,
      zipCode: user.zipCode || profileData.zipCode,
      dateOfBirth: user.dateOfBirth || profileData.dateOfBirth,
      hasLicense: user.hasLicense ?? profileData.hasLicense,
      wrcId: user.wrcId || profileData.wrcId,
      licenseNumber: user.licenseNumber || profileData.licenseNumber,
      licenseType: user.licenseType || profileData.licenseType,
      licenseIssueDate: user.licenseIssueDate || profileData.licenseIssueDate,
      licenseExpiryDate: user.licenseExpiryDate || profileData.licenseExpiryDate,
      profileImage: user.profileImageUrl || profileData.profileImage,
      preferredAreaCode: user.preferredAreaCode || profileData.preferredAreaCode,
      preferredAreaLabel: user.preferredAreaLabel || profileData.preferredAreaLabel,
      primaryHarvestArea: user.primaryHarvestArea || profileData.primaryHarvestArea,
      primaryFishingMethod: user.primaryFishingMethod || profileData.primaryFishingMethod,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(updatedProfile));
    console.log('✅ User profile synced to AsyncStorage');
  } catch (error) {
    console.error('Failed to sync user profile:', error);
  }
}

/**
 * Read cached confirmation preferences from the form profile cache.
 * The form stores these as wantTextConfirmation/wantEmailConfirmation (no 's'),
 * but the User type uses wantsTextConfirmation/wantsEmailConfirmation (with 's').
 * Returns mapped values matching the UserInput interface.
 */
export async function getCachedFormPreferences(): Promise<Pick<UserInput, 'wantsTextConfirmation' | 'wantsEmailConfirmation'>> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.userProfile);
    if (!cached) return {};
    const profile = JSON.parse(cached);
    const prefs: Pick<UserInput, 'wantsTextConfirmation' | 'wantsEmailConfirmation'> = {};
    if (typeof profile.wantTextConfirmation === 'boolean') {
      prefs.wantsTextConfirmation = profile.wantTextConfirmation;
    }
    if (typeof profile.wantEmailConfirmation === 'boolean') {
      prefs.wantsEmailConfirmation = profile.wantEmailConfirmation;
    }
    return prefs;
  } catch {
    return {};
  }
}

// =============================================================================
// Supabase Operations
// =============================================================================

/**
 * Update user in Supabase.
 */
export async function updateUserInSupabase(userId: string, input: UserInput): Promise<User> {
  const updateData: Record<string, unknown> = {};

  if (input.email !== undefined) updateData.email = input.email?.toLowerCase() || null;
  if (input.firstName !== undefined) updateData.first_name = input.firstName || null;
  if (input.lastName !== undefined) updateData.last_name = input.lastName || null;
  if (input.zipCode !== undefined) updateData.zip_code = input.zipCode || null;
  if (input.profileImageUrl !== undefined) updateData.profile_image_url = input.profileImageUrl || null;
  if (input.preferredAreaCode !== undefined) updateData.preferred_area_code = input.preferredAreaCode || null;
  if (input.preferredAreaLabel !== undefined) updateData.preferred_area_label = input.preferredAreaLabel || null;
  if (input.dateOfBirth !== undefined) updateData.date_of_birth = input.dateOfBirth || null;
  if (input.hasLicense !== undefined) updateData.has_license = input.hasLicense;
  if (input.wrcId !== undefined) updateData.wrc_id = input.wrcId || null;
  if (input.licenseNumber !== undefined) updateData.license_number = input.licenseNumber || null;
  if (input.phone !== undefined) updateData.phone = input.phone || null;
  if (input.wantsTextConfirmation !== undefined) updateData.wants_text_confirmation = input.wantsTextConfirmation;
  if (input.wantsEmailConfirmation !== undefined) updateData.wants_email_confirmation = input.wantsEmailConfirmation;
  if (input.licenseType !== undefined) updateData.license_type = input.licenseType || null;
  if (input.licenseIssueDate !== undefined) updateData.license_issue_date = input.licenseIssueDate || null;
  if (input.licenseExpiryDate !== undefined) updateData.license_expiry_date = input.licenseExpiryDate || null;
  if (input.primaryHarvestArea !== undefined) updateData.primary_harvest_area = input.primaryHarvestArea || null;
  if (input.primaryFishingMethod !== undefined) updateData.primary_fishing_method = input.primaryFishingMethod || null;
  if (input.rewardsOptedInAt !== undefined) updateData.rewards_opted_in_at = input.rewardsOptedInAt || null;

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return transformUser(data);
}

/**
 * Fetch user stats from Supabase.
 * Uses the get_user_profile_stats RPC which returns all stats in a single call.
 */
export async function fetchStatsFromSupabase(userId: string): Promise<UserStats> {
  // Call get_user_profile_stats RPC
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('get_user_profile_stats', {
      p_user_id: userId,
    });

  if (rpcError) {
    throw new Error(`Failed to fetch user stats: ${rpcError.message}`);
  }

  if (!rpcResult) {
    throw new Error('No stats returned from RPC');
  }

  // Transform species stats from the RPC result
  const speciesStats: SpeciesStat[] = (rpcResult.speciesStats || []).map((stat: any) => {
    return {
      species: stat.species,
      totalCount: stat.total_count || stat.totalCount || 0,
      largestLength: stat.largest_length || stat.largestLength || null,
      lastCaughtDate: stat.last_caught_at || stat.lastCaughtAt || null,
    };
  });

  // Transform achievements from the RPC result
  const achievements: UserAchievement[] = (rpcResult.achievements || []).map((ach: any) => {
    return {
      id: ach.id,
      achievementId: ach.achievement_id || ach.achievementId,
      earnedAt: ach.earned_at || ach.earnedAt,
      progress: ach.progress || null,
      achievement: {
        id: ach.achievement_id || ach.achievementId,
        code: ach.code,
        name: ach.name,
        description: ach.description,
        category: ach.category,
        iconName: ach.icon,
        points: ach.points,
      },
    };
  });

  return {
    totalReports: rpcResult.totalReports as number,
    totalFish: rpcResult.totalFish as number,
    currentStreak: rpcResult.currentStreak as number,
    longestStreak: rpcResult.longestStreak as number,
    lastReportDate: rpcResult.lastActiveAt as string | null,
    speciesStats,
    achievements,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get or create the current user based on device ID.
 * Returns cached user if Supabase is unavailable.
 */
export async function getCurrentUser(): Promise<User | null> {
  const deviceId = await getDeviceId();

  // Try Supabase first
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      let user = await findUserByDeviceId(deviceId);

      if (!user) {
        // Try to create new device user
        try {
          user = await createUserInSupabase({ deviceId });
          console.log('✅ Created new user in Supabase');
        } catch (createError) {
          // If duplicate key error, user already exists - try finding again
          const errorMessage = createError instanceof Error ? createError.message : '';
          if (errorMessage.includes('duplicate key') || errorMessage.includes('users_device_id_key')) {
            console.log('🔄 User already exists, fetching...');
            user = await findUserByDeviceId(deviceId);
          } else {
            throw createError;
          }
        }
      }

      // Cache the user if found
      if (user) {
        await cacheUser(user);
        return user;
      }
    } catch (error) {
      console.warn('⚠️ Supabase user fetch failed, using cache:', error);
    }
  }

  // Fall back to cached user
  const cachedUser = await getCachedUser();
  if (cachedUser) {
    console.log('📦 Using cached user');
    return cachedUser;
  }

  // Return a minimal local user
  console.log('📱 Using local device user');
  return {
    id: deviceId,
    deviceId,
    email: null,
    authId: null,
    anonymousUserId: null,
    firstName: null,
    lastName: null,
    zipCode: null,
    profileImageUrl: null,
    preferredAreaCode: null,
    preferredAreaLabel: null,
    dateOfBirth: null,
    hasLicense: true,
    wrcId: null,
    licenseNumber: null,
    phone: null,
    wantsTextConfirmation: false,
    wantsEmailConfirmation: false,
    licenseType: null,
    licenseIssueDate: null,
    licenseExpiryDate: null,
    primaryHarvestArea: null,
    primaryFishingMethod: null,
    totalReports: 0,
    totalFish: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastReportDate: null,
    rewardsOptedInAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update the current user's profile.
 * Only updates Supabase if user is authenticated (rewards member).
 * Anonymous device users only get cache updates.
 */
export async function updateCurrentUser(input: UserInput): Promise<User> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('No current user');
  }

  const connected = await isSupabaseConnected();
  const authState = await getAuthState();

  // Only attempt Supabase update if user is authenticated (rewards member)
  // Anonymous device users can't update due to RLS policies
  if (connected && authState.isAuthenticated) {
    try {
      const updated = await updateUserInSupabase(currentUser.id, input);
      await cacheUser(updated);
      console.log('✅ User profile updated in Supabase');
      return updated;
    } catch (error) {
      console.warn('⚠️ Supabase update failed, updating cache only:', error);
    }
  } else if (connected && !authState.isAuthenticated) {
    console.log('ℹ️ User not authenticated - profile saved locally only. Sign in to sync to cloud.');
  }

  // Update cached user locally
  const updatedUser: User = {
    ...currentUser,
    ...input,
    email: input.email?.toLowerCase() ?? currentUser.email,
    updatedAt: new Date().toISOString(),
  };
  await cacheUser(updatedUser);
  return updatedUser;
}

/**
 * Get user stats.
 */
export async function getUserStats(): Promise<UserStats> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      totalReports: 0,
      totalFish: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastReportDate: null,
      speciesStats: [],
      achievements: [],
    };
  }

  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const stats = await fetchStatsFromSupabase(currentUser.id);
      await cacheStats(stats);
      return stats;
    } catch (error) {
      console.warn('⚠️ Supabase stats fetch failed, using cache:', error);
    }
  }

  // Return cached stats or defaults
  const cachedStats = await getCachedStats();
  if (cachedStats) {
    return cachedStats;
  }

  return {
    totalReports: currentUser.totalReports,
    totalFish: currentUser.totalFish,
    currentStreak: currentUser.currentStreak,
    longestStreak: currentUser.longestStreak,
    lastReportDate: currentUser.lastReportDate,
    speciesStats: [],
    achievements: [],
  };
}

/**
 * Get all available achievements.
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const connected = await isSupabaseConnected();

  if (!connected) {
    return [];
  }

  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.warn('Failed to fetch achievements:', error.message);
    return [];
  }

  return (data || []).map(transformAchievement);
}

/**
 * Sync local user data with Supabase.
 * Call this when coming back online.
 */
export async function syncUserData(): Promise<void> {
  const connected = await isSupabaseConnected();
  if (!connected) return;

  const cachedUser = await getCachedUser();
  if (!cachedUser) return;

  try {
    // Re-fetch user from Supabase to get latest data
    const freshUser = await findUserByDeviceId(cachedUser.deviceId || '');
    if (freshUser) {
      await cacheUser(freshUser);
      console.log('✅ User data synced');
    }
  } catch (error) {
    console.warn('Failed to sync user data:', error);
  }
}
