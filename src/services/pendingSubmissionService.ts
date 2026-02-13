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
 * Create a pending submission in Supabase using RPC function.
 */
async function createInSupabase(
  input: PendingSubmissionInput
): Promise<PendingSubmission> {
  const { data, error } = await supabase.rpc('save_pending_submission', {
    p_device_id: input.deviceId,
    p_email: input.email.toLowerCase(),
    p_form_data: input.formData,
  });

  if (error) {
    throw new Error(`Failed to create pending submission: ${error.message}`);
  }

  // Build the pending submission from the returned ID
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

  const submission: PendingSubmission = {
    id: data,
    deviceId: input.deviceId,
    email: input.email.toLowerCase(),
    formData: input.formData,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  return submission;
}

/**
 * Find pending submission by device ID using RPC function.
 */
async function findByDeviceId(deviceId: string): Promise<PendingSubmission | null> {
  const { data, error } = await supabase.rpc('get_pending_submission', {
    p_device_id: deviceId,
  });

  if (error) {
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
        // Use the RPC function to clear the submission
        const { getDeviceId } = await import('../utils/deviceId');
        const deviceId = await getDeviceId();
        await supabase.rpc('clear_pending_submission', {
          p_device_id: deviceId,
        });
      } catch (error) {
        console.warn('⚠️ Failed to clear in Supabase:', error);
      }
    }
  }

  await clearCachedSubmission();
  console.log('✅ Pending submission dismissed');
}

/**
 * Update the pending submission with a drawing entry ID.
 * Called when a pending user enters the quarterly rewards drawing.
 * This persists the entry so it can be migrated after authentication.
 */
export async function updatePendingDrawingEntry(drawingId: string): Promise<boolean> {
  const submission = await getPendingSubmission();

  if (!submission) {
    console.log('📦 No pending submission to update with drawing entry');
    return false;
  }

  // Update form data with drawing ID
  const updatedFormData = {
    ...submission.formData,
    drawingId,
  };

  const connected = await isSupabaseConnected();

  if (connected && !submission.id.startsWith('local_')) {
    try {
      const { error } = await supabase
        .from('pending_submissions')
        .update({
          form_data: updatedFormData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (error) {
        console.warn('⚠️ Failed to update drawing entry in Supabase:', error.message);
      } else {
        console.log('✅ Pending drawing entry saved to Supabase:', drawingId);
      }
    } catch (error) {
      console.warn('⚠️ Failed to update pending submission in Supabase:', error);
    }
  }

  // Always update local cache
  const updatedSubmission = {
    ...submission,
    formData: updatedFormData,
  };
  await cacheSubmission(updatedSubmission);
  console.log('📱 Pending drawing entry saved locally:', drawingId);

  return true;
}

/**
 * Get the drawing ID from a pending submission, if one exists.
 * Returns null if no pending submission or no drawing entry.
 */
export async function getPendingDrawingId(): Promise<string | null> {
  const submission = await getPendingSubmission();

  if (!submission) {
    return null;
  }

  return submission.formData?.drawingId || null;
}
