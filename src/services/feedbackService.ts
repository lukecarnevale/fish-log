// services/feedbackService.ts
//
// Service for submitting user feedback to Supabase.
//

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase, isSupabaseConnected } from '../config/supabase';
import { FeedbackInput, Feedback, transformFeedback } from '../types/feedback';
import { getDeviceId, getCurrentUser } from './userService';

/**
 * Get app version from Expo constants.
 */
function getAppVersion(): string {
  return Constants.expoConfig?.version || Constants.manifest?.version || 'unknown';
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
 * Submit feedback to Supabase.
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
    const user = await getCurrentUser();
    const { platform, osVersion } = getPlatformInfo();
    const appVersion = getAppVersion();

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user?.id || null,
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
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to submit feedback:', error.message);
      return {
        success: false,
        error: 'Failed to submit feedback. Please try again.',
      };
    }

    console.log('✅ Feedback submitted:', data.id);
    return {
      success: true,
      feedbackId: data.id,
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
 */
export async function getMyFeedback(): Promise<Feedback[]> {
  const connected = await isSupabaseConnected();
  if (!connected) return [];

  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch feedback:', error.message);
      return [];
    }

    return (data || []).map(transformFeedback);
  } catch {
    return [];
  }
}
