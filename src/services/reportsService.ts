// services/reportsService.ts
//
// Service for managing harvest reports in Supabase.
// Handles local storage, Supabase sync, and DMF submission status updates.
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConnected } from '../config/supabase';
import {
  StoredReport,
  StoredFishEntry,
  ReportInput,
  DMFStatusUpdate,
  transformReport,
  transformFishEntry,
} from '../types/report';
import { HarvestReportInput } from '../types/harvestReport';
import { getCurrentUser } from './userProfileService';
import { getRewardsMemberForAnonymousUser } from './rewardsConversionService';
import { getOrCreateAnonymousUser } from './anonymousUserService';
import { ensurePublicPhotoUrl, isLocalUri } from './photoUploadService';
import { fetchCurrentDrawing, addReportToRewardsEntry } from './rewardsService';
import { updateAllStatsAfterReport, AwardedAchievement } from './statsService';
import { getDeviceId } from '../utils/deviceId';
import { ensureValidSession } from './authService';

// Re-export for convenience
export type { AwardedAchievement } from './statsService';

// Storage keys
const STORAGE_KEYS = {
  reports: '@harvest_reports',
  pendingSync: '@pending_sync_reports',
} as const;

// =============================================================================
// Local Storage Helpers
// =============================================================================

/**
 * Get all locally stored reports.
 */
async function getLocalReports(): Promise<StoredReport[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.reports);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save reports to local storage.
 */
async function saveLocalReports(reports: StoredReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports));
  } catch (error) {
    console.error('Failed to save local reports:', error);
  }
}

/**
 * Add a report to local storage.
 */
async function addLocalReport(report: StoredReport): Promise<void> {
  const reports = await getLocalReports();
  reports.unshift(report); // Add to beginning (most recent first)
  await saveLocalReports(reports);
}

/**
 * Update a report in local storage.
 */
async function updateLocalReport(reportId: string, updates: Partial<StoredReport>): Promise<void> {
  const reports = await getLocalReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index >= 0) {
    reports[index] = { ...reports[index], ...updates };
    await saveLocalReports(reports);
  }
}

/**
 * Get reports pending sync to Supabase.
 */
async function getPendingSyncReports(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.pendingSync);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Add report to pending sync queue.
 */
async function addToPendingSync(reportId: string): Promise<void> {
  const pending = await getPendingSyncReports();
  if (!pending.includes(reportId)) {
    pending.push(reportId);
    await AsyncStorage.setItem(STORAGE_KEYS.pendingSync, JSON.stringify(pending));
  }
}

/**
 * Remove report from pending sync queue.
 */
async function removeFromPendingSync(reportId: string): Promise<void> {
  const pending = await getPendingSyncReports();
  const filtered = pending.filter((id) => id !== reportId);
  await AsyncStorage.setItem(STORAGE_KEYS.pendingSync, JSON.stringify(filtered));
}

// =============================================================================
// Supabase Operations
// =============================================================================

/**
 * Create a report in Supabase using the atomic RPC function.
 */
async function createReportInSupabase(input: ReportInput): Promise<StoredReport> {
  // Prepare the input JSONB for the RPC function
  const rpcInput = {
    user_id: input.userId || null,
    anonymous_user_id: input.anonymousUserId || null,
    dmf_status: input.dmfStatus || 'pending',
    dmf_confirmation_number: input.dmfConfirmationNumber || null,
    dmf_object_id: input.dmfObjectId || null,
    dmf_submitted_at: input.dmfSubmittedAt || null,
    has_license: input.hasLicense,
    wrc_id: input.wrcId || null,
    first_name: input.firstName || null,
    last_name: input.lastName || null,
    zip_code: input.zipCode || null,
    phone: input.phone || null,
    email: input.email || null,
    want_text_confirmation: input.wantTextConfirmation,
    want_email_confirmation: input.wantEmailConfirmation,
    harvest_date: input.harvestDate,
    area_code: input.areaCode,
    area_label: input.areaLabel || null,
    used_hook_and_line: input.usedHookAndLine,
    gear_code: input.gearCode || null,
    gear_label: input.gearLabel || null,
    red_drum_count: input.redDrumCount,
    flounder_count: input.flounderCount,
    spotted_seatrout_count: input.spottedSeatroutCount,
    weakfish_count: input.weakfishCount,
    striped_bass_count: input.stripedBassCount,
    reporting_for: input.reportingFor,
    family_count: input.familyCount || null,
    notes: input.notes || null,
    photo_url: input.photoUrl || null,
    gps_latitude: input.gpsLatitude || null,
    gps_longitude: input.gpsLongitude || null,
    entered_rewards: input.enteredRewards || false,
    rewards_drawing_id: input.rewardsDrawingId || null,
    fish_entries: input.fishEntries?.map((entry) => ({
      species: entry.species,
      count: entry.count,
      lengths: entry.lengths || null,
      tag_number: entry.tagNumber || null,
    })) || [],
  };

  // Helper: build a StoredReport from RPC response data + input
  const buildStoredReport = (
    rpcData: { report_id: string; dmf_status?: string; anonymous_user_id?: string; created_at: string },
    effectiveUserId: string | null,
    effectiveAnonId: string | null,
  ): StoredReport => ({
    id: rpcData.report_id,
    userId: effectiveUserId,
    anonymousUserId: effectiveAnonId,
    dmfStatus: rpcData.dmf_status as StoredReport['dmfStatus'] || 'pending',
    dmfConfirmationNumber: input.dmfConfirmationNumber || null,
    dmfObjectId: input.dmfObjectId || null,
    dmfSubmittedAt: input.dmfSubmittedAt || null,
    dmfError: null,
    hasLicense: input.hasLicense,
    wrcId: input.wrcId || null,
    firstName: input.firstName || null,
    lastName: input.lastName || null,
    zipCode: input.zipCode || null,
    phone: input.phone || null,
    email: input.email || null,
    wantTextConfirmation: input.wantTextConfirmation,
    wantEmailConfirmation: input.wantEmailConfirmation,
    harvestDate: input.harvestDate,
    areaCode: input.areaCode,
    areaLabel: input.areaLabel || null,
    usedHookAndLine: input.usedHookAndLine,
    gearCode: input.gearCode || null,
    gearLabel: input.gearLabel || null,
    redDrumCount: input.redDrumCount,
    flounderCount: input.flounderCount,
    spottedSeatroutCount: input.spottedSeatroutCount,
    weakfishCount: input.weakfishCount,
    stripedBassCount: input.stripedBassCount,
    reportingFor: input.reportingFor,
    familyCount: input.familyCount || null,
    notes: input.notes || null,
    photoUrl: input.photoUrl || null,
    gpsLatitude: input.gpsLatitude || null,
    gpsLongitude: input.gpsLongitude || null,
    enteredRewards: input.enteredRewards || false,
    rewardsDrawingId: input.rewardsDrawingId || null,
    webhookStatus: null,
    webhookError: null,
    webhookAttempts: 0,
    createdAt: rpcData.created_at,
    updatedAt: rpcData.created_at,
  });

  // ── Authenticated path (rewards member) ────────────────────────────
  if (input.userId) {
    // Ensure the JWT is fresh before calling create_report_atomic,
    // which checks auth.uid() server-side.
    const session = await ensureValidSession();

    if (session.valid) {
      console.log('🔑 Session valid, using create_report_atomic for user:', input.userId);
      const { data, error } = await supabase.rpc('create_report_atomic', {
        p_input: rpcInput,
      });

      if (error) {
        // If specifically an auth error, fall through to anonymous path below
        const isAuthError = error.message?.toLowerCase().includes('unauthorized')
          || error.message?.toLowerCase().includes('auth');
        if (isAuthError) {
          console.warn('⚠️ create_report_atomic auth error despite session refresh; falling back to anonymous:', error.message);
        } else {
          throw new Error(`Failed to create report: ${error.message}`);
        }
      } else {
        return buildStoredReport(data, input.userId, null);
      }
    } else {
      console.warn(`⚠️ Session invalid (${session.reason}); falling back to anonymous RPC with user_id preserved`);
    }

    // ── Fallback: use anonymous RPC but keep user_id in input ──────
    // The updated create_report_anonymous RPC writes user_id from p_input,
    // so the rewards member link is preserved even without an auth session.
    console.log('🔄 Falling back to create_report_anonymous for rewards member:', input.userId);
  }

  // ── Anonymous path (or fallback from above) ────────────────────────
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.rpc('create_report_anonymous', {
    p_device_id: deviceId,
    p_input: rpcInput,
  });

  if (error) {
    throw new Error(`Failed to create report: ${error.message}`);
  }

  return buildStoredReport(data, input.userId || null, data.anonymous_user_id);
}

/**
 * Update DMF status for a report in Supabase.
 */
async function updateDMFStatusInSupabase(
  reportId: string,
  status: DMFStatusUpdate
): Promise<StoredReport> {
  const { data, error } = await supabase
    .from('harvest_reports')
    .update({
      dmf_status: status.dmfStatus,
      dmf_confirmation_number: status.dmfConfirmationNumber || null,
      dmf_object_id: status.dmfObjectId || null,
      dmf_submitted_at: status.dmfSubmittedAt || null,
      dmf_error: status.dmfError || null,
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update DMF status: ${error.message}`);
  }

  return transformReport(data);
}

/**
 * Fetch all reports for a user from Supabase.
 * Uses RPC for anonymous users, direct query with RLS for authenticated users.
 */
async function fetchReportsFromSupabase(
  userId?: string,
  anonymousUserId?: string
): Promise<StoredReport[]> {
  // For authenticated users, use RLS-protected direct query
  if (userId && !anonymousUserId) {
    const { data, error } = await supabase
      .from('harvest_reports')
      .select('*')
      .eq('user_id', userId)
      .order('harvest_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }

    return (data || []).map(transformReport);
  }

  // For rewards members with anonymous history, query both user_id and anonymous_user_id
  if (userId && anonymousUserId) {
    const { data, error } = await supabase
      .from('harvest_reports')
      .select('*')
      .or(`user_id.eq.${userId},anonymous_user_id.eq.${anonymousUserId}`)
      .order('harvest_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }

    return (data || []).map(transformReport);
  }

  // For anonymous users, use RPC function
  if (anonymousUserId) {
    const { data, error } = await supabase.rpc('get_reports_for_device', {
      p_device_id: await getDeviceId(),
    });

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    // Transform each report from the JSONB array
    return data.map((report) => transformReport(report));
  }

  return [];
}

/**
 * Fetch fish entries for a report from Supabase.
 */
async function fetchFishEntriesFromSupabase(reportId: string): Promise<StoredFishEntry[]> {
  const { data, error } = await supabase
    .from('fish_entries')
    .select('*')
    .eq('report_id', reportId);

  if (error) {
    throw new Error(`Failed to fetch fish entries: ${error.message}`);
  }

  return (data || []).map(transformFishEntry);
}

// =============================================================================
// Type Conversion
// =============================================================================

/**
 * Convert HarvestReportInput to ReportInput for Supabase.
 */
export function harvestInputToReportInput(
  input: HarvestReportInput,
  userId?: string,
  anonymousUserId?: string
): ReportInput {
  return {
    userId,
    anonymousUserId,
    hasLicense: input.hasLicense,
    wrcId: input.wrcId,
    firstName: input.firstName,
    lastName: input.lastName,
    zipCode: input.zipCode,
    phone: input.phone,
    email: input.email,
    wantTextConfirmation: input.wantTextConfirmation,
    wantEmailConfirmation: input.wantEmailConfirmation,
    harvestDate: input.harvestDate instanceof Date
      ? input.harvestDate.toISOString()
      : input.harvestDate,
    areaCode: input.areaCode,
    areaLabel: input.areaLabel,
    usedHookAndLine: input.usedHookAndLine,
    gearCode: input.gearCode,
    gearLabel: input.gearLabel,
    redDrumCount: input.redDrumCount,
    flounderCount: input.flounderCount,
    spottedSeatroutCount: input.spottedSeatroutCount,
    weakfishCount: input.weakfishCount,
    stripedBassCount: input.stripedBassCount,
    reportingFor: input.reportingFor,
    familyCount: input.familyCount,
    notes: input.notes,
    photoUrl: input.catchPhoto,
    gpsLatitude: input.gpsCoordinates?.latitude,
    gpsLongitude: input.gpsCoordinates?.longitude,
    enteredRewards: input.enterRaffle,
    fishEntries: input.fishEntries?.map((fe) => ({
      species: fe.species,
      count: fe.count,
      lengths: fe.lengths,
      tagNumber: fe.tagNumber,
    })),
  };
}

/**
 * Generate a local report ID.
 */
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a local StoredReport from input (for offline use).
 */
function createLocalReport(input: ReportInput): StoredReport {
  const now = new Date().toISOString();
  return {
    id: generateLocalId(),
    userId: input.userId || null,
    anonymousUserId: input.anonymousUserId || null,
    dmfStatus: input.dmfStatus || 'pending',
    dmfConfirmationNumber: input.dmfConfirmationNumber || null,
    dmfObjectId: input.dmfObjectId || null,
    dmfSubmittedAt: input.dmfSubmittedAt || null,
    dmfError: null,
    hasLicense: input.hasLicense,
    wrcId: input.wrcId || null,
    firstName: input.firstName || null,
    lastName: input.lastName || null,
    zipCode: input.zipCode || null,
    phone: input.phone || null,
    email: input.email || null,
    wantTextConfirmation: input.wantTextConfirmation,
    wantEmailConfirmation: input.wantEmailConfirmation,
    harvestDate: input.harvestDate,
    areaCode: input.areaCode,
    areaLabel: input.areaLabel || null,
    usedHookAndLine: input.usedHookAndLine,
    gearCode: input.gearCode || null,
    gearLabel: input.gearLabel || null,
    redDrumCount: input.redDrumCount,
    flounderCount: input.flounderCount,
    spottedSeatroutCount: input.spottedSeatroutCount,
    weakfishCount: input.weakfishCount,
    stripedBassCount: input.stripedBassCount,
    reportingFor: input.reportingFor,
    familyCount: input.familyCount || null,
    notes: input.notes || null,
    photoUrl: input.photoUrl || null,
    gpsLatitude: input.gpsLatitude || null,
    gpsLongitude: input.gpsLongitude || null,
    enteredRewards: input.enteredRewards || false,
    rewardsDrawingId: input.rewardsDrawingId || null,
    webhookStatus: null,
    webhookError: null,
    webhookAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// Public API
// =============================================================================

export interface CreateReportResult {
  success: boolean;
  report: StoredReport;
  savedToSupabase: boolean;
  achievementsAwarded?: AwardedAchievement[];
  error?: string;
  /** When savedToSupabase is false, describes why (e.g. 'connection', 'auth', 'rpc_error') */
  supabaseError?: string;
}

/**
 * Create a new harvest report.
 * Saves to Supabase if connected, otherwise saves locally and queues for sync.
 * Uploads photos to Supabase Storage to ensure cross-platform visibility.
 */
export async function createReport(input: ReportInput): Promise<CreateReportResult> {
  const connected = await isSupabaseConnected();

  // If we have a local photo URI and we're connected, upload it first
  if (connected && isLocalUri(input.photoUrl)) {
    console.log('📸 Uploading photo to Supabase Storage...');
    const publicUrl = await ensurePublicPhotoUrl(input.photoUrl, input.userId || input.anonymousUserId);
    if (publicUrl) {
      console.log('✅ Photo uploaded, using public URL');
      input = { ...input, photoUrl: publicUrl };
    } else {
      console.warn('⚠️ Photo upload failed, storing local URI (may not be visible to other users)');
    }
  }

  let supabaseFailureReason: string | undefined;

  if (connected) {
    try {
      const report = await createReportInSupabase(input);
      // Also save locally for offline access
      await addLocalReport(report);
      console.log('✅ Report saved to Supabase');

      // Update user stats if this is a rewards member (has user_id)
      let achievementsAwarded: AwardedAchievement[] = [];
      if (report.userId) {
        try {
          const statsResult = await updateAllStatsAfterReport(report.userId, report);
          achievementsAwarded = statsResult.achievementsAwarded;
          if (achievementsAwarded.length > 0) {
            console.log('🏆 Achievements unlocked:', achievementsAwarded.map(a => a.name).join(', '));
          }

          // Associate this report with the user's rewards entry
          await addReportToRewardsEntry(report.userId, report.id);
        } catch (statsError) {
          console.warn('⚠️ Failed to update stats (report still saved):', statsError);
        }
      }

      return { success: true, report, savedToSupabase: true, achievementsAwarded };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Supabase save failed, saving locally:', msg);
      supabaseFailureReason = msg;
    }
  } else {
    supabaseFailureReason = 'No connection to Supabase';
  }

  // Save locally and queue for sync
  const localReport = createLocalReport(input);
  await addLocalReport(localReport);
  await addToPendingSync(localReport.id);
  console.log('📱 Report saved locally, queued for sync. Reason:', supabaseFailureReason);

  return { success: true, report: localReport, savedToSupabase: false, supabaseError: supabaseFailureReason };
}

/**
 * Optional DMF submission result data to include when creating a report.
 */
export interface DMFResultData {
  confirmationNumber?: string;
  objectId?: number;
  submittedAt?: string;
}

/**
 * Create a report from HarvestReportInput (convenience method).
 * Automatically determines whether to use anonymous_user_id or user_id.
 * Optionally includes DMF submission result data if the report was successfully submitted to DMF.
 */
export async function createReportFromHarvestInput(
  harvestInput: HarvestReportInput,
  dmfResult?: DMFResultData
): Promise<CreateReportResult> {
  // First, get the anonymous user (always exists)
  const anonymousUser = await getOrCreateAnonymousUser();

  // Check if there's a rewards member for this anonymous user
  let rewardsMember = await getRewardsMemberForAnonymousUser();

  // Fallback: Also check the cached user (for magic link sign-ins that might not have anonymous_user_id linked)
  if (!rewardsMember) {
    try {
      const cachedUser = await AsyncStorage.getItem('@current_user');
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        if (user?.id && user?.rewardsOptedInAt) {
          console.log('📝 createReportFromHarvestInput: Using cached rewards user for report');
          rewardsMember = user;
        }
      }
    } catch (error) {
      console.warn('Failed to check cached user for report:', error);
    }
  }

  let input: ReportInput;

  if (rewardsMember) {
    // User is a rewards member - use their user_id
    console.log('📝 createReportFromHarvestInput: Creating report with user_id:', rewardsMember.id);
    input = harvestInputToReportInput(harvestInput, rewardsMember.id, undefined);
  } else {
    // User is anonymous - use their anonymous_user_id
    console.log('📝 createReportFromHarvestInput: Creating report with anonymous_user_id:', anonymousUser.id);
    input = harvestInputToReportInput(harvestInput, undefined, anonymousUser.id);
  }

  // Include DMF result data if provided
  if (dmfResult) {
    input.dmfConfirmationNumber = dmfResult.confirmationNumber;
    input.dmfObjectId = dmfResult.objectId;
    input.dmfSubmittedAt = dmfResult.submittedAt;
    input.dmfStatus = dmfResult.confirmationNumber ? 'submitted' : 'pending';
  }

  // If user is entering the raffle, get the current drawing ID
  if (harvestInput.enterRaffle) {
    try {
      const currentDrawing = await fetchCurrentDrawing();
      if (currentDrawing) {
        input.rewardsDrawingId = currentDrawing.id;
        console.log('🎁 Linking report to rewards drawing:', currentDrawing.id);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch current drawing for raffle entry:', error);
    }
  }

  return createReport(input);
}

/**
 * Update DMF submission status for a report.
 */
export async function updateDMFStatus(
  reportId: string,
  status: DMFStatusUpdate
): Promise<StoredReport | null> {
  // Always update locally first
  await updateLocalReport(reportId, {
    dmfStatus: status.dmfStatus,
    dmfConfirmationNumber: status.dmfConfirmationNumber || null,
    dmfObjectId: status.dmfObjectId || null,
    dmfSubmittedAt: status.dmfSubmittedAt || null,
    dmfError: status.dmfError || null,
    updatedAt: new Date().toISOString(),
  });

  const connected = await isSupabaseConnected();

  if (connected && !reportId.startsWith('local_')) {
    try {
      const updated = await updateDMFStatusInSupabase(reportId, status);
      // Update local copy with Supabase response
      await updateLocalReport(reportId, updated);
      return updated;
    } catch (error) {
      console.warn('⚠️ Failed to update DMF status in Supabase:', error);
    }
  }

  // Return the local version
  const reports = await getLocalReports();
  return reports.find((r) => r.id === reportId) || null;
}

/**
 * Get all reports for the current user.
 * For rewards members, includes both their member reports and anonymous history.
 */
export async function getReports(): Promise<StoredReport[]> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      // Get anonymous user (current device)
      const anonymousUser = await getOrCreateAnonymousUser();
      // Check if there's a rewards member
      const rewardsMember = await getRewardsMemberForAnonymousUser();

      // For rewards members, use their stored anonymous_user_id (from when they signed up)
      // This is important because the current device's anonymous_user_id might be different
      // (e.g., if user cleared storage and signed back in)
      const effectiveAnonymousUserId = rewardsMember?.anonymousUserId || anonymousUser.id;

      console.log('🔍 getReports - Querying with userId:', rewardsMember?.id, 'anonymousUserId:', effectiveAnonymousUserId);

      // Fetch reports - for rewards members, get both their user_id and anonymous_user_id reports
      const reports = await fetchReportsFromSupabase(
        rewardsMember?.id,
        effectiveAnonymousUserId
      );

      console.log('🔍 getReports - Found', reports.length, 'reports from Supabase');

      // Merge with local reports (in case some haven't synced)
      const localReports = await getLocalReports();
      const localOnlyReports = localReports.filter(
        (local) => local.id.startsWith('local_') && !reports.some((r) => r.id === local.id)
      );
      const merged = [...localOnlyReports, ...reports];
      // Update local cache
      await saveLocalReports(merged);
      console.log('✅ Reports fetched from Supabase');
      return merged;
    } catch (error) {
      console.warn('⚠️ Supabase fetch failed, using local reports:', error);
    }
  }

  // Return local reports
  const localReports = await getLocalReports();
  console.log('📱 Using local reports');
  return localReports;
}

/**
 * Get a single report by ID.
 */
export async function getReport(reportId: string): Promise<StoredReport | null> {
  const reports = await getReports();
  return reports.find((r) => r.id === reportId) || null;
}

/**
 * Get fish entries for a report.
 */
export async function getFishEntries(reportId: string): Promise<StoredFishEntry[]> {
  const connected = await isSupabaseConnected();

  if (connected && !reportId.startsWith('local_')) {
    try {
      return await fetchFishEntriesFromSupabase(reportId);
    } catch (error) {
      console.warn('⚠️ Failed to fetch fish entries:', error);
    }
  }

  // Fish entries for local reports would need to be stored separately
  // For now, return empty array for local reports
  return [];
}

/**
 * Sync pending local reports to Supabase.
 * Call this when network becomes available.
 */
export async function syncPendingReports(): Promise<{
  synced: number;
  failed: number;
}> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    return { synced: 0, failed: 0 };
  }

  const pending = await getPendingSyncReports();
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const localReports = await getLocalReports();
  let synced = 0;
  let failed = 0;

  for (const reportId of pending) {
    const localReport = localReports.find((r) => r.id === reportId);
    if (!localReport) {
      await removeFromPendingSync(reportId);
      continue;
    }

    try {
      // Create in Supabase
      const input: ReportInput = {
        userId: localReport.userId || undefined,
        anonymousUserId: localReport.anonymousUserId || undefined,
        hasLicense: localReport.hasLicense,
        wrcId: localReport.wrcId || undefined,
        firstName: localReport.firstName || undefined,
        lastName: localReport.lastName || undefined,
        zipCode: localReport.zipCode || undefined,
        phone: localReport.phone || undefined,
        email: localReport.email || undefined,
        wantTextConfirmation: localReport.wantTextConfirmation,
        wantEmailConfirmation: localReport.wantEmailConfirmation,
        harvestDate: localReport.harvestDate,
        areaCode: localReport.areaCode,
        areaLabel: localReport.areaLabel || undefined,
        usedHookAndLine: localReport.usedHookAndLine,
        gearCode: localReport.gearCode || undefined,
        gearLabel: localReport.gearLabel || undefined,
        redDrumCount: localReport.redDrumCount,
        flounderCount: localReport.flounderCount,
        spottedSeatroutCount: localReport.spottedSeatroutCount,
        weakfishCount: localReport.weakfishCount,
        stripedBassCount: localReport.stripedBassCount,
        reportingFor: localReport.reportingFor,
        familyCount: localReport.familyCount || undefined,
        notes: localReport.notes || undefined,
        photoUrl: localReport.photoUrl || undefined,
        gpsLatitude: localReport.gpsLatitude || undefined,
        gpsLongitude: localReport.gpsLongitude || undefined,
        enteredRewards: localReport.enteredRewards,
        rewardsDrawingId: localReport.rewardsDrawingId || undefined,
        // Include DMF data so it's preserved when syncing to Supabase
        dmfStatus: localReport.dmfStatus,
        dmfConfirmationNumber: localReport.dmfConfirmationNumber || undefined,
        dmfObjectId: localReport.dmfObjectId || undefined,
        dmfSubmittedAt: localReport.dmfSubmittedAt || undefined,
      };

      const supabaseReport = await createReportInSupabase(input);

      // Update local report with Supabase ID and remove from pending
      await updateLocalReport(reportId, {
        id: supabaseReport.id,
        updatedAt: new Date().toISOString(),
      });
      await removeFromPendingSync(reportId);
      synced++;

      // Update streak & check achievements for this synced report
      if (supabaseReport.userId) {
        try {
          await updateAllStatsAfterReport(supabaseReport.userId, supabaseReport);
          await addReportToRewardsEntry(supabaseReport.userId, supabaseReport.id);
        } catch (statsError) {
          console.warn('⚠️ Stats/achievements failed for synced report (non-critical):', statsError);
        }
      }

      console.log(`✅ Synced report ${reportId} -> ${supabaseReport.id}`);
    } catch (error) {
      console.warn(`⚠️ Failed to sync report ${reportId}:`, error);
      failed++;
    }
  }

  console.log(`📊 Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

/**
 * Retry webhook delivery for reports that previously failed.
 *
 * Queries Supabase for reports where `webhook_status = 'failed'` and
 * `webhook_attempts < 3`, then re-invokes the edge function.
 * Called during the foreground sync cycle so retries happen automatically.
 */
export async function retryFailedWebhooks(): Promise<{ retried: number; succeeded: number }> {
  const connected = await isSupabaseConnected();
  if (!connected) return { retried: 0, succeeded: 0 };

  try {
    const { data: failedReports, error } = await supabase
      .from('harvest_reports')
      .select('dmf_object_id, dmf_confirmation_number, webhook_attempts')
      .eq('webhook_status', 'failed')
      .lt('webhook_attempts', 3)
      .not('dmf_object_id', 'is', null);

    if (error || !failedReports || failedReports.length === 0) {
      return { retried: 0, succeeded: 0 };
    }

    console.log(`🔄 Retrying webhooks for ${failedReports.length} reports...`);

    // Lazy import to avoid circular dependency
    const { triggerDMFConfirmationWebhook, transformToDMFPayload } = await import('./harvestReportService');
    let succeeded = 0;

    for (const report of failedReports) {
      try {
        // We don't have the full payload stored, but the edge function only
        // needs objectId and globalId as required identifiers.  We pass
        // minimal stubs for the rest; the edge function uses them to build
        // the webhook body, but DMF already has the full data.
        const result = await triggerDMFConfirmationWebhook(
          report.dmf_object_id,
          '', // globalId — not critical for retry, edge function fills from attributes
          {} as any, // dmfAttributes stub — edge function handles missing fields gracefully
          { x: 0, y: 0 } as any, // geometry stub
          false,
        );

        // Update attempt count regardless of outcome
        const newAttempts = (report.webhook_attempts ?? 0) + 1;
        await supabase.from('harvest_reports').update({
          webhook_status: result.success ? 'sent' : 'failed',
          webhook_error: result.errors.length > 0 ? result.errors.join('; ') : null,
          webhook_attempts: newAttempts,
        }).eq('dmf_object_id', report.dmf_object_id);

        if (result.success) succeeded++;
      } catch (retryErr) {
        console.warn(`⚠️ Webhook retry failed for objectId ${report.dmf_object_id}:`, retryErr);
      }
    }

    console.log(`📊 Webhook retry: ${succeeded}/${failedReports.length} succeeded`);
    return { retried: failedReports.length, succeeded };
  } catch (err) {
    console.warn('⚠️ retryFailedWebhooks error:', err);
    return { retried: 0, succeeded: 0 };
  }
}

/**
 * Get count of reports pending sync.
 */
export async function getPendingSyncCount(): Promise<number> {
  const pending = await getPendingSyncReports();
  return pending.length;
}

/**
 * Clear all local report data.
 * Useful for logout or debugging.
 */
export async function clearReportsCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.reports,
      STORAGE_KEYS.pendingSync,
    ]);
  } catch (error) {
    console.error('Failed to clear reports cache:', error);
  }
}

/**
 * Link reports from an anonymous user to a rewards member.
 * Called after a user signs up for rewards to ensure their reports appear in the Catch Feed.
 */
export async function linkReportsToUser(
  anonymousUserId: string,
  userId: string
): Promise<{ updated: number; error?: string }> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    return { updated: 0, error: 'Not connected to Supabase' };
  }

  console.log(`🔗 linkReportsToUser: Attempting to link reports with anonymous_user_id=${anonymousUserId} to user_id=${userId}`);

  try {
    // First, check how many reports exist with this anonymous_user_id
    const { data: existingReports, error: checkError } = await supabase
      .from('harvest_reports')
      .select('id, user_id, anonymous_user_id')
      .eq('anonymous_user_id', anonymousUserId);

    if (checkError) {
      console.warn('⚠️ Failed to check existing reports:', checkError.message);
    } else {
      console.log(`🔗 linkReportsToUser: Found ${existingReports?.length || 0} reports with anonymous_user_id=${anonymousUserId}`);
      existingReports?.forEach((r, i) => {
        console.log(`  Report ${i + 1}: id=${r.id}, user_id=${r.user_id}, anonymous_user_id=${r.anonymous_user_id}`);
      });
    }

    // Update all reports with this anonymous_user_id to also have the user_id
    const { data, error } = await supabase
      .from('harvest_reports')
      .update({ user_id: userId })
      .eq('anonymous_user_id', anonymousUserId)
      .is('user_id', null) // Only update reports that don't already have a user_id
      .select('id');

    if (error) {
      console.warn('⚠️ Failed to link reports to user:', error.message);
      return { updated: 0, error: error.message };
    }

    const updateCount = data?.length || 0;
    console.log(`✅ Linked ${updateCount} reports from anonymous user to rewards member`);

    // Log the updated reports
    if (data && data.length > 0) {
      console.log('🔗 Updated report IDs:', data.map(r => r.id).join(', '));
    }

    return { updated: updateCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn('⚠️ Error linking reports:', message);
    return { updated: 0, error: message };
  }
}

/**
 * Get reports summary for display.
 */
export async function getReportsSummary(): Promise<{
  totalReports: number;
  totalFish: number;
  pendingSync: number;
  lastReportDate: string | null;
}> {
  const reports = await getReports();
  const pendingSync = await getPendingSyncCount();

  const totalFish = reports.reduce(
    (sum, r) =>
      sum +
      r.redDrumCount +
      r.flounderCount +
      r.spottedSeatroutCount +
      r.weakfishCount +
      r.stripedBassCount,
    0
  );

  const lastReportDate = reports.length > 0 ? reports[0].harvestDate : null;

  return {
    totalReports: reports.length,
    totalFish,
    pendingSync,
    lastReportDate,
  };
}
