// services/catchLogService.ts
//
// Service for submitting "Log a Catch" entries.
// These are non-DMF casual catch reports that appear in the feed and leaderboard.
// Reuses the existing report creation pipeline with report_type = 'catch_log'.

import { ReportInput } from '../types/report';
import { createReport, type CreateReportResult } from './reportsService';
import { clearCatchFeedCache } from './catchFeedService';
import { getOrCreateAnonymousUser } from './anonymousUserService';
import { getRewardsMemberForAnonymousUser } from './rewardsConversionService';
import type { PhotoUploadProgress } from './photoUploadService';

export interface CatchLogInput {
  fishEntries: Array<{
    species: string;
    count: number;
    lengths?: string[];
    tagNumber?: string;
  }>;
  catchDate: string; // ISO date string
  areaLabel?: string;
  areaCode?: string;
  usedHookAndLine: boolean;
  gearCode?: string;
  gearLabel?: string;
  // Ordered list of local photo URIs (catch_log supports up to 6). First entry is the cover.
  // Single-photo submissions can still pass a one-element array; legacy callers using photoUri
  // keep working via the fallback below.
  photoUris?: string[];
  /** @deprecated Use photoUris. Kept so existing callers compile during the migration. */
  photoUri?: string;
}

export interface SubmitCatchLogOptions {
  /**
   * Fires after each photo upload completes while the submission is in
   * flight. Use to render a progress indicator like "Uploading 3 of 6".
   * Only invoked when there are local photo URIs to upload.
   */
  onPhotoUploadProgress?: (progress: PhotoUploadProgress) => void;
}

/**
 * Submit a casual catch log (non-DMF).
 * Saves to Supabase with report_type='catch_log', skipping DMF submission entirely.
 */
export async function submitCatchLog(
  input: CatchLogInput,
  options?: SubmitCatchLogOptions,
): Promise<CreateReportResult> {
  // Resolve user identity
  const anonymousUser = await getOrCreateAnonymousUser();
  const rewardsMember = await getRewardsMemberForAnonymousUser();

  // Normalize photo inputs: accept the new photoUris array or fall back to
  // the legacy single photoUri. Cover photo = first in the list; it is also
  // mirrored to photoUrl so older readers (and the DMF-safe photo_url column)
  // keep working.
  const photoUris = input.photoUris && input.photoUris.length > 0
    ? input.photoUris
    : input.photoUri
      ? [input.photoUri]
      : [];
  const coverPhoto = photoUris[0];

  const reportInput: ReportInput = {
    reportType: 'catch_log',
    userId: rewardsMember?.id,
    anonymousUserId: anonymousUser?.id,

    // Harvest data
    harvestDate: input.catchDate,
    areaCode: input.areaCode || 'UNK',
    areaLabel: input.areaLabel,
    usedHookAndLine: input.usedHookAndLine,
    gearCode: input.gearCode,
    gearLabel: input.gearLabel,

    // DMF species counts all zero for catch logs
    redDrumCount: 0,
    flounderCount: 0,
    spottedSeatroutCount: 0,
    weakfishCount: 0,
    stripedBassCount: 0,

    // DMF-specific fields — sensible defaults
    hasLicense: true,
    wantTextConfirmation: false,
    wantEmailConfirmation: false,
    reportingFor: 'self',
    dmfStatus: 'pending', // won't be submitted to DMF, but field is required

    // Photos — cover goes to photoUrl (legacy column), full list goes to photos.
    // Upload orchestration happens in reportsService.createReport (Phase 3).
    photoUrl: coverPhoto,
    photos: photoUris.length > 0 ? photoUris : undefined,

    // Fish entries (the actual catch data)
    fishEntries: input.fishEntries,
  };

  // Use the existing createReport pipeline which handles:
  // - Photo upload to Supabase Storage (single or multi)
  // - RPC call to create_report_atomic / create_report_anonymous
  // - Local fallback & pending sync queue
  // - Stats + achievement updates
  const result = await createReport(reportInput, {
    onPhotoUploadProgress: options?.onPhotoUploadProgress,
  });

  // Clear feed cache so the new entry appears immediately
  try {
    await clearCatchFeedCache();
  } catch {
    // Non-critical — feed will refresh on next fetch
  }

  return result;
}
