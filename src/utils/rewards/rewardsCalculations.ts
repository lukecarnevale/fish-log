// utils/rewards/rewardsCalculations.ts
//
// Pure helper functions for rewards calculations.
// These functions have no side effects and do not depend on React hooks or state.
// They are extracted from RewardsContext for better testability and reusability.
//

import {
  RewardsDrawing,
  UserRewardsEntry,
  RewardsCalculated,
} from '../../types/rewards';

/**
 * Calculate days remaining until a date.
 * @param dateString ISO date string (YYYY-MM-DD)
 * @returns Number of days remaining (minimum 0)
 */
export function calculateDaysRemaining(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate progress percentage through a period.
 * @param startDate ISO date string (YYYY-MM-DD)
 * @param endDate ISO date string (YYYY-MM-DD)
 * @returns Progress percentage (0-100)
 */
export function calculatePeriodProgress(startDate: string, endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();

  if (totalDuration <= 0) return 100;
  return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
}

/**
 * Check if current date is within a period.
 * @param startDate ISO date string (YYYY-MM-DD)
 * @param endDate ISO date string (YYYY-MM-DD)
 * @returns true if today is between start and end dates (inclusive)
 */
export function isWithinPeriod(startDate: string, endDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return today >= start && today <= end;
}

/**
 * Format a date for display in locale-specific format.
 * @param dateString ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "January 15, 2026")
 */
export function formatDate(dateString: string): string {
  // Parse YYYY-MM-DD manually to avoid UTC vs local timezone off-by-one.
  // new Date('2026-01-15') is UTC midnight, which in US timezones shows as Jan 14.
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate all derived values from rewards state.
 * Combines individual calculation functions into a single result object.
 * @param drawing Current rewards drawing (null if none active)
 * @param userEntry User's entry status for the current drawing
 * @returns Calculated values object
 */
export function calculateDerivedValues(
  drawing: RewardsDrawing | null,
  userEntry: UserRewardsEntry | null
): RewardsCalculated {
  const defaultCalculated: RewardsCalculated = {
    daysRemaining: 0,
    isEligible: false,
    isPeriodActive: false,
    formattedDrawingDate: '',
    quarterDisplay: '',
    periodProgress: 0,
  };

  if (!drawing) {
    return defaultCalculated;
  }

  return {
    daysRemaining: calculateDaysRemaining(drawing.drawingDate),
    isEligible: userEntry?.isEntered ?? false,
    isPeriodActive: isWithinPeriod(drawing.startDate, drawing.endDate),
    formattedDrawingDate: formatDate(drawing.drawingDate),
    quarterDisplay: `Q${drawing.quarter} ${drawing.year}`,
    periodProgress: calculatePeriodProgress(drawing.startDate, drawing.endDate),
  };
}
