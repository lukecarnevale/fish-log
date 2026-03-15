// data/rewardsFallbackData.ts
//
// Fallback/seed data for the Quarterly Rewards system.
// Used when Supabase is unavailable or for initial app load.
// This data should mirror what's stored in Supabase.
//

import { Prize, RewardsConfig, RewardsDrawing, Quarter } from '../types/rewards';
import {
  getCurrentQuarter,
  getCurrentYear,
  getQuarterStartDate,
  getQuarterEndDate,
  formatQuarterDisplay,
} from '../utils/dateUtils';

/**
 * Default prizes available in the rewards program.
 * Update this when prizes change.
 */
export const FALLBACK_PRIZES: Prize[] = [
  {
    id: '898c2b3b-3359-4cc4-86c3-8e73e2638c9c',
    name: '1-Year BoatUS Membership',
    description:
      'A BoatUS Basic Membership provides essential boater benefits, including 24/7 dispatch for on-water towing, roadside trailer assistance, and a subscription to BoatUS Magazine.',
    imageUrl: 'https://www.boatus.com/_next/image?url=%2Fimages%2F9&w=384&q=75',
    value: 'Valued at $24.99',
    category: 'license',
    sponsor: 'BoatUS',
    sortOrder: 1,
    isActive: true,
  },
];

/**
 * Default eligibility requirements for the rewards program.
 */
export const DEFAULT_ELIGIBILITY_REQUIREMENTS: string[] = [
  'Must be a registered user of the Fish Log Co. app',
  'Must be a legal resident of North Carolina, 18 years or older',
  'One entry per person per quarter regardless of number of reports submitted',
  'NC Wildlife employees and immediate family members are not eligible',
];

/**
 * Default rewards configuration.
 * This should be updated when global settings change.
 */
export const FALLBACK_CONFIG: RewardsConfig = {
  isEnabled: true,
  currentDrawingId: null, // Will be set dynamically
  legalDisclaimer: 'NO PURCHASE OR HARVEST REPORT NECESSARY TO ENTER OR WIN. Open to legal residents of North Carolina, 18 years or older.',
  noPurchaseNecessaryText: 'No purchase or report necessary to enter.',
  alternativeEntryText: 'Enter free at fishlogco.github.io or email fishlogco@gmail.com',
  winnerContactEmail: 'fishlogco@gmail.com',
  updatedAt: new Date().toISOString(),
};

/**
 * Generate a dynamic drawing for the current quarter.
 * This ensures the app always has valid drawing data.
 */
export function generateCurrentQuarterDrawing(): RewardsDrawing {
  const quarter = getCurrentQuarter();
  const year = getCurrentYear();
  const quarterDisplay = formatQuarterDisplay(quarter, year);

  return {
    id: `${year}-q${quarter}`,
    name: `${year} Quarterly Rewards`,
    description: `Submit harvest reports to be eligible for quarterly prize drawings. ${FALLBACK_CONFIG.noPurchaseNecessaryText} ${FALLBACK_CONFIG.alternativeEntryText}`,
    eligibilityRequirements: DEFAULT_ELIGIBILITY_REQUIREMENTS,
    prizes: FALLBACK_PRIZES,
    quarter,
    year,
    startDate: getQuarterStartDate(quarter, year),
    endDate: getQuarterEndDate(quarter, year),
    drawingDate: getQuarterEndDate(quarter, year),
    isActive: true,
    alternativeEntryUrl: 'https://fishlog.app/enter',
    rulesUrl: 'https://fishlog.app/rewards/rules',
    contactEmail: FALLBACK_CONFIG.winnerContactEmail,
  };
}

/**
 * The current quarter's drawing (generated dynamically).
 */
export const FALLBACK_DRAWING: RewardsDrawing = generateCurrentQuarterDrawing();

// Update config with current drawing ID
FALLBACK_CONFIG.currentDrawingId = FALLBACK_DRAWING.id;

// Re-export date utilities for backward compatibility
export { getCurrentQuarter, getCurrentYear, getQuarterStartDate, getQuarterEndDate, formatQuarterDisplay } from '../utils/dateUtils';
