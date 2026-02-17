// services/harvestReportService.ts
//
// NC DMF Harvest Report submission service.
// Handles payload transformation, DMF submission, and mock mode for testing.
//

import { isTestMode, getDMFEndpoint } from '../config/appConfig';
import {
  HarvestReportInput,
  DMFSubmissionResult,
  DMFPayload,
  DMFAttributes,
  DMFGeometry,
} from '../types/harvestReport';
import { supabase } from '../config/supabase';

// ============================================
// GUID GENERATION
// ============================================

/**
 * Generate a GUID in the format DMF expects.
 * Format: {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}
 *
 * @returns A GUID string with curly braces
 */
export function generateGlobalId(): string {
  const hex = (): string => Math.floor(Math.random() * 16).toString(16).toUpperCase();
  const segment = (len: number): string => Array(len).fill(0).map(hex).join('');
  return `{${segment(8)}-${segment(4)}-${segment(4)}-${segment(4)}-${segment(12)}}`;
}

// ============================================
// CONFIRMATION NUMBER GENERATION
// ============================================

/**
 * Confirmation number components.
 */
export interface ConfirmationNumberParts {
  /** Day of month as string (e.g., "21" for the 21st) */
  dateS: string;
  /** Random 4-digit number as string */
  rand: string;
  /** Combined confirmation number (dateS + rand) */
  unique1: string;
}

/**
 * Generate a confirmation number for DMF submission.
 *
 * Format: Day of month + random 4-digit number
 * Example: If today is the 21st and random is 5432, result is "215432"
 *
 * @returns Object containing dateS, rand, and unique1 (the confirmation number)
 */
export function generateConfirmationNumber(): ConfirmationNumberParts {
  const dateS = new Date().getDate().toString();
  // Generate random number between 0 and 9999, padded would be more consistent
  // but spec shows unpadded, so we follow that
  const rand = Math.round(Math.random() * 10000).toString();
  return { dateS, rand, unique1: dateS + rand };
}

// ============================================
// PAYLOAD TRANSFORMATION
// ============================================

/**
 * Transform user input into DMF ArcGIS payload format.
 *
 * IMPORTANT: This strips out app-only fields (raffle, photos, GPS, etc.)
 * Only DMF-required and DMF-optional fields are included.
 *
 * @param input - User input from the harvest report form
 * @returns DMF payload ready for submission
 */
export function transformToDMFPayload(input: HarvestReportInput): DMFPayload {
  const now = new Date();
  const { dateS, rand, unique1 } = generateConfirmationNumber();
  const globalId = generateGlobalId();

  const attributes: DMFAttributes = {
    // Identity
    Licenque: input.hasLicense ? 'Yes' : 'No',
    License: input.hasLicense ? (input.wrcId || null) : null,
    FirstN: input.firstName || null,
    LastN: input.lastName || null,
    Zip: input.zipCode || null,

    // Reporting scope
    Fam: input.reportingFor === 'family'
      ? 'Myself and/or minor children under the age of 18'
      : 'Myself Only',
    FamNum: input.reportingFor === 'family'
      ? (input.familyCount?.toString() || null)
      : null,

    // Contact / Confirmation preferences
    TextCon: input.wantTextConfirmation ? 'Yes' : 'No',
    Phone: input.wantTextConfirmation ? (input.phone || null) : null,
    EmailCon: input.wantEmailConfirmation ? 'Yes' : 'No',
    Email: input.wantEmailConfirmation ? (input.email || null) : null,

    // Harvest date (Unix milliseconds)
    DateH: input.harvestDate.getTime(),

    // System timestamps
    SysDate: now.getTime(),
    DateS: dateS,

    // Species counts (as strings)
    NumRD: input.redDrumCount.toString(),
    NumF: input.flounderCount.toString(),
    NumSS: input.spottedSeatroutCount.toString(),
    NumW: input.weakfishCount.toString(),
    NumSB: input.stripedBassCount.toString(),

    // Species flags (always null - legacy fields)
    RedDr: null,
    Flound: null,
    SST: null,
    Weakf: null,
    Striped: null,

    // Confirmation number
    Rand: rand,
    Unique1: unique1,

    // Fixed values
    Harvest: 'Recreational',
    SubmitBy: null,

    // Location & gear
    Area: input.areaCode,
    Hook: input.usedHookAndLine ? 'Yes' : 'No',
    Gear: input.usedHookAndLine ? null : (input.gearCode || null),

    // Global ID
    GlobalID: globalId,
  };

  const geometry: DMFGeometry = {
    spatialReference: { wkid: 4326 },
    x: 0,
    y: 0,
    z: 0,
  };

  return { attributes, geometry };
}

// ============================================
// DMF CONFIRMATION WEBHOOK
// ============================================

/**
 * Trigger DMF confirmation webhooks (text/email) via Supabase Edge Function.
 *
 * The Survey123 web client calls Azure Logic App webhooks after a successful
 * applyEdits to send text/email confirmations. This function replicates that
 * behavior by routing through a Supabase Edge Function that securely stores
 * the webhook URLs.
 *
 * IMPORTANT: This is fire-and-forget. Webhook failures are logged but never
 * block the submission flow. The user always gets their confirmation number
 * regardless of whether the webhook succeeds.
 *
 * @param objectId - ArcGIS object ID from applyEdits response
 * @param globalId - GlobalID from DMF attributes
 * @param dmfAttributes - Complete DMF attributes from transformToDMFPayload()
 * @param geometry - Geometry object sent to applyEdits
 * @param skipWebhooks - true in mock mode to skip actual webhook calls
 */
export async function triggerDMFConfirmationWebhook(
  objectId: number,
  globalId: string,
  dmfAttributes: DMFAttributes,
  geometry: DMFGeometry,
  skipWebhooks: boolean = false,
): Promise<void> {
  try {
    console.log('📡 Triggering DMF confirmation webhook...');
    const { data, error } = await supabase.functions.invoke('trigger-dmf-webhook', {
      body: {
        objectId,
        globalId,
        dmfAttributes,
        geometry,
        skipWebhooks,
      },
    });

    if (error) {
      console.warn('⚠️ DMF webhook trigger returned error:', error.message);
    } else {
      console.log('✅ DMF webhook trigger response:', data?.message ?? 'ok');
    }
  } catch (err) {
    // Non-blocking: log and continue
    console.warn(
      '⚠️ Failed to trigger DMF confirmation webhook (non-blocking):',
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ============================================
// DMF SUBMISSION (Production)
// ============================================

/**
 * Submit harvest report to NC DMF ArcGIS API.
 *
 * This is the PRODUCTION submission function that actually sends data to DMF.
 * Use `submitHarvestReport()` instead, which handles mock mode automatically.
 *
 * @param input - User input from the harvest report form
 * @returns Submission result with confirmation number on success
 */
export async function submitToDMF(input: HarvestReportInput): Promise<DMFSubmissionResult> {
  const feature = transformToDMFPayload(input);
  const confirmationNumber = feature.attributes.Unique1;

  // Build the edits payload for ArcGIS applyEdits endpoint
  const edits = JSON.stringify([{
    id: 0,
    adds: [feature],
  }]);

  // Build form data (application/x-www-form-urlencoded)
  const formData = new URLSearchParams();
  formData.append('f', 'json');
  formData.append('edits', edits);
  formData.append('useGlobalIds', 'true');
  formData.append('rollbackOnFailure', 'true');

  try {
    const response = await fetch(getDMFEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // ArcGIS returns an array with addResults
    if (result[0]?.addResults?.[0]?.success) {
      const objectId = result[0].addResults[0].objectId;

      // Trigger text/email confirmation webhooks (fire-and-forget)
      triggerDMFConfirmationWebhook(
        objectId,
        feature.attributes.GlobalID,
        feature.attributes,
        feature.geometry,
        false,
      );

      return {
        success: true,
        confirmationNumber,
        objectId,
      };
    } else {
      // Extract error message from ArcGIS response
      const error = result[0]?.addResults?.[0]?.error?.description || 'Unknown DMF error';
      return { success: false, error };
    }
  } catch (error) {
    // Network error or other failure - queue for later
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      queued: true,
      confirmationNumber, // Still provide confirmation number for offline display
    };
  }
}

// ============================================
// MOCK SUBMISSION (Test Mode)
// ============================================

/**
 * Options for mock submission behavior.
 */
export interface MockSubmitOptions {
  /** Simulate network delay in milliseconds (default: 1500) */
  delayMs?: number;
  /** Force a failure for testing error handling */
  simulateFailure?: boolean;
  /** Custom error message when simulating failure */
  failureMessage?: string;
}

/**
 * Mock submission for testing without hitting DMF servers.
 *
 * Logs the full payload to console and returns a fake success response.
 * Use this in development to verify payload structure.
 *
 * @param input - User input from the harvest report form
 * @param options - Optional mock behavior configuration
 * @returns Simulated submission result
 */
export async function mockSubmitToDMF(
  input: HarvestReportInput,
  options: MockSubmitOptions = {}
): Promise<DMFSubmissionResult> {
  const { delayMs = 1500, simulateFailure = false, failureMessage } = options;

  const feature = transformToDMFPayload(input);
  const confirmationNumber = feature.attributes.Unique1;

  // Log the full payload for debugging
  console.log('='.repeat(60));
  console.log('🧪 MOCK DMF SUBMISSION (Test Mode)');
  console.log('='.repeat(60));
  console.log('Confirmation Number:', confirmationNumber);
  console.log('Global ID:', feature.attributes.GlobalID);
  console.log('-'.repeat(60));
  console.log('Full Payload:');
  console.log(JSON.stringify(feature, null, 2));
  console.log('-'.repeat(60));

  // Log the form data that would be sent
  const edits = JSON.stringify([{ id: 0, adds: [feature] }]);
  console.log('Form Data (edits):');
  console.log(edits);
  console.log('='.repeat(60));

  // Simulate network delay
  await new Promise<void>(resolve => setTimeout(() => resolve(), delayMs));

  // Optionally simulate failure
  if (simulateFailure) {
    console.log('⚠️ SIMULATED FAILURE');
    return {
      success: false,
      error: failureMessage || 'Simulated failure for testing',
      queued: true,
      confirmationNumber,
    };
  }

  // Generate a fake object ID (like ArcGIS would return)
  const fakeObjectId = Math.floor(Math.random() * 1000000) + 100000;

  console.log('✅ MOCK SUCCESS - Object ID:', fakeObjectId);

  // Trigger webhook in mock mode (skipWebhooks=true so edge function logs but doesn't call Azure)
  triggerDMFConfirmationWebhook(
    fakeObjectId,
    feature.attributes.GlobalID,
    feature.attributes,
    feature.geometry,
    true,
  );

  return {
    success: true,
    confirmationNumber,
    objectId: fakeObjectId,
  };
}

// ============================================
// MAIN SUBMISSION FUNCTION
// ============================================

/**
 * Submit harvest report - automatically uses mock or production based on app mode.
 *
 * This is the main function to call from the UI. It checks `APP_CONFIG.mode`
 * and routes to either mock or production submission.
 *
 * @param input - User input from the harvest report form
 * @param mockOptions - Options for mock mode (ignored in production)
 * @returns Submission result with confirmation number
 */
export async function submitHarvestReport(
  input: HarvestReportInput,
  mockOptions?: MockSubmitOptions
): Promise<DMFSubmissionResult> {
  if (isTestMode()) {
    return mockSubmitToDMF(input, mockOptions);
  }
  return submitToDMF(input);
}

// ============================================
// PAYLOAD INSPECTION UTILITIES
// ============================================

/**
 * Get a preview of the DMF payload without submitting.
 *
 * Useful for debugging or showing users what will be submitted.
 *
 * @param input - User input from the harvest report form
 * @returns The DMF payload that would be submitted
 */
export function previewDMFPayload(input: HarvestReportInput): DMFPayload {
  return transformToDMFPayload(input);
}

/**
 * Validate that required DMF fields are present in the input.
 *
 * Note: This is a quick check, not full validation. Use the validation
 * utility from Block 4 for comprehensive validation.
 *
 * @param input - User input to check
 * @returns Object with isValid flag and missing fields array
 */
export function checkRequiredDMFFields(input: HarvestReportInput): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  // Always required
  if (input.hasLicense === undefined || input.hasLicense === null) {
    missingFields.push('hasLicense');
  }
  if (!input.harvestDate) {
    missingFields.push('harvestDate');
  }
  if (!input.areaCode) {
    missingFields.push('areaCode');
  }
  if (input.usedHookAndLine === undefined || input.usedHookAndLine === null) {
    missingFields.push('usedHookAndLine');
  }

  // Conditionally required
  if (input.hasLicense === true && !input.wrcId) {
    missingFields.push('wrcId');
  }
  if (input.hasLicense === false) {
    if (!input.firstName) missingFields.push('firstName');
    if (!input.lastName) missingFields.push('lastName');
    if (!input.zipCode) missingFields.push('zipCode');
  }
  if (input.usedHookAndLine === false && !input.gearCode) {
    missingFields.push('gearCode');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  generateGlobalId,
  generateConfirmationNumber,
  transformToDMFPayload,
  triggerDMFConfirmationWebhook,
  submitToDMF,
  mockSubmitToDMF,
  submitHarvestReport,
  previewDMFPayload,
  checkRequiredDMFFields,
};
