// types/harvestReport.ts
//
// Type definitions for NC DMF Harvest Reporting.
// Separates DMF-required fields from app-only fields per the dual data flow architecture.
//

import { SpeciesCounts } from '../constants/species';

// ============================================
// HARVEST REPORT INPUT (User Form Data)
// ============================================

/**
 * User input from the harvest report form.
 *
 * This includes BOTH fields that go to DMF AND app-only fields.
 * The service layer is responsible for separating these when submitting.
 *
 * Field categories:
 * - IDENTITY: License status and user identification
 * - CONTACT: Phone/email for confirmations
 * - HARVEST DATA: Species counts, location, gear
 * - OPTIONAL DMF: Family reporting
 * - APP-ONLY: Raffle, photos, GPS (never sent to DMF)
 */
export interface HarvestReportInput {
  // === IDENTITY (goes to DMF + local storage) ===

  /**
   * Does the user have a NC fishing license?
   * Determines which identity fields are required.
   */
  hasLicense: boolean;

  /**
   * WRC ID or Customer ID from fishing license.
   * Required when hasLicense = true.
   */
  wrcId?: string;

  /**
   * First name.
   * Required when hasLicense = false.
   * Optional but recommended when hasLicense = true (for raffle contact).
   */
  firstName?: string;

  /**
   * Last name.
   * Required when hasLicense = false.
   * Optional but recommended when hasLicense = true (for raffle contact).
   */
  lastName?: string;

  /**
   * 5-digit ZIP code.
   * Required when hasLicense = false.
   */
  zipCode?: string;

  // === CONTACT (goes to DMF + local storage) ===

  /**
   * Request text message confirmation from DMF.
   * When true, phone is required.
   */
  wantTextConfirmation: boolean;

  /**
   * Phone number in xxx-xxx-xxxx format.
   * Required when wantTextConfirmation = true.
   * Also used for raffle contact.
   */
  phone?: string;

  /**
   * Request email confirmation from DMF.
   * When true, email is required.
   */
  wantEmailConfirmation: boolean;

  /**
   * Email address.
   * Required when wantEmailConfirmation = true.
   * Also used for raffle contact.
   */
  email?: string;

  // === HARVEST DATA (goes to DMF + local storage) ===

  /**
   * Date fish were harvested.
   * Cannot be in the future.
   */
  harvestDate: Date;

  /**
   * Number of Red Drum harvested.
   */
  redDrumCount: number;

  /**
   * Number of Flounder harvested.
   */
  flounderCount: number;

  /**
   * Number of Spotted Seatrout harvested.
   */
  spottedSeatroutCount: number;

  /**
   * Number of Weakfish harvested.
   */
  weakfishCount: number;

  /**
   * Number of Striped Bass harvested.
   */
  stripedBassCount: number;

  /**
   * DMF area code (e.g., "34" for Pamlico Sound).
   * Use getAreaCodeFromLabel() to convert from display label.
   */
  areaCode: string;

  /**
   * Area display label for UI (e.g., "Pamlico Sound").
   * Used for display; areaCode is what gets submitted.
   */
  areaLabel?: string;

  /**
   * Whether hook and line was used as the fishing method.
   * When false, gearCode is required.
   */
  usedHookAndLine: boolean;

  /**
   * DMF gear code (e.g., "8" for Gig/Spear).
   * Required when usedHookAndLine = false.
   * Use getGearCodeFromLabel() to convert from display label.
   */
  gearCode?: string;

  /**
   * Gear display label for UI.
   * Used for display; gearCode is what gets submitted.
   */
  gearLabel?: string;

  // === OPTIONAL DMF FIELDS ===

  /**
   * Who is this report for?
   * - 'self': Reporting for myself only
   * - 'family': Reporting for myself and/or minor children under 18
   */
  reportingFor: 'self' | 'family';

  /**
   * Number of people being reported for (including self).
   * Required when reportingFor = 'family'.
   * Minimum value: 2
   */
  familyCount?: number;

  // === APP-ONLY FIELDS (do NOT send to DMF) ===

  /**
   * Internal user ID for local storage.
   * Used to link reports to user profile.
   */
  userId?: string;

  /**
   * Whether user wants to enter the raffle.
   * Requires email or phone for contact.
   */
  enterRaffle: boolean;

  /**
   * URI or base64 of catch photo.
   * Required for raffle entry verification.
   */
  catchPhoto?: string;

  /**
   * Personal notes about the trip.
   * Private - not shared.
   */
  notes?: string;

  /**
   * GPS coordinates where fish were caught.
   * Private - not sent to DMF.
   */
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };

  /**
   * Individual fish entries from the form.
   * Used to preserve per-fish details (length, tag) for local history.
   * The counts above are aggregated from these for DMF submission.
   */
  fishEntries?: FishEntry[];
}

/**
 * Individual fish entry from the form.
 * Preserves per-fish details that DMF doesn't track.
 */
export interface FishEntry {
  /** Species display name */
  species: string;
  /** Number of this species */
  count: number;
  /** Length of each fish in inches */
  lengths?: string[];
  /** Tag number if fish was tagged */
  tagNumber?: string;
}

// ============================================
// DMF SUBMISSION TYPES
// ============================================

/**
 * Result from submitting to DMF ArcGIS API.
 */
export interface DMFSubmissionResult {
  /** Whether the submission was accepted by DMF */
  success: boolean;

  /**
   * Confirmation number (Unique1 field).
   * Format: day of month + random 4-digit number (e.g., "209421").
   * Present on success or when queued for later retry.
   */
  confirmationNumber?: string;

  /**
   * Object ID assigned by ArcGIS.
   * Only present on successful submission.
   */
  objectId?: number;

  /**
   * Error message if submission failed.
   */
  error?: string;

  /**
   * Whether the report was queued for later submission.
   * True when submission failed due to network issues.
   */
  queued?: boolean;
}

/**
 * Result from the complete submission flow (DMF + local storage).
 */
export interface FullSubmissionResult {
  /** Whether DMF submission succeeded */
  dmfSuccess: boolean;

  /** Whether local storage save succeeded */
  localSuccess: boolean;

  /**
   * Confirmation number from DMF.
   * Present even if DMF submission failed but was queued.
   */
  confirmationNumber?: string;

  /** Error message from DMF submission */
  dmfError?: string;

  /** Error message from local storage */
  localError?: string;

  /** Whether the submission was queued for later */
  queued?: boolean;

  /** Whether user was entered into raffle */
  raffleEntered?: boolean;
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Single validation error.
 */
export interface ValidationError {
  /** Field name that has the error */
  field: string;
  /** Human-readable error message */
  message: string;
}

/**
 * Result from validating harvest report input.
 */
export interface ValidationResult {
  /** Whether all validation passed */
  isValid: boolean;
  /** Array of validation errors (empty if isValid = true) */
  errors: ValidationError[];
}

// ============================================
// DMF PAYLOAD TYPES
// ============================================

/**
 * Complete DMF ArcGIS payload structure.
 * All fields exactly as expected by the DMF API.
 */
export interface DMFPayload {
  attributes: DMFAttributes;
  geometry: DMFGeometry;
}

/**
 * DMF attribute fields.
 * Field names must match exactly what DMF expects.
 */
export interface DMFAttributes {
  // Identity
  Licenque: 'Yes' | 'No';
  License: string | null;
  FirstN: string | null;
  LastN: string | null;
  Zip: string | null;

  // Reporting scope
  Fam: 'Myself Only' | 'Myself and/or minor children under the age of 18';
  FamNum: string | null;

  // Contact / Confirmation preferences
  TextCon: 'Yes' | 'No';
  Phone: string | null;
  EmailCon: 'Yes' | 'No';
  Email: string | null;

  // Harvest date
  DateH: number; // Unix milliseconds

  // System timestamps
  SysDate: number; // Unix milliseconds
  DateS: string; // Day of month as string

  // Species counts (as strings)
  NumRD: string;
  NumF: string;
  NumSS: string;
  NumW: string;
  NumSB: string;

  // Species flags (always null - legacy fields)
  RedDr: null;
  Flound: null;
  SST: null;
  Weakf: null;
  Striped: null;

  // Confirmation number
  Rand: string;
  Unique1: string;

  // Fixed values
  Harvest: 'Recreational';
  SubmitBy: null;

  // Location & gear
  Area: string;
  Hook: 'Yes' | 'No';
  Gear: string | null;

  // Global ID
  GlobalID: string;
}

/**
 * DMF geometry (always 0,0,0 for harvest reports).
 */
export interface DMFGeometry {
  spatialReference: { wkid: number };
  x: number;
  y: number;
  z: number;
}

// ============================================
// QUEUED REPORT TYPES
// ============================================

/**
 * Report that has been queued for later submission.
 * Stored in AsyncStorage when offline.
 *
 * Note: harvestDate is stored as ISO string for JSON serialization,
 * not as Date object like in HarvestReportInput.
 */
export interface QueuedReport extends Omit<HarvestReportInput, 'harvestDate'> {
  /** Harvest date as ISO string (for JSON serialization) */
  harvestDate: string;

  /** When the report was queued */
  queuedAt: string; // ISO date string

  /** Local confirmation number (generated client-side) */
  localConfirmationNumber: string;

  /** Number of retry attempts */
  retryCount: number;

  /** Last error message if retry failed */
  lastError?: string;
}

/**
 * Report that has been successfully submitted.
 * Stored in local history.
 *
 * Note: harvestDate is stored as ISO string for JSON serialization,
 * not as Date object like in HarvestReportInput.
 */
export interface SubmittedReport extends Omit<HarvestReportInput, 'harvestDate'> {
  /** Harvest date as ISO string (for JSON serialization) */
  harvestDate: string;

  /** DMF confirmation number */
  confirmationNumber: string;

  /** DMF object ID */
  objectId?: number;

  /** When the report was submitted */
  submittedAt: string; // ISO date string

  /** Whether user entered raffle with this report */
  raffleEntered?: boolean;

  /** Raffle ID if entered */
  raffleId?: string;
}

// ============================================
// HELPER TYPE CONVERSIONS
// ============================================

/**
 * Convert HarvestReportInput species counts to SpeciesCounts.
 */
export function inputToSpeciesCounts(input: HarvestReportInput): SpeciesCounts {
  return {
    redDrum: input.redDrumCount || 0,
    flounder: input.flounderCount || 0,
    spottedSeatrout: input.spottedSeatroutCount || 0,
    weakfish: input.weakfishCount || 0,
    stripedBass: input.stripedBassCount || 0,
  };
}

/**
 * Get total fish count from HarvestReportInput.
 */
export function getTotalFishFromInput(input: HarvestReportInput): number {
  return (
    (input.redDrumCount || 0) +
    (input.flounderCount || 0) +
    (input.spottedSeatroutCount || 0) +
    (input.weakfishCount || 0) +
    (input.stripedBassCount || 0)
  );
}

/**
 * Create a default/empty HarvestReportInput.
 */
export function createEmptyHarvestReportInput(): HarvestReportInput {
  return {
    hasLicense: true,
    wantTextConfirmation: false,
    wantEmailConfirmation: false,
    harvestDate: new Date(),
    redDrumCount: 0,
    flounderCount: 0,
    spottedSeatroutCount: 0,
    weakfishCount: 0,
    stripedBassCount: 0,
    areaCode: '',
    usedHookAndLine: true,
    reportingFor: 'self',
    enterRaffle: false,
  };
}
