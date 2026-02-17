// services/feedbackService.ts
//
// Service for submitting user feedback to Supabase.
// Supports both anonymous device users and authenticated rewards members.
//

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase, isSupabaseConnected } from '../config/supabase';
import { withConnection } from './base';
import { FeedbackInput, Feedback, transformFeedback } from '../types/feedback';
import { getDeviceId } from '../utils/deviceId';
import { getOrCreateAnonymousUser } from './anonymousUserService';
import { getRewardsMemberForAnonymousUser } from './rewardsConversionService';

/**
 * Get app version from Expo constants.
 */
function getAppVersion(): string {
  return Constants.expoConfig?.version || 'unknown';
}

/**
 * Get platform info.
 */
function getPlatformInfo(): { platform: string; osVersion: string } {
  return {
    platform: Platform.OS,
    osVersion: Platform.Version?.toString() || 'unknown',
  };
}

/**
 * Submit feedback to Supabase using RPC function.
 * Determines user identity via the anonymous user system to correctly
 * distinguish between rewards members (user_id) and anonymous users (anonymous_user_id).
 */
export async function submitFeedback(input: FeedbackInput): Promise<{
  success: boolean;
  feedbackId?: string;
  error?: string;
}> {
  const connected = await isSupabaseConnected();

  if (!connected) {
    return {
      success: false,
      error: 'No connection to server. Please try again later.',
    };
  }

  try {
    const deviceId = await getDeviceId();
    const { platform, osVersion } = getPlatformInfo();
    const appVersion = getAppVersion();

    // Determine user identity using the anonymous user system.
    // This follows the same pattern as createReportFromHarvestInput in reportsService.ts.
    const anonymousUser = await getOrCreateAnonymousUser();
    const rewardsMember = await getRewardsMemberForAnonymousUser();

    // Only pass user_id if the user is a real rewards member in the users table.
    // For anonymous users, pass null to avoid FK constraint violations.
    const userId = rewardsMember?.id || null;
    const anonymousUserId = anonymousUser?.id || null;

    // Build the input JSONB for the RPC function
    const rpcInput = {
      user_id: userId,
      anonymous_user_id: anonymousUserId,
      device_id: deviceId,
      type: input.type,
      subject: input.subject || null,
      message: input.message,
      email: input.email || null,
      app_version: appVersion,
      platform,
      os_version: osVersion,
      screen_name: input.screenName || null,
      error_message: input.errorMessage || null,
    };

    const { data, error } = await supabase.rpc('submit_feedback_rpc', {
      p_input: rpcInput,
    });

    if (error) {
      console.error('Failed to submit feedback:', error.message);
      return {
        success: false,
        error: 'Failed to submit feedback. Please try again.',
      };
    }

    console.log('✅ Feedback submitted:', data);
    return {
      success: true,
      feedbackId: data,
    };
  } catch (err) {
    console.error('Error submitting feedback:', err);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Submit general feedback.
 */
export async function sendFeedback(
  message: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  return submitFeedback({
    type: 'feedback',
    subject: 'General Feedback',
    message,
    email,
  });
}

/**
 * Submit a bug report.
 */
export async function reportBug(
  message: string,
  options?: {
    email?: string;
    screenName?: string;
    errorMessage?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return submitFeedback({
    type: 'bug_report',
    subject: 'Bug Report',
    message,
    email: options?.email,
    screenName: options?.screenName,
    errorMessage: options?.errorMessage,
  });
}

/**
 * Submit a feature request.
 */
export async function requestFeature(
  message: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  return submitFeedback({
    type: 'feature_request',
    subject: 'Feature Request',
    message,
    email,
  });
}

/**
 * Get user's previous feedback submissions.
 * Uses device_id for anonymous users, user_id for rewards members.
 */
export async function getMyFeedback(): Promise<Feedback[]> {
  const connected = await isSupabaseConnected();
  if (!connected) return [];

  const deviceId = await getDeviceId();
  const rewardsMember = await getRewardsMemberForAnonymousUser();

  // Build query to get feedback for this user by device_id OR user_id
  let query = supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (rewardsMember) {
    // Rewards member: get feedback linked to their user_id or device_id
    query = query.or(`user_id.eq.${rewardsMember.id},device_id.eq.${deviceId}`);
  } else {
    // Anonymous user: get feedback by device_id only
    query = query.eq('device_id', deviceId);
  }

  const data = await withConnection(
    async () => query,
    'getMyFeedback',
    []
  );

  return (data || []).map(transformFeedback);
}
