// services/rewardsConversionService.ts
//
// Service for managing the conversion from anonymous users to rewards members.
// Handles account linking, rewards entry migration, and authentication flows.
//

import { supabase, isSupabaseConnected } from '../config/supabase';
import {
  User,
  ConvertToMemberInput,
  transformUser,
} from '../types/user';
import { getOrCreateAnonymousUser, getAnonymousUser } from './anonymousUserService';
import { getPendingAuth, clearPendingAuth, getCurrentAuthUser, getAuthState } from './authService';
import { backfillUserStatsFromReports } from './statsService';
import { getEnteredDrawingIds, enterRewardsDrawing, fetchCurrentDrawing } from './rewardsService';
import { getPendingSubmission } from './pendingSubmissionService';
import { getDeviceId } from '../utils/deviceId';
import {
  findUserByDeviceId,
  findUserByEmail,
  createUserInSupabase,
} from './userService';
import {
  getCachedUser,
  cacheUser,
  syncToUserProfile,
  updateUserInSupabase,
} from './userProfileService';

// =============================================================================
// Rewards Entry Migration
// =============================================================================

/**
 * Migrate local rewards entries to Supabase when a user becomes a rewards member.
 * This ensures that raffle entries made before signing up are preserved.
 */
async function migrateLocalRewardsEntries(userId: string): Promise<number> {
  try {
    // First, check for pending submission with a drawing entry
    // This handles users who entered the drawing before completing auth
    try {
      const pendingSubmission = await getPendingSubmission();
      if (pendingSubmission?.formData?.drawingId) {
        await enterRewardsDrawing(userId, pendingSubmission.formData.drawingId);
        console.log('🎁 Migrated pending drawing entry:', pendingSubmission.formData.drawingId);
      }
    } catch (pendingErr) {
      console.warn('Failed to migrate pending drawing entry:', pendingErr);
    }

    // Get locally stored drawing entries
    const localEntries = await getEnteredDrawingIds();
    if (localEntries.length === 0) {
      console.log('🎁 No local rewards entries to migrate');
      return 0;
    }

    console.log(`🎁 Migrating ${localEntries.length} local rewards entries to Supabase...`);

    // Get current active drawing to migrate entries for
    const currentDrawing = await fetchCurrentDrawing();
    let migrated = 0;

    for (const drawingId of localEntries) {
      try {
        // Only migrate if this is the current drawing (or we have the drawing info)
        if (currentDrawing && drawingId === currentDrawing.id) {
          await enterRewardsDrawing(userId, drawingId);
          migrated++;
          console.log(`🎁 Migrated entry for drawing: ${drawingId}`);
        } else {
          // For non-current drawings, still try to migrate
          await enterRewardsDrawing(userId, drawingId);
          migrated++;
          console.log(`🎁 Migrated entry for past drawing: ${drawingId}`);
        }
      } catch (entryError) {
        console.warn(`Failed to migrate entry for drawing ${drawingId}:`, entryError);
      }
    }

    console.log(`✅ Migrated ${migrated} rewards entries to Supabase`);
    return migrated;
  } catch (error) {
    console.error('Failed to migrate local rewards entries:', error);
    return 0;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert an anonymous user to a rewards member.
 * Creates a new user record linked to the anonymous user's history.
 */
export async function convertToRewardsMember(
  input: ConvertToMemberInput
): Promise<{ success: boolean; user?: User; error?: string }> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    return { success: false, error: 'No connection to server' };
  }

  try {
    // Get the current anonymous user
    const anonymousUser = await getAnonymousUser();
    if (!anonymousUser) {
      return { success: false, error: 'No anonymous user found' };
    }

    const deviceId = await getDeviceId();

    // Check if user already exists with this anonymous_user_id
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('anonymous_user_id', anonymousUser.id)
      .limit(1)
      .single();

    if (existingUser) {
      // User already converted - return existing user
      const user = transformUser(existingUser);
      await cacheUser(user);
      return { success: true, user };
    }

    // Check if email already exists
    const existingEmailUser = await findUserByEmail(input.email);
    if (existingEmailUser) {
      return { success: false, error: 'Email is already registered' };
    }

    // Create new rewards member
    const { data, error } = await supabase
      .from('users')
      .insert({
        device_id: deviceId,
        anonymous_user_id: anonymousUser.id,
        email: input.email.toLowerCase(),
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone || null,
        zip_code: input.zipCode || null,
        rewards_opted_in_at: new Date().toISOString(),
        has_license: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create rewards member: ${error.message}`);
    }

    const user = transformUser(data);
    await cacheUser(user);

    // Link any anonymous reports to this user so they appear in Catch Feed
    if (anonymousUser?.id) {
      // Lazy import to avoid circular dependency
      const { linkReportsToUser } = await import('./reportsService');
      const linkResult = await linkReportsToUser(anonymousUser.id, user.id);

      // Backfill stats from historical reports
      if (linkResult.updated > 0) {
        console.log(`🔄 Backfilling stats from ${linkResult.updated} linked reports...`);
        // Clear catch feed cache so linked reports appear immediately
        const { clearCatchFeedCache } = await import('./catchFeedService');
        await clearCatchFeedCache();
        console.log('🔄 Cleared catch feed cache after linking reports');
        const backfillResult = await backfillUserStatsFromReports(user.id);
        if (backfillResult.success) {
          console.log(`✅ Backfilled: ${backfillResult.totalReports} reports, ${backfillResult.totalFish} fish`);
          if (backfillResult.achievementsAwarded.length > 0) {
            console.log(`🏆 Achievements unlocked: ${backfillResult.achievementsAwarded.map(a => a.name).join(', ')}`);
          }
        }
      }
    }

    console.log('✅ Converted anonymous user to rewards member');
    return { success: true, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to convert to rewards member:', error);
    return { success: false, error: message };
  }
}

/**
 * Check if current user is a rewards member.
 * Requires both: user has opted in AND has an active auth session.
 */
export async function isRewardsMember(): Promise<boolean> {
  // First check if there's an active auth session
  const authState = await getAuthState();
  if (!authState.isAuthenticated) {
    return false;
  }

  // Then check if user has opted in to rewards
  const user = await getCachedUser();
  return user?.rewardsOptedInAt !== null && user?.rewardsOptedInAt !== undefined;
}

/**
 * Get the rewards member for the current anonymous user (if exists).
 * Also checks authenticated session to find user by email if anonymous_user_id doesn't match.
 */
export async function getRewardsMemberForAnonymousUser(): Promise<User | null> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    return null;
  }

  try {
    // First, check if there's an authenticated session - look up by email (case-insensitive)
    const authState = await getAuthState();
    if (authState.isAuthenticated && authState.user?.email) {
      const { data: authUserData, error: authError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', authState.user.email)
        .limit(1)
        .single();

      if (!authError && authUserData) {
        console.log('🔑 Found rewards member by auth email:', authState.user.email);
        const user = transformUser(authUserData);
        // Sync user profile to AsyncStorage so profile data is restored
        await syncToUserProfile(user);
        await cacheUser(user);
        return user;
      }
    }

    // Fall back to looking up by anonymous_user_id
    const anonymousUser = await getAnonymousUser();
    if (!anonymousUser) {
      return null;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('anonymous_user_id', anonymousUser.id)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No user found
      }
      throw error;
    }

    return data ? transformUser(data) : null;
  } catch (error) {
    console.warn('Failed to get rewards member:', error);
    return null;
  }
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
  const currentUser = await getCachedUser();
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
      // Note: Using correct DB column names (device_id, email)
      // merge_token and expires_at will be added after DB migration
      const { data, error } = await supabase
        .from('device_merge_requests')
        .insert({
          device_id: currentUser.id,
          email: email.toLowerCase(),
          status: 'pending',
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
 * Create a rewards member from an authenticated Supabase user.
 * Call this after the user completes magic link authentication.
 * Uses pending auth data (name, phone) stored during signup.
 */
export async function createRewardsMemberFromAuthUser(): Promise<{
  success: boolean;
  user?: User;
  error?: string;
  claimedCatches?: number;
}> {
  console.log('🔄 createRewardsMemberFromAuthUser: Starting...');

  const connected = await isSupabaseConnected();
  console.log('🔄 createRewardsMemberFromAuthUser: Supabase connected:', connected);
  if (!connected) {
    return { success: false, error: 'No connection to server' };
  }

  try {
    // Get the authenticated user from Supabase Auth
    console.log('🔄 createRewardsMemberFromAuthUser: Getting auth user...');
    const authUser = await getCurrentAuthUser();
    console.log('🔄 createRewardsMemberFromAuthUser: Auth user:', authUser?.email || 'none');
    if (!authUser || !authUser.email) {
      return { success: false, error: 'No authenticated user found' };
    }

    // Check if user already exists with this email
    console.log('🔄 createRewardsMemberFromAuthUser: Checking for existing user...');
    const existingUser = await findUserByEmail(authUser.email);
    const deviceId = await getDeviceId();
    const anonymousUser = await getAnonymousUser();

    if (existingUser) {
      console.log('🔄 createRewardsMemberFromAuthUser: Found existing user, updating device_id...');

      // Check if there's a conflicting user with the same device_id (device-only user)
      const conflictingUser = await findUserByDeviceId(deviceId);
      if (conflictingUser && conflictingUser.id !== existingUser.id) {
        // There's a device-only user that conflicts - delete it if it has no email
        if (!conflictingUser.email) {
          console.log('🔄 createRewardsMemberFromAuthUser: Removing device-only user to resolve conflict...');
          await supabase.from('users').delete().eq('id', conflictingUser.id);
        } else {
          // Both users have emails - this is a more complex merge scenario
          // For now, just use the existing email user without updating device_id
          console.warn('🔄 createRewardsMemberFromAuthUser: Both users have emails, keeping existing');
          await cacheUser(existingUser);
          await syncToUserProfile(existingUser);
          await clearPendingAuth();
          return { success: true, user: existingUser };
        }
      }

      // Now update the existing user's device_id and auth_id
      const { data: updatedData, error: updateError } = await supabase
        .from('users')
        .update({
          device_id: deviceId,
          anonymous_user_id: anonymousUser?.id || existingUser.anonymousUserId || null,
          auth_id: authUser.id, // Link to Supabase auth user for RLS
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.warn('🔄 createRewardsMemberFromAuthUser: Failed to update device_id:', updateError.message);
        // Still return the existing user even if update fails
        await cacheUser(existingUser);
        await syncToUserProfile(existingUser);
        await clearPendingAuth();
        return { success: true, user: existingUser };
      }

      const updatedUser = transformUser(updatedData);
      console.log('🔄 createRewardsMemberFromAuthUser: User device_id updated, returning');
      await cacheUser(updatedUser);
      await syncToUserProfile(updatedUser);
      await clearPendingAuth();
      return { success: true, user: updatedUser };
    }

    // Get pending auth data (name, phone from signup form)
    console.log('🔄 createRewardsMemberFromAuthUser: Getting pending auth...');
    const pendingAuth = await getPendingAuth();
    console.log('🔄 createRewardsMemberFromAuthUser: Pending auth:', pendingAuth?.email || 'none');
    console.log('🔄 createRewardsMemberFromAuthUser: Anonymous user:', anonymousUser?.id || 'none', 'Device:', deviceId);

    // Create the rewards member
    console.log('🔄 createRewardsMemberFromAuthUser: Inserting new user into Supabase...');
    const { data, error } = await supabase
      .from('users')
      .insert({
        device_id: deviceId,
        anonymous_user_id: anonymousUser?.id || null,
        auth_id: authUser.id, // Link to Supabase auth user for RLS
        email: authUser.email.toLowerCase(),
        first_name: pendingAuth?.firstName || authUser.user_metadata?.firstName || null,
        last_name: pendingAuth?.lastName || authUser.user_metadata?.lastName || null,
        phone: pendingAuth?.phone || authUser.user_metadata?.phone || null,
        zip_code: pendingAuth?.zipCode || authUser.user_metadata?.zipCode || null,
        wrc_id: pendingAuth?.wrcId || authUser.user_metadata?.wrcId || null,
        rewards_opted_in_at: new Date().toISOString(),
        has_license: true,
      })
      .select()
      .single();

    if (error) {
      console.log('🔄 createRewardsMemberFromAuthUser: Insert constraint (upgrading existing user):', error.code);
      // If unique constraint error, handle based on which constraint was violated
      if (error.code === '23505') {
        // Check if it's a device_id constraint (user exists from anonymous usage)
        if (error.message.includes('device_id')) {
          console.log('🔄 createRewardsMemberFromAuthUser: Device ID exists - upgrading existing user...');
          // Find and update the existing user by device_id
          const existingDeviceUser = await findUserByDeviceId(deviceId);
          if (existingDeviceUser) {
            // Update the existing user with email, rewards info, AND link to anonymous user
            const { data: updatedData, error: updateError } = await supabase
              .from('users')
              .update({
                auth_id: authUser.id, // Link to Supabase auth user for RLS
                email: authUser.email.toLowerCase(),
                first_name: pendingAuth?.firstName || existingDeviceUser.firstName || null,
                last_name: pendingAuth?.lastName || existingDeviceUser.lastName || null,
                phone: pendingAuth?.phone || existingDeviceUser.phone || null,
                zip_code: pendingAuth?.zipCode || existingDeviceUser.zipCode || null,
                wrc_id: pendingAuth?.wrcId || existingDeviceUser.wrcId || null,
                rewards_opted_in_at: new Date().toISOString(),
                anonymous_user_id: anonymousUser?.id || existingDeviceUser.anonymousUserId || null,
              })
              .eq('id', existingDeviceUser.id)
              .select()
              .single();

            if (updateError) {
              console.error('🔄 createRewardsMemberFromAuthUser: Update error:', updateError.message);
              throw new Error(`Failed to upgrade user: ${updateError.message}`);
            }

            const updatedUser = transformUser(updatedData);
            await cacheUser(updatedUser);
            await syncToUserProfile(updatedUser);
            await clearPendingAuth();

            // Link any anonymous reports to this user so they appear in Catch Feed
            let claimedCatches = 0;
            if (anonymousUser?.id) {
              // Lazy import to avoid circular dependency
              const { linkReportsToUser } = await import('./reportsService');
              const linkResult = await linkReportsToUser(anonymousUser.id, updatedUser.id);
              claimedCatches = linkResult.updated;
              if (claimedCatches > 0) {
                console.log(`🎣 Linked ${claimedCatches} anonymous catches to user`);
                // Clear catch feed cache so linked reports appear immediately
                const { clearCatchFeedCache } = await import('./catchFeedService');
                await clearCatchFeedCache();
                console.log('🔄 Cleared catch feed cache after linking reports');
                // Backfill stats from historical reports
                const backfillResult = await backfillUserStatsFromReports(updatedUser.id);
                if (backfillResult.success) {
                  console.log(`✅ Backfilled: ${backfillResult.totalReports} reports, ${backfillResult.totalFish} fish`);
                }
              }
            }

            // Migrate local rewards entries to Supabase
            await migrateLocalRewardsEntries(updatedUser.id);

            console.log('✅ Upgraded existing device user to rewards member:', authUser.email);
            return { success: true, user: updatedUser, claimedCatches };
          }
        }

        // Email constraint - user already exists with this email
        console.log('🔄 createRewardsMemberFromAuthUser: Email exists - finding existing user...');
        const existingEmailUser = await findUserByEmail(authUser.email);
        if (existingEmailUser) {
          await cacheUser(existingEmailUser);
          await syncToUserProfile(existingEmailUser);
          await clearPendingAuth();
          return { success: true, user: existingEmailUser };
        }
      }
      throw new Error(`Failed to create rewards member: ${error.message}`);
    }

    console.log('🔄 createRewardsMemberFromAuthUser: User inserted successfully, transforming...');
    const user = transformUser(data);
    await cacheUser(user);
    await syncToUserProfile(user); // Sync to ProfileScreen's storage
    await clearPendingAuth();

    // Link any anonymous reports to this user so they appear in Catch Feed
    let claimedCatches = 0;
    if (anonymousUser?.id) {
      // Lazy import to avoid circular dependency
      const { linkReportsToUser } = await import('./reportsService');
      const linkResult = await linkReportsToUser(anonymousUser.id, user.id);
      claimedCatches = linkResult.updated;
      if (claimedCatches > 0) {
        console.log(`🎣 Linked ${claimedCatches} anonymous catches to user`);
        // Clear catch feed cache so linked reports appear immediately
        const { clearCatchFeedCache } = await import('./catchFeedService');
        await clearCatchFeedCache();
        console.log('🔄 Cleared catch feed cache after linking reports');
        // Backfill stats from historical reports
        const backfillResult = await backfillUserStatsFromReports(user.id);
        if (backfillResult.success) {
          console.log(`✅ Backfilled: ${backfillResult.totalReports} reports, ${backfillResult.totalFish} fish`);
        }
      }
    }

    // Migrate local rewards entries to Supabase
    await migrateLocalRewardsEntries(user.id);

    console.log('✅ Created rewards member from authenticated user:', authUser.email);
    return { success: true, user, claimedCatches };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to create rewards member from auth user:', error);
    return { success: false, error: message };
  }
}

/**
 * Find a rewards member by their Supabase Auth user ID.
 */
export async function findRewardsMemberByAuthId(authUserId: string): Promise<User | null> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    return null;
  }

  // For now, we find by email since Supabase Auth user email matches users table email
  const authUser = await getCurrentAuthUser();
  if (!authUser?.email) {
    return null;
  }

  return findUserByEmail(authUser.email);
}
