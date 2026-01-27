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
import { getCurrentUser, getRewardsMemberForAnonymousUser } from './userService';
import { getOrCreateAnonymousUser } from './anonymousUserService';

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
 * Create a report in Supabase.
 */
async function createReportInSupabase(input: ReportInput): Promise<StoredReport> {
  const { data, error } = await supabase
    .from('harvest_reports')
    .insert({
      user_id: input.userId || null,
      anonymous_user_id: input.anonymousUserId || null,
      dmf_status: 'pending',
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
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create report: ${error.message}`);
  }

  const report = transformReport(data);

  // Create fish entries if provided
  if (input.fishEntries && input.fishEntries.length > 0) {
    const fishEntriesData = input.fishEntries.map((entry) => ({
      report_id: report.id,
      species: entry.species,
      count: entry.count,
      lengths: entry.lengths || null,
      tag_number: entry.tagNumber || null,
    }));

    const { error: fishError } = await supabase
      .from('fish_entries')
      .insert(fishEntriesData);

    if (fishError) {
      console.warn('Failed to create fish entries:', fishError.message);
    }
  }

  return report;
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
 * Queries by user_id for rewards members, or anonymous_user_id for anonymous users.
 */
async function fetchReportsFromSupabase(
  userId?: string,
  anonymousUserId?: string
): Promise<StoredReport[]> {
  let query = supabase.from('harvest_reports').select('*');

  if (userId && anonymousUserId) {
    // Get reports from both (for rewards members with history)
    query = query.or(`user_id.eq.${userId},anonymous_user_id.eq.${anonymousUserId}`);
  } else if (userId) {
    query = query.eq('user_id', userId);
  } else if (anonymousUserId) {
    query = query.eq('anonymous_user_id', anonymousUserId);
  } else {
    return [];
  }

  const { data, error } = await query.order('harvest_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch reports: ${error.message}`);
  }

  return (data || []).map(transformReport);
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
    dmfStatus: 'pending',
    dmfConfirmationNumber: null,
    dmfObjectId: null,
    dmfSubmittedAt: null,
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
  error?: string;
}

/**
 * Create a new harvest report.
 * Saves to Supabase if connected, otherwise saves locally and queues for sync.
 */
export async function createReport(input: ReportInput): Promise<CreateReportResult> {
  const connected = await isSupabaseConnected();

  if (connected) {
    try {
      const report = await createReportInSupabase(input);
      // Also save locally for offline access
      await addLocalReport(report);
      console.log('✅ Report saved to Supabase');
      return { success: true, report, savedToSupabase: true };
    } catch (error) {
      console.warn('⚠️ Supabase save failed, saving locally:', error);
    }
  }

  // Save locally and queue for sync
  const localReport = createLocalReport(input);
  await addLocalReport(localReport);
  await addToPendingSync(localReport.id);
  console.log('📱 Report saved locally, queued for sync');

  return { success: true, report: localReport, savedToSupabase: false };
}

/**
 * Create a report from HarvestReportInput (convenience method).
 * Automatically determines whether to use anonymous_user_id or user_id.
 */
export async function createReportFromHarvestInput(
  harvestInput: HarvestReportInput
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
      // Get anonymous user
      const anonymousUser = await getOrCreateAnonymousUser();
      // Check if there's a rewards member
      const rewardsMember = await getRewardsMemberForAnonymousUser();

      // Fetch reports - for rewards members, get both their user_id and anonymous_user_id reports
      const reports = await fetchReportsFromSupabase(
        rewardsMember?.id,
        anonymousUser.id
      );

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
      };

      const supabaseReport = await createReportInSupabase(input);

      // Update local report with Supabase ID and remove from pending
      await updateLocalReport(reportId, {
        id: supabaseReport.id,
        updatedAt: new Date().toISOString(),
      });
      await removeFromPendingSync(reportId);
      synced++;

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

  try {
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
