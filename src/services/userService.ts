// services/userService.ts
//
// Core service for managing users in Supabase.
// Handles device-based user identity and email lookups.
//
// For profile CRUD operations, see userProfileService.
// For rewards member conversion flows, see rewardsConversionService.
//

import { supabase } from '../config/supabase';
import {
  User,
  UserInput,
  transformUser,
} from '../types/user';
import { getDeviceId } from '../utils/deviceId';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  currentUser: '@current_user',
  userStats: '@user_stats',
} as const;

// =============================================================================
// Core User Identity Operations
// =============================================================================

/**
 * Find user by device ID.
 */
export async function findUserByDeviceId(deviceId: string): Promise<User | null> {
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
export async function findUserByEmail(email: string): Promise<User | null> {
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
export async function createUserInSupabase(input: UserInput): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      device_id: input.deviceId || null,
      email: input.email?.toLowerCase() || null,
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      date_of_birth: input.dateOfBirth || null,
      zip_code: input.zipCode || null,
      profile_image_url: input.profileImageUrl || null,
      has_license: input.hasLicense ?? true,
      wrc_id: input.wrcId || null,
      license_number: input.licenseNumber || null,
      phone: input.phone || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return transformUser(data);
}

// =============================================================================
// Cache Management
// =============================================================================

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
 * Clear all user-related data from local storage.
 * Used during account deletion to ensure no user data persists locally.
 */
export async function clearAllUserData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.currentUser,
      STORAGE_KEYS.userStats,
      'userProfile',
      'fishingLicense',
      '@pending_auth',
      '@catch_feed_cache',
    ]);
  } catch (error) {
    console.error('Failed to clear all user data:', error);
  }
}

// Re-export getDeviceId from the shared utility
export { getDeviceId } from '../utils/deviceId';
