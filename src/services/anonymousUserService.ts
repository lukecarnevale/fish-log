// services/anonymousUserService.ts
//
// Service for managing anonymous users in Supabase.
// Anonymous users are created silently on app install and tracked by device ID.
// They can later be upgraded to rewards members.
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConnected } from '../config/supabase';
import {
  AnonymousUser,
  AnonymousUserInput,
  UserStateInfo,
  transformAnonymousUser,
} from '../types/anonymousUser';
import { User, transformUser } from '../types/user';
import { generateUUID, getDeviceId } from '../utils/deviceId';

// Storage keys
const STORAGE_KEYS = {
  anonymousUser: '@anonymous_user',
} as const;

// Singleton promise to prevent race conditions
let initializationPromise: Promise<AnonymousUser> | null = null;

// Re-export getDeviceId from the shared utility
export { getDeviceId } from '../utils/deviceId';

// =============================================================================
// Local Storage Helpers
// =============================================================================

/**
 * Get cached anonymous user from local storage.
 */
async function getCachedAnonymousUser(): Promise<AnonymousUser | null> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.anonymousUser);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Save anonymous user to local storage.
 */
async function cacheAnonymousUser(user: AnonymousUser): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.anonymousUser, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to cache anonymous user:', error);
  }
}

// =============================================================================
// Supabase Operations
// =============================================================================

/**
 * Find anonymous user by device ID.
 */
async function findAnonymousUserByDeviceId(deviceId: string): Promise<AnonymousUser | null> {
  const { data, error } = await supabase
    .from('anonymous_users')
    .select('*')
    .eq('device_id', deviceId)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No user found
    }
    throw new Error(`Failed to find anonymous user: ${error.message}`);
  }

  return data ? transformAnonymousUser(data) : null;
}

/**
 * Create a new anonymous user in Supabase.
 */
async function createAnonymousUserInSupabase(input: AnonymousUserInput): Promise<AnonymousUser> {
  const { data, error } = await supabase
    .from('anonymous_users')
    .insert({
      device_id: input.deviceId,
      dismissed_rewards_prompt: input.dismissedRewardsPrompt ?? false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create anonymous user: ${error.message}`);
  }

  return transformAnonymousUser(data);
}

/**
 * Update anonymous user in Supabase.
 */
async function updateAnonymousUserInSupabase(
  userId: string,
  updates: Partial<AnonymousUserInput> & { lastActiveAt?: string }
): Promise<AnonymousUser> {
  const updateData: Record<string, unknown> = {};

  if (updates.dismissedRewardsPrompt !== undefined) {
    updateData.dismissed_rewards_prompt = updates.dismissedRewardsPrompt;
  }
  if (updates.lastActiveAt !== undefined) {
    updateData.last_active_at = updates.lastActiveAt;
  }

  const { data, error } = await supabase
    .from('anonymous_users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update anonymous user: ${error.message}`);
  }

  return transformAnonymousUser(data);
}

/**
 * Find rewards member by anonymous user ID.
 */
async function findRewardsMemberByAnonymousId(anonymousUserId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('anonymous_user_id', anonymousUserId)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No user found
    }
    throw new Error(`Failed to find rewards member: ${error.message}`);
  }

  return data ? transformUser(data) : null;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get or create the anonymous user for this device.
 * This is called silently on app launch.
 * Uses singleton pattern to prevent race conditions when called multiple times concurrently.
 */
export async function getOrCreateAnonymousUser(): Promise<AnonymousUser> {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create new initialization promise
  initializationPromise = doGetOrCreateAnonymousUser();

  try {
    const result = await initializationPromise;
    return result;
  } finally {
    // Clear the promise after completion so future calls can refresh if needed
    // But keep a small delay to handle rapid successive calls
    setTimeout(() => {
      initializationPromise = null;
    }, 1000);
  }
}

/**
 * Internal implementation of getOrCreateAnonymousUser.
 */
async function doGetOrCreateAnonymousUser(): Promise<AnonymousUser> {
  const deviceId = await getDeviceId();

  // Try Supabase first
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      let user = await findAnonymousUserByDeviceId(deviceId);

      if (!user) {
        // Try to create new anonymous user
        try {
          user = await createAnonymousUserInSupabase({ deviceId });
          console.log('✅ Created new anonymous user in Supabase');
        } catch (createError) {
          // If duplicate key error, user was created by another call - fetch it
          const errorMessage = createError instanceof Error ? createError.message : '';
          if (errorMessage.includes('duplicate key') || errorMessage.includes('device_id')) {
            console.log('🔄 Anonymous user already exists, fetching...');
            user = await findAnonymousUserByDeviceId(deviceId);
          } else {
            throw createError;
          }
        }
      } else {
        // Update last active timestamp
        user = await updateAnonymousUserInSupabase(user.id, {
          lastActiveAt: new Date().toISOString(),
        });
      }

      // Cache the user if found
      if (user) {
        await cacheAnonymousUser(user);
        return user;
      }
    } catch (error) {
      console.warn('⚠️ Supabase anonymous user fetch failed, using cache:', error);
    }
  }

  // Fall back to cached user
  const cachedUser = await getCachedAnonymousUser();
  if (cachedUser) {
    console.log('📦 Using cached anonymous user');
    return cachedUser;
  }

  // Return a minimal local user
  console.log('📱 Using local anonymous user');
  const localUser: AnonymousUser = {
    id: deviceId, // Use device ID as ID for local user
    deviceId,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    dismissedRewardsPrompt: false,
  };
  await cacheAnonymousUser(localUser);
  return localUser;
}

/**
 * Get the current anonymous user without creating one.
 * Returns null if no anonymous user exists.
 */
export async function getAnonymousUser(): Promise<AnonymousUser | null> {
  const deviceId = await getDeviceId();

  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const user = await findAnonymousUserByDeviceId(deviceId);
      if (user) {
        await cacheAnonymousUser(user);
        return user;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch anonymous user:', error);
    }
  }

  return getCachedAnonymousUser();
}

/**
 * Update the anonymous user's last active timestamp.
 */
export async function updateLastActive(): Promise<void> {
  const user = await getAnonymousUser();
  if (!user) return;

  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const updated = await updateAnonymousUserInSupabase(user.id, {
        lastActiveAt: new Date().toISOString(),
      });
      await cacheAnonymousUser(updated);
    } catch (error) {
      console.warn('⚠️ Failed to update last active:', error);
    }
  }
}

/**
 * Dismiss the rewards prompt permanently for this user.
 */
export async function dismissRewardsPrompt(): Promise<void> {
  const user = await getAnonymousUser();
  if (!user) return;

  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const updated = await updateAnonymousUserInSupabase(user.id, {
        dismissedRewardsPrompt: true,
      });
      await cacheAnonymousUser(updated);
      console.log('✅ Rewards prompt dismissed');
      return;
    } catch (error) {
      console.warn('⚠️ Failed to dismiss rewards prompt in Supabase:', error);
    }
  }

  // Update locally
  const updatedUser: AnonymousUser = {
    ...user,
    dismissedRewardsPrompt: true,
  };
  await cacheAnonymousUser(updatedUser);
}

/**
 * Check if user has dismissed the rewards prompt.
 */
export async function hasUserDismissedRewardsPrompt(): Promise<boolean> {
  const user = await getAnonymousUser();
  return user?.dismissedRewardsPrompt ?? false;
}

/**
 * Get the complete user state (anonymous or rewards member).
 */
export async function getCurrentUserState(): Promise<UserStateInfo> {
  const anonymousUser = await getOrCreateAnonymousUser();

  // Check if this anonymous user has been upgraded to a rewards member
  const connected = await isSupabaseConnected();
  let rewardsMember: User | null = null;

  if (connected) {
    try {
      rewardsMember = await findRewardsMemberByAnonymousId(anonymousUser.id);
    } catch (error) {
      console.warn('⚠️ Failed to check rewards member status:', error);
    }
  }

  const isRewardsMember = rewardsMember !== null;
  const shouldShowRewardsPrompt = !isRewardsMember && !anonymousUser.dismissedRewardsPrompt;

  return {
    state: isRewardsMember ? 'rewards_member' : 'anonymous',
    anonymousUser,
    rewardsMember,
    isRewardsMember,
    shouldShowRewardsPrompt,
  };
}

/**
 * Check if current user is a rewards member.
 */
export async function isCurrentUserRewardsMember(): Promise<boolean> {
  const state = await getCurrentUserState();
  return state.isRewardsMember;
}

/**
 * Check if rewards prompt should be shown.
 * Returns false if user is already a rewards member (via any method).
 */
export async function shouldShowRewardsPrompt(): Promise<boolean> {
  // First, check if there's a cached rewards member (from magic link sign-in)
  // This catches users who signed up via email auth but haven't been linked to anonymous user
  try {
    const cachedUser = await AsyncStorage.getItem('@current_user');
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      if (user?.rewardsOptedInAt) {
        console.log('🎁 shouldShowRewardsPrompt: User has rewardsOptedInAt in cache, not showing prompt');
        return false;
      }
    }
  } catch (error) {
    console.warn('Error checking cached user for rewards status:', error);
  }

  // Fall back to checking anonymous user state
  const state = await getCurrentUserState();
  return state.shouldShowRewardsPrompt;
}

/**
 * Clear cached anonymous user data.
 */
export async function clearAnonymousUserCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.anonymousUser);
  } catch (error) {
    console.error('Failed to clear anonymous user cache:', error);
  }
}

/**
 * Sync anonymous user data with Supabase.
 */
export async function syncAnonymousUserData(): Promise<void> {
  const connected = await isSupabaseConnected();
  if (!connected) return;

  const deviceId = await getDeviceId();

  try {
    const user = await findAnonymousUserByDeviceId(deviceId);
    if (user) {
      await cacheAnonymousUser(user);
      console.log('✅ Anonymous user data synced');
    }
  } catch (error) {
    console.warn('Failed to sync anonymous user data:', error);
  }
}
