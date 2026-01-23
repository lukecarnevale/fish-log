// services/userService.ts
//
// Service for managing users in Supabase.
// Supports device-based anonymous users and email-based accounts.
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

// Storage keys
const STORAGE_KEYS = {
  currentUser: '@current_user',
  deviceId: '@device_id',
  userStats: '@user_stats',
} as const;

// =============================================================================
// Device ID Management
// =============================================================================

/**
 * Get or create a unique device ID.
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.deviceId);

    if (!deviceId) {
      // Generate a UUID-like device ID
      deviceId = generateUUID();
      await AsyncStorage.setItem(STORAGE_KEYS.deviceId, deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('Failed to get device ID:', error);
    // Return a temporary ID if storage fails
    return generateUUID();
  }
}

/**
 * Generate a UUID v4.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// Local Storage Helpers
// =============================================================================

/**
 * Get cached user from local storage.
 */
async function getCachedUser(): Promise<User | null> {
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
async function cacheUser(user: User): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to cache user:', error);
  }
}

/**
 * Get cached user stats from local storage.
 */
async function getCachedStats(): Promise<UserStats | null> {
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
async function cacheStats(stats: UserStats): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.userStats, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to cache stats:', error);
  }
}

// =============================================================================
// Supabase Operations
// =============================================================================

/**
 * Find user by device ID.
 */
async function findUserByDeviceId(deviceId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('device_id', deviceId)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No user found
    }
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data ? transformUser(data) : null;
}

/**
 * Find user by email.
 */
async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No user found
    }
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data ? transformUser(data) : null;
}

/**
 * Create a new user in Supabase.
 */
async function createUserInSupabase(input: UserInput): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      device_id: input.deviceId || null,
      email: input.email?.toLowerCase() || null,
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      zip_code: input.zipCode || null,
      profile_image_url: input.profileImageUrl || null,
      has_license: input.hasLicense ?? true,
      wrc_id: input.wrcId || null,
      phone: input.phone || null,
      want_text_confirmation: input.wantTextConfirmation ?? false,
      want_email_confirmation: input.wantEmailConfirmation ?? false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return transformUser(data);
}

/**
 * Update user in Supabase.
 */
async function updateUserInSupabase(userId: string, input: UserInput): Promise<User> {
  const updateData: Record<string, unknown> = {};

  if (input.email !== undefined) updateData.email = input.email?.toLowerCase() || null;
  if (input.firstName !== undefined) updateData.first_name = input.firstName || null;
  if (input.lastName !== undefined) updateData.last_name = input.lastName || null;
  if (input.zipCode !== undefined) updateData.zip_code = input.zipCode || null;
  if (input.profileImageUrl !== undefined) updateData.profile_image_url = input.profileImageUrl || null;
  if (input.hasLicense !== undefined) updateData.has_license = input.hasLicense;
  if (input.wrcId !== undefined) updateData.wrc_id = input.wrcId || null;
  if (input.phone !== undefined) updateData.phone = input.phone || null;
  if (input.wantTextConfirmation !== undefined) updateData.want_text_confirmation = input.wantTextConfirmation;
  if (input.wantEmailConfirmation !== undefined) updateData.want_email_confirmation = input.wantEmailConfirmation;

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
 */
async function fetchStatsFromSupabase(userId: string): Promise<UserStats> {
  // Get species stats
  const { data: speciesData, error: speciesError } = await supabase
    .from('user_species_stats')
    .select('*')
    .eq('user_id', userId);

  if (speciesError) {
    console.warn('Failed to fetch species stats:', speciesError.message);
  }

  const speciesStats: SpeciesStat[] = (speciesData || []).map(transformSpeciesStat);

  // Get user achievements with achievement details
  const { data: achievementsData, error: achievementsError } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievements (*)
    `)
    .eq('user_id', userId);

  if (achievementsError) {
    console.warn('Failed to fetch achievements:', achievementsError.message);
  }

  const achievements: UserAchievement[] = (achievementsData || [])
    .map((row: Record<string, unknown>) => {
      const achievementData = row.achievements as Record<string, unknown>;
      if (!achievementData) return null;
      return transformUserAchievement(row, transformAchievement(achievementData));
    })
    .filter((a): a is UserAchievement => a !== null);

  // Get user for denormalized stats
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('total_reports, total_fish, current_streak, longest_streak, last_report_date')
    .eq('id', userId)
    .single();

  if (userError) {
    throw new Error(`Failed to fetch user stats: ${userError.message}`);
  }

  return {
    totalReports: userData.total_reports as number,
    totalFish: userData.total_fish as number,
    currentStreak: userData.current_streak as number,
    longestStreak: userData.longest_streak as number,
    lastReportDate: userData.last_report_date as string | null,
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
        // Create new device user
        user = await createUserInSupabase({ deviceId });
        console.log('✅ Created new user in Supabase');
      }

      // Cache the user
      await cacheUser(user);
      return user;
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
    firstName: null,
    lastName: null,
    zipCode: null,
    profileImageUrl: null,
    hasLicense: true,
    wrcId: null,
    phone: null,
    wantTextConfirmation: false,
    wantEmailConfirmation: false,
    totalReports: 0,
    totalFish: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastReportDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update the current user's profile.
 */
export async function updateCurrentUser(input: UserInput): Promise<User> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('No current user');
  }

  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const updated = await updateUserInSupabase(currentUser.id, input);
      await cacheUser(updated);
      return updated;
    } catch (error) {
      console.warn('⚠️ Supabase update failed, updating cache only:', error);
    }
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
 * Link current device user to an email account.
 * If email already exists, creates a merge request.
 */
export async function linkEmailToUser(email: string): Promise<{
  success: boolean;
  merged: boolean;
  mergeRequestId?: string;
  error?: string;
}> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, merged: false, error: 'No current user' };
  }

  const connected = await isSupabaseConnected();
  if (!connected) {
    return { success: false, merged: false, error: 'No connection to server' };
  }

  try {
    // Check if email already exists
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      // Email exists - create merge request
      const { data, error } = await supabase
        .from('device_merge_requests')
        .insert({
          device_user_id: currentUser.id,
          target_email: email.toLowerCase(),
          status: 'pending',
          merge_token: generateUUID(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create merge request: ${error.message}`);
      }

      return {
        success: true,
        merged: false,
        mergeRequestId: data.id,
      };
    }

    // Email doesn't exist - just update current user
    const updated = await updateUserInSupabase(currentUser.id, { email });
    await cacheUser(updated);

    return { success: true, merged: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, merged: false, error: message };
  }
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
 * Clear all cached user data.
 * Useful for logout or debugging.
 */
export async function clearUserCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.currentUser,
      STORAGE_KEYS.userStats,
    ]);
  } catch (error) {
    console.error('Failed to clear user cache:', error);
  }
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
