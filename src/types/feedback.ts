// types/feedback.ts
//
// Type definitions for user feedback system.
//

export type FeedbackType = 'feedback' | 'bug_report' | 'feature_request';
export type FeedbackStatus = 'new' | 'read' | 'in_progress' | 'resolved' | 'closed';

/**
 * Feedback entry stored in Supabase.
 */
export interface Feedback {
  id: string;
  userId: string | null;
  deviceId: string | null;
  type: FeedbackType;
  subject: string | null;
  message: string;
  email: string | null;
  appVersion: string | null;
  platform: string | null;
  osVersion: string | null;
  screenName: string | null;
  errorMessage: string | null;
  status: FeedbackStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for submitting feedback.
 */
export interface FeedbackInput {
  type: FeedbackType;
  message: string;
  subject?: string;
  email?: string;
  screenName?: string;
  errorMessage?: string;
}

/**
 * Transform Supabase feedback row to Feedback type.
 */
export function transformFeedback(row: Record<string, unknown>): Feedback {
  return {
    id: row.id as string,
    userId: row.user_id as string | null,
    deviceId: row.device_id as string | null,
    type: row.type as FeedbackType,
    subject: row.subject as string | null,
    message: row.message as string,
    email: row.email as string | null,
    appVersion: row.app_version as string | null,
    platform: row.platform as string | null,
    osVersion: row.os_version as string | null,
    screenName: row.screen_name as string | null,
    errorMessage: row.error_message as string | null,
    status: row.status as FeedbackStatus,
    adminNotes: row.admin_notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
