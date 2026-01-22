// services/offlineQueue.ts
//
// Offline queue management for harvest report submissions.
// Stores pending reports in AsyncStorage when offline and syncs when connectivity is restored.
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../config/appConfig';
import {
  HarvestReportInput,
  QueuedReport,
  SubmittedReport,
  DMFSubmissionResult,
} from '../types/harvestReport';
import {
  submitHarvestReport,
  generateConfirmationNumber,
} from './harvestReportService';

// ============================================
// STORAGE KEYS
// ============================================

const QUEUE_KEY = APP_CONFIG.storageKeys.harvestQueue;
const HISTORY_KEY = APP_CONFIG.storageKeys.harvestHistory;

// ============================================
// QUEUE MANAGEMENT
// ============================================

/**
 * Add a report to the offline queue.
 *
 * Called when submission fails due to network issues.
 * Generates a local confirmation number for display while queued.
 *
 * @param report - The harvest report input to queue
 * @returns The local confirmation number assigned
 */
export async function addToQueue(report: HarvestReportInput): Promise<string> {
  const { unique1 } = generateConfirmationNumber();

  const queuedReport: QueuedReport = {
    // Spread all fields except harvestDate (we convert it)
    ...report,
    // Convert Date to ISO string for JSON serialization
    harvestDate: report.harvestDate.toISOString(),
    // Queue metadata
    queuedAt: new Date().toISOString(),
    localConfirmationNumber: unique1,
    retryCount: 0,
  };

  const queue = await getQueue();
  queue.push(queuedReport);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  console.log(`📥 Added to queue. Confirmation: ${unique1}. Queue size: ${queue.length}`);

  return unique1;
}

/**
 * Get all queued reports.
 *
 * @returns Array of queued reports (dates are ISO strings)
 */
export async function getQueue(): Promise<QueuedReport[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get queue:', error);
    return [];
  }
}

/**
 * Get the number of pending reports in the queue.
 *
 * @returns Count of queued reports
 */
export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Clear all reports from the queue.
 *
 * Use with caution - this removes reports that haven't been submitted.
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  console.log('🗑️ Queue cleared');
}

/**
 * Remove a specific report from the queue by its local confirmation number.
 *
 * @param localConfirmationNumber - The confirmation number of the report to remove
 * @returns True if report was found and removed
 */
export async function removeFromQueue(localConfirmationNumber: string): Promise<boolean> {
  const queue = await getQueue();
  const initialLength = queue.length;
  const filtered = queue.filter(r => r.localConfirmationNumber !== localConfirmationNumber);

  if (filtered.length < initialLength) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    return true;
  }
  return false;
}

// ============================================
// SYNC QUEUE TO DMF
// ============================================

/**
 * Result from syncing queued reports.
 */
export interface SyncResult {
  /** Number of successfully submitted reports */
  synced: number;
  /** Number of reports that failed to submit */
  failed: number;
  /** Number of reports that exceeded max retries and were removed */
  expired: number;
  /** Detailed results for each attempt */
  results: DMFSubmissionResult[];
}

/**
 * Attempt to submit all queued reports to DMF.
 *
 * Processes reports in order (FIFO).
 * Successfully submitted reports are moved to history.
 * Failed reports remain in queue with updated retry count.
 * Reports exceeding maxRetryAttempts are removed (lost).
 *
 * @returns Summary of sync operation
 */
export async function syncQueuedReports(): Promise<SyncResult> {
  const queue = await getQueue();

  if (queue.length === 0) {
    return { synced: 0, failed: 0, expired: 0, results: [] };
  }

  console.log(`📤 Syncing ${queue.length} queued reports...`);

  const results: DMFSubmissionResult[] = [];
  const stillQueued: QueuedReport[] = [];
  let synced = 0;
  let failed = 0;
  let expired = 0;

  for (const queuedReport of queue) {
    // Check if max retries exceeded
    if (queuedReport.retryCount >= APP_CONFIG.limits.maxRetryAttempts) {
      console.warn(
        `⚠️ Report ${queuedReport.localConfirmationNumber} exceeded max retries (${APP_CONFIG.limits.maxRetryAttempts}). Removing from queue.`
      );
      expired++;
      continue; // Skip this report - it's lost
    }

    // Convert queued report back to HarvestReportInput
    const input: HarvestReportInput = queuedReportToInput(queuedReport);

    // Attempt submission
    const result = await submitHarvestReport(input);
    results.push(result);

    if (result.success) {
      synced++;
      console.log(`✅ Synced: ${result.confirmationNumber}`);

      // Move to history - extract only HarvestReportInput fields from queuedReport
      const {
        queuedAt: _queuedAt,
        localConfirmationNumber: _localConfNum,
        retryCount: _retryCount,
        lastError: _lastError,
        ...harvestFields
      } = queuedReport;

      await addToHistory({
        ...harvestFields,
        confirmationNumber: result.confirmationNumber!,
        objectId: result.objectId,
        submittedAt: new Date().toISOString(),
      });
    } else {
      failed++;
      console.log(`❌ Failed: ${queuedReport.localConfirmationNumber} - ${result.error}`);

      // Keep in queue with updated error info
      stillQueued.push({
        ...queuedReport,
        retryCount: queuedReport.retryCount + 1,
        lastError: result.error,
      });
    }
  }

  // Update queue with only failed reports
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(stillQueued));

  console.log(`📊 Sync complete: ${synced} synced, ${failed} failed, ${expired} expired`);

  return { synced, failed, expired, results };
}

/**
 * Convert a QueuedReport back to HarvestReportInput for submission.
 *
 * @param queued - The queued report with ISO date strings
 * @returns HarvestReportInput with Date objects
 */
function queuedReportToInput(queued: QueuedReport): HarvestReportInput {
  // Extract only the HarvestReportInput fields (exclude queue metadata)
  const {
    queuedAt,
    localConfirmationNumber,
    retryCount,
    lastError,
    harvestDate,
    ...inputFields
  } = queued;

  return {
    ...inputFields,
    harvestDate: new Date(harvestDate),
  };
}

// ============================================
// HISTORY MANAGEMENT
// ============================================

/**
 * Input type for adding to history.
 * Can come from either:
 * 1. A successful direct submission (HarvestReportInput + metadata)
 * 2. A synced queued report (QueuedReport + metadata)
 */
interface AddToHistoryInput {
  // All HarvestReportInput fields (harvestDate as string for serialization)
  hasLicense: boolean;
  wrcId?: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;
  wantTextConfirmation: boolean;
  phone?: string;
  wantEmailConfirmation: boolean;
  email?: string;
  harvestDate: string; // ISO string
  redDrumCount: number;
  flounderCount: number;
  spottedSeatroutCount: number;
  weakfishCount: number;
  stripedBassCount: number;
  areaCode: string;
  areaLabel?: string;
  usedHookAndLine: boolean;
  gearCode?: string;
  gearLabel?: string;
  reportingFor: 'self' | 'family';
  familyCount?: number;
  userId?: string;
  enterRaffle: boolean;
  catchPhoto?: string;
  notes?: string;
  gpsCoordinates?: { latitude: number; longitude: number };
  fishEntries?: Array<{ species: string; count: number; lengths?: string[]; tagNumber?: string }>;
  // Submission metadata
  confirmationNumber: string;
  objectId?: number;
  submittedAt: string;
}

/**
 * Add a submitted report to history.
 *
 * Called after successful DMF submission.
 * History is limited to maxHistoryEntries (default 100).
 *
 * @param report - The submitted report data
 */
export async function addToHistory(report: AddToHistoryInput): Promise<void> {
  const history = await getHistory();

  // Create SubmittedReport from the queued report data
  const submittedReport: SubmittedReport = {
    // Core harvest report fields
    hasLicense: report.hasLicense,
    wrcId: report.wrcId,
    firstName: report.firstName,
    lastName: report.lastName,
    zipCode: report.zipCode,
    wantTextConfirmation: report.wantTextConfirmation,
    phone: report.phone,
    wantEmailConfirmation: report.wantEmailConfirmation,
    email: report.email,
    harvestDate: report.harvestDate, // Already an ISO string
    redDrumCount: report.redDrumCount,
    flounderCount: report.flounderCount,
    spottedSeatroutCount: report.spottedSeatroutCount,
    weakfishCount: report.weakfishCount,
    stripedBassCount: report.stripedBassCount,
    areaCode: report.areaCode,
    areaLabel: report.areaLabel,
    usedHookAndLine: report.usedHookAndLine,
    gearCode: report.gearCode,
    gearLabel: report.gearLabel,
    reportingFor: report.reportingFor,
    familyCount: report.familyCount,
    userId: report.userId,
    enterRaffle: report.enterRaffle,
    catchPhoto: report.catchPhoto,
    notes: report.notes,
    gpsCoordinates: report.gpsCoordinates,
    fishEntries: report.fishEntries,
    // Submission metadata
    confirmationNumber: report.confirmationNumber,
    objectId: report.objectId,
    submittedAt: report.submittedAt,
    raffleEntered: report.enterRaffle, // Mark as entered if they opted in
  };

  // Add to beginning (newest first)
  history.unshift(submittedReport);

  // Trim to max entries
  const trimmed = history.slice(0, APP_CONFIG.limits.maxHistoryEntries);

  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));

  console.log(`📚 Added to history: ${report.confirmationNumber}. History size: ${trimmed.length}`);
}

/**
 * Get submission history.
 *
 * Returns reports with harvestDate as ISO strings.
 * Sorted by submission date (newest first).
 *
 * @returns Array of submitted reports
 */
export async function getHistory(): Promise<SubmittedReport[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get history:', error);
    return [];
  }
}

/**
 * Get the number of reports in history.
 *
 * @returns Count of submitted reports in history
 */
export async function getHistoryCount(): Promise<number> {
  const history = await getHistory();
  return history.length;
}

/**
 * Clear all history.
 *
 * Use with caution - this removes all historical records.
 */
export async function clearHistory(): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  console.log('🗑️ History cleared');
}

/**
 * Get a specific report from history by confirmation number.
 *
 * @param confirmationNumber - The DMF confirmation number
 * @returns The report if found, undefined otherwise
 */
export async function getHistoryEntry(
  confirmationNumber: string
): Promise<SubmittedReport | undefined> {
  const history = await getHistory();
  return history.find(r => r.confirmationNumber === confirmationNumber);
}

// ============================================
// DIRECT SUBMISSION WITH AUTO-QUEUE
// ============================================

/**
 * Result from submitting a harvest report with queue fallback.
 */
export interface SubmitWithQueueResult {
  /** Whether the submission to DMF succeeded */
  success: boolean;
  /** Whether the report was queued for later */
  queued: boolean;
  /** Confirmation number (from DMF or local if queued) */
  confirmationNumber?: string;
  /** DMF object ID (only if successfully submitted) */
  objectId?: number;
  /** Error message if failed and not queued */
  error?: string;
}

/**
 * Submit a harvest report, automatically queuing if offline or failed.
 *
 * This is the main function to use from the UI.
 * It handles the full flow:
 * 1. Attempts DMF submission
 * 2. On success: saves to history, returns confirmation
 * 3. On failure: queues for later, returns local confirmation
 *
 * @param input - The harvest report input
 * @returns Result with confirmation number and queue status
 */
export async function submitWithQueueFallback(
  input: HarvestReportInput
): Promise<SubmitWithQueueResult> {
  // Attempt submission
  const result = await submitHarvestReport(input);

  if (result.success) {
    // Save to history
    await addToHistory({
      ...input,
      harvestDate: input.harvestDate.toISOString(),
      confirmationNumber: result.confirmationNumber!,
      objectId: result.objectId,
      submittedAt: new Date().toISOString(),
    });

    return {
      success: true,
      queued: false,
      confirmationNumber: result.confirmationNumber,
      objectId: result.objectId,
    };
  }

  // Submission failed - check if we should queue
  if (result.queued || APP_CONFIG.features.offlineQueueEnabled) {
    const localConfirmation = await addToQueue(input);

    return {
      success: false,
      queued: true,
      confirmationNumber: localConfirmation,
      error: result.error,
    };
  }

  // Failed and not queuing
  return {
    success: false,
    queued: false,
    error: result.error,
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Queue management
  addToQueue,
  getQueue,
  getQueueCount,
  clearQueue,
  removeFromQueue,
  syncQueuedReports,
  // History management
  addToHistory,
  getHistory,
  getHistoryCount,
  clearHistory,
  getHistoryEntry,
  // Combined submission
  submitWithQueueFallback,
};
