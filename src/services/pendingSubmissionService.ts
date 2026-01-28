// services/pendingSubmissionService.ts
//
// Service for managing pending submissions during authentication flow.
// Preserves submission context when a user starts auth but closes the app.
// Uses offline-first pattern with AsyncStorage fallback.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConnected } from '../config/supabase';
import {
  PendingSubmission,
  PendingSubmissionInput,
  transformPendingSubmission,
} from '../types/pendingSubmission';

// Storage keys
const STORAGE_KEYS = {
  pendingSubmission: '@pending_submission',
} as const;

// Expiration: 7 days
const EXPIRATION_DAYS = 7;

// =============================================================================
// Local Storage Helpers
// =============================================================================

/**
 * Get cached pending submission from local storage.
 */
async function getCachedSubmission(): Promise<PendingSubmission | null> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.pendingSubmission);
    if (!cached) return null;

    const submission: PendingSubmission = JSON.parse(cached);

    // Check if expired
    if (new Date(submission.expiresAt) < new Date()) {
      console.log('📦 Cached pending submission expired, clearing');
      await AsyncStorage.removeItem(STORAGE_KEYS.pendingSubmission);
      return null;
    }

    return submission;
  } catch {
    return null;
  }
}

/**
 * Save pending submission to local storage.
 */
async function cacheSubmission(submission: PendingSubmission): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.pendingSubmission,
      JSON.stringify(submission)
    );
  } catch (error) {
    console.error('Failed to cache pending submission:', error);
  }
}

/**
 * Clear pending submission from local storage.
 */
async function clearCachedSubmission(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.pendingSubmission);
  } catch (error) {
    console.error('Failed to clear cached submission:', error);
  }
}

// =============================================================================
// Supabase Operations
// =============================================================================

/**
 * Create a pending submission in Supabase.
 */
async function createInSupabase(
  input: PendingSubmissionInput
): Promise<PendingSubmission> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

  const { data, error } = await supabase
    .from('pending_submissions')
    .insert({
      device_id: input.deviceId,
      email: input.email.toLowerCase(),
      form_data: input.formData,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create pending submission: ${error.message}`);
  }

  return transformPendingSubmission(data);
}

/**
 * Find pending submission by device ID.
 */
async function findByDeviceId(deviceId: string): Promise<PendingSubmission | null> {
  const { data, error } = await supabase
    .from('pending_submissions')
    .select('*')
    .eq('device_id', deviceId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No rows found
    }
    throw new Error(`Failed to find pending submission: ${error.message}`);
  }

  return data ? transformPendingSubmission(data) : null;
}

/**
 * Update pending submission status in Supabase.
 */
async function updateStatusInSupabase(
  id: string,
  status: PendingSubmission['status']
): Promise<void> {
  const { error } = await supabase
    .from('pending_submissions')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update submission status: ${error.message}`);
  }
}

/**
 * Mark submission as completed by email.
 */
async function markCompletedByEmail(email: string): Promise<void> {
  const { error } = await supabase
    .from('pending_submissions')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('email', email.toLowerCase())
    .eq('status', 'pending');

  if (error) {
    console.warn('Failed to mark submissions complete by email:', error.message);
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Save a pending submission before triggering magic link.
 * Stores in both local storage and Supabase for reliability.
 */
export async function savePendingSubmission(
  input: PendingSubmissionInput
): Promise<{ success: boolean; submission?: PendingSubmission; error?: string }> {
  const connected = await isSupabaseConnected();

  // Create expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

  if (connected) {
    try {
      const submission = await createInSupabase(input);
      await cacheSubmission(submission);
      console.log('✅ Pending submission saved to Supabase');
      return { success: true, submission };
    } catch (error) {
      console.warn('⚠️ Supabase save failed, saving locally:', error);
    }
  }

  // Create local submission
  const localSubmission: PendingSubmission = {
    id: `local_${Date.now()}`,
    deviceId: input.deviceId,
    email: input.email.toLowerCase(),
    formData: input.formData,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await cacheSubmission(localSubmission);
  console.log('📱 Pending submission saved locally');
  return { success: true, submission: localSubmission };
}

/**
 * Get the current pending submission for this device.
 * Checks Supabase first, falls back to local cache.
 */
export async function getPendingSubmission(): Promise<PendingSubmission | null> {
  // First check local cache (fastest)
  const cached = await getCachedSubmission();

  const connected = await isSupabaseConnected();

  if (connected && cached?.deviceId) {
    try {
      // Check Supabase for the most up-to-date status
      const remote = await findByDeviceId(cached.deviceId);

      if (remote) {
        // Supabase has a pending submission - use it
        await cacheSubmission(remote);
        return remote;
      } else {
        // No pending in Supabase - may have been completed or expired
        // Clear local cache if local one was pending
        if (cached.status === 'pending') {
          await clearCachedSubmission();
          return null;
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to check Supabase for pending submission:', error);
    }
  }

  return cached;
}

/**
 * Check for a pending submission on app launch.
 * This is used by App.tsx to show the recovery prompt.
 */
export async function checkForPendingSubmission(): Promise<PendingSubmission | null> {
  return getPendingSubmission();
}

/**
 * Mark a pending submission as completed.
 */
export async function completePendingSubmission(id: string): Promise<void> {
  const connected = await isSupabaseConnected();

  if (connected && !id.startsWith('local_')) {
    try {
      await updateStatusInSupabase(id, 'completed');
      console.log('✅ Pending submission marked complete in Supabase');
    } catch (error) {
      console.warn('⚠️ Failed to mark complete in Supabase:', error);
    }
  }

  // Always clear local cache
  await clearCachedSubmission();
  console.log('✅ Pending submission cleared');
}

/**
 * Mark pending submissions as completed by email.
 * Called after successful authentication to clean up any pending records.
 */
export async function completePendingSubmissionByEmail(email: string): Promise<void> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      await markCompletedByEmail(email);
    } catch (error) {
      console.warn('⚠️ Failed to complete by email:', error);
    }
  }

  // Check if local cache matches this email
  const cached = await getCachedSubmission();
  if (cached && cached.email.toLowerCase() === email.toLowerCase()) {
    await clearCachedSubmission();
  }
}

/**
 * Clear the pending submission (user dismissed the prompt).
 */
export async function clearPendingSubmission(): Promise<void> {
  const cached = await getCachedSubmission();

  if (cached) {
    const connected = await isSupabaseConnected();

    if (connected && !cached.id.startsWith('local_')) {
      try {
        // Mark as expired rather than deleting
        await updateStatusInSupabase(cached.id, 'expired');
      } catch (error) {
        console.warn('⚠️ Failed to expire in Supabase:', error);
      }
    }
  }

  await clearCachedSubmission();
  console.log('✅ Pending submission dismissed');
}
