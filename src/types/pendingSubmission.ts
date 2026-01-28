// types/pendingSubmission.ts
//
// Type definitions for pending submissions - used to preserve submission
// context when a user starts the auth flow but closes the app mid-process.

export interface PendingSubmissionFormData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  harvestReportId?: string; // If report was already submitted to DMF
}

export interface PendingSubmission {
  id: string;
  deviceId: string;
  email: string;
  formData: PendingSubmissionFormData;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface PendingSubmissionInput {
  deviceId: string;
  email: string;
  formData: PendingSubmissionFormData;
}

/**
 * Transform a Supabase row to a PendingSubmission object.
 * Handles snake_case to camelCase conversion.
 */
export function transformPendingSubmission(
  row: Record<string, unknown>
): PendingSubmission {
  return {
    id: row.id as string,
    deviceId: row.device_id as string,
    email: row.email as string,
    formData: (row.form_data as PendingSubmissionFormData) || {},
    status: row.status as PendingSubmission['status'],
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
  };
}
