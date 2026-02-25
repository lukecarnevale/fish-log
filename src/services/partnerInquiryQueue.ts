/**
 * Offline queue for partner inquiries
 * Mirrors the app's existing offlineQueue pattern using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { PartnerInquiry } from '../types/partnerInquiry';

const INQUIRY_QUEUE_KEY = '@partner_inquiry_queue';
const INQUIRY_HISTORY_KEY = '@partner_inquiry_history';
const MAX_RETRY_ATTEMPTS = 3;
const MAX_HISTORY_ENTRIES = 50;

export interface QueuedInquiry {
  localId: string;
  inquiry: PartnerInquiry;
  queuedAt: string;
  retryCount: number;
  lastError?: string;
}

export interface SubmittedInquiry {
  localId: string;
  inquiry: PartnerInquiry;
  submittedAt: string;
}

/**
 * Retrieves all queued partner inquiries from AsyncStorage
 * Returns empty array if queue doesn't exist
 */
export async function getInquiryQueue(): Promise<QueuedInquiry[]> {
  try {
    const stored = await AsyncStorage.getItem(INQUIRY_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading inquiry queue:', error);
    return [];
  }
}

/**
 * Retrieves history of successfully submitted inquiries
 * Returns empty array if history doesn't exist
 */
export async function getSubmittedInquiries(): Promise<SubmittedInquiry[]> {
  try {
    const stored = await AsyncStorage.getItem(INQUIRY_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading inquiry history:', error);
    return [];
  }
}

/**
 * Checks rate limiting for a given email
 * Limits: max 1 per email per 24h, max 5 total per hour
 */
export async function checkRateLimit(
  email: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const queue = await getInquiryQueue();
    const history = await getSubmittedInquiries();
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const normalizedEmail = email.toLowerCase().trim();

    // Check 5 per hour limit (across queue and history)
    const recentQueueCount = queue.filter(
      (q) => new Date(q.queuedAt).getTime() > oneHourAgo
    ).length;
    const recentHistoryCount = history.filter(
      (h) => new Date(h.submittedAt).getTime() > oneHourAgo
    ).length;

    if (recentQueueCount + recentHistoryCount >= 5) {
      return { allowed: false, reason: 'Too many inquiries in the last hour' };
    }

    // Check 1 per 24h per email limit
    const emailInQueue = queue.some(
      (q) =>
        q.inquiry.email.toLowerCase().trim() === normalizedEmail &&
        new Date(q.queuedAt).getTime() > oneDayAgo
    );
    const emailInHistory = history.some(
      (h) =>
        h.inquiry.email.toLowerCase().trim() === normalizedEmail &&
        new Date(h.submittedAt).getTime() > oneDayAgo
    );

    if (emailInQueue || emailInHistory) {
      return { allowed: false, reason: 'Only one inquiry per email allowed per 24 hours' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Fail open - allow submission if rate check errors
    return { allowed: true };
  }
}

/**
 * Detects duplicate inquiries based on email and business name
 * Case-insensitive comparison
 */
export function isDuplicateInquiry(inquiry: PartnerInquiry, queue: QueuedInquiry[]): boolean {
  const normalizedEmail = inquiry.email.toLowerCase().trim();
  const normalizedBusinessName = inquiry.businessName.toLowerCase().trim();

  return queue.some((queued) => {
    const qEmail = queued.inquiry.email.toLowerCase().trim();
    const qBusinessName = queued.inquiry.businessName.toLowerCase().trim();
    return qEmail === normalizedEmail && qBusinessName === normalizedBusinessName;
  });
}

/**
 * Adds an inquiry to the queue after validating rate limits and duplicates
 */
export async function addToInquiryQueue(
  inquiry: PartnerInquiry
): Promise<{ success: boolean; error?: string; queued?: boolean }> {
  try {
    // Check rate limit
    const rateLimitCheck = await checkRateLimit(inquiry.email);
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.reason };
    }

    // Get current queue
    const queue = await getInquiryQueue();

    // Check for duplicates
    if (isDuplicateInquiry(inquiry, queue)) {
      return { success: false, error: 'Similar inquiry already queued' };
    }

    // Create queued inquiry
    const queuedInquiry: QueuedInquiry = {
      localId: uuidv4(),
      inquiry,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    };

    // Add to queue
    queue.push(queuedInquiry);
    await AsyncStorage.setItem(INQUIRY_QUEUE_KEY, JSON.stringify(queue));

    return { success: true, queued: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error adding inquiry to queue:', error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Processes the inquiry queue, attempting to submit each inquiry
 * Successful submissions are moved to history, failed ones are retried up to MAX_RETRY_ATTEMPTS
 */
export async function syncInquiryQueue(
  submitFn: (inquiry: PartnerInquiry) => Promise<{ success: boolean; error?: string }>
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  try {
    let queue = await getInquiryQueue();
    let history = await getSubmittedInquiries();

    // Process queue FIFO
    const toRemove: string[] = [];
    const toUpdate: QueuedInquiry[] = [];

    for (const queued of queue) {
      try {
        const result = await submitFn(queued.inquiry);

        if (result.success) {
          // Move to history
          const submitted: SubmittedInquiry = {
            localId: queued.localId,
            inquiry: queued.inquiry,
            submittedAt: new Date().toISOString(),
          };
          history.push(submitted);
          toRemove.push(queued.localId);
          synced++;
        } else {
          // Increment retry count
          const updated = { ...queued, retryCount: queued.retryCount + 1 };

          if (updated.retryCount >= MAX_RETRY_ATTEMPTS) {
            // Exceeded max retries, remove from queue
            toRemove.push(queued.localId);
            failed++;
          } else {
            // Keep in queue for retry
            updated.lastError = result.error;
            toUpdate.push(updated);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const updated = { ...queued, retryCount: queued.retryCount + 1, lastError: errorMsg };

        if (updated.retryCount >= MAX_RETRY_ATTEMPTS) {
          toRemove.push(queued.localId);
          failed++;
        } else {
          toUpdate.push(updated);
        }
      }
    }

    // Update queue: remove successful/failed and keep retrying ones
    queue = queue.filter((q) => !toRemove.includes(q.localId));
    for (const updated of toUpdate) {
      const idx = queue.findIndex((q) => q.localId === updated.localId);
      if (idx >= 0) {
        queue[idx] = updated;
      }
    }

    // Trim history to MAX_HISTORY_ENTRIES (keep most recent)
    if (history.length > MAX_HISTORY_ENTRIES) {
      history = history.slice(-MAX_HISTORY_ENTRIES);
    }

    // Persist changes
    await AsyncStorage.setItem(INQUIRY_QUEUE_KEY, JSON.stringify(queue));
    await AsyncStorage.setItem(INQUIRY_HISTORY_KEY, JSON.stringify(history));

    return { synced, failed };
  } catch (error) {
    console.error('Error syncing inquiry queue:', error);
    return { synced, failed };
  }
}

/**
 * Clears the inquiry queue (for testing)
 */
export async function clearInquiryQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INQUIRY_QUEUE_KEY);
    await AsyncStorage.removeItem(INQUIRY_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing inquiry queue:', error);
  }
}
