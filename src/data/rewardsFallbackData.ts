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
    id: 'prize-license-2026',
    name: 'Annual Fishing License',
    description: 'One-year North Carolina Coastal Recreational Fishing License',
    value: '$45.00',
    category: 'license',
    sponsor: 'NC Wildlife Resources Commission',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'prize-rod-reel-2026',
    name: 'Fishing Rod & Reel Combo',
    description: 'Premium saltwater fishing rod and reel combination',
    value: '$149.99',
    category: 'gear',
    sponsor: 'Tackle Direct',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'prize-tshirt-2026',
    name: 'NC Fish Champion T-Shirt',
    description: 'Limited edition t-shirt with the 2026 Quarterly Rewards logo',
    value: '$24.99',
    category: 'apparel',
    sponsor: 'Fish Log',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'prize-hat-2026',
    name: 'Fishing Hat',
    description: 'Breathable fishing hat with neck protection',
    value: '$34.99',
    category: 'apparel',
    sponsor: 'Coastal Outfitters',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'prize-tackle-2026',
    name: 'Tackle Box Set',
    description: 'Complete tackle box with lures, hooks, and accessories',
    value: '$89.99',
    category: 'gear',
    sponsor: 'Bass Pro Shops',
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 'prize-charter-2026',
    name: 'Charter Fishing Trip',
    description: 'Half-day charter fishing experience for two people',
    value: '$350.00',
    category: 'experience',
    sponsor: 'Carolina Fishing Charters',
    sortOrder: 6,
    isActive: true,
  },
];

/**
 * Default eligibility requirements for the rewards program.
 */
export const DEFAULT_ELIGIBILITY_REQUIREMENTS: string[] = [
  'Must be a registered user of the Fish Log app',
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
  alternativeEntryText: 'Enter free at fishlog.app/enter or email rewards@fishlog.app',
  winnerContactEmail: 'rewards@fishlog.app',
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
