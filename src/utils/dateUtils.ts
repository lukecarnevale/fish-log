// utils/dateUtils.ts
//
// Shared date formatting and calculation utilities.
//

import { Quarter } from '../types/rewards';

/**
 * Format a date string to a relative time (e.g., "2h ago", "3d ago").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format member since date for display.
 */
export function formatMemberSince(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Get the current quarter (1-4) based on the current date.
 */
export function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth(); // 0-11
  return (Math.floor(month / 3) + 1) as Quarter;
}

/**
 * Get the current year.
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get quarter start date.
 */
export function getQuarterStartDate(quarter: Quarter, year: number): string {
  const month = (quarter - 1) * 3; // 0, 3, 6, or 9
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/**
 * Get quarter end date (last day of the quarter).
 */
export function getQuarterEndDate(quarter: Quarter, year: number): string {
  const endMonth = quarter * 3; // 3, 6, 9, or 12
  const lastDay = new Date(year, endMonth, 0).getDate();
  return `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Format quarter display string (e.g., "Q1 2026").
 */
export function formatQuarterDisplay(quarter: Quarter, year: number): string {
  return `Q${quarter} ${year}`;
}
