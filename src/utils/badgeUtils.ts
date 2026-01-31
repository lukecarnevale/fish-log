// utils/badgeUtils.ts
//
// Utility functions for managing badge notifications on quick action cards.

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for badge tracking
export const BADGE_STORAGE_KEYS = {
  lastViewedPastReports: '@badge_last_viewed_past_reports',
  lastViewedCatchFeed: '@badge_last_viewed_catch_feed',
  lastReportTimestamp: '@badge_last_report_timestamp',
} as const;

/**
 * Mark that a new report has been submitted.
 * Called from ConfirmationScreen when a report is successfully submitted.
 */
export async function markNewReportSubmitted(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      BADGE_STORAGE_KEYS.lastReportTimestamp,
      new Date().toISOString()
    );
    console.log('📝 Marked new report submitted for badge');
  } catch (error) {
    console.error('Error marking new report:', error);
  }
}

/**
 * Clear the "new report" indicator.
 * Called when user views the Past Reports screen.
 */
export async function clearNewReportIndicator(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      BADGE_STORAGE_KEYS.lastViewedPastReports,
      new Date().toISOString()
    );
  } catch (error) {
    console.error('Error clearing new report indicator:', error);
  }
}

/**
 * Clear the "new catches" indicator.
 * Called when user views the Catch Feed screen.
 */
export async function clearNewCatchesIndicator(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      BADGE_STORAGE_KEYS.lastViewedCatchFeed,
      new Date().toISOString()
    );
  } catch (error) {
    console.error('Error clearing new catches indicator:', error);
  }
}

/**
 * Check if there's a new report since last viewing Past Reports.
 */
export async function hasNewReportSinceLastView(): Promise<boolean> {
  try {
    const lastViewed = await AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastViewedPastReports);
    const lastReport = await AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastReportTimestamp);

    if (!lastReport) return false;
    if (!lastViewed) return true;

    return lastReport > lastViewed;
  } catch (error) {
    console.error('Error checking new report:', error);
    return false;
  }
}
