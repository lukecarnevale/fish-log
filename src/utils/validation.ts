// utils/validation.ts
//
// Comprehensive validation for NC DMF Harvest Reports.
// Validates all DMF-required fields with conditional logic based on license status.
//

import {
  HarvestReportInput,
  ValidationError,
  ValidationResult,
  getTotalFishFromInput,
} from '../types/harvestReport';

// ============================================
// REGEX PATTERNS
// ============================================

/**
 * Phone number pattern: xxx-xxx-xxxx
 * DMF requires this exact format for text confirmations.
 */
const PHONE_REGEX = /^\d{3}-\d{3}-\d{4}$/;

/**
 * Email validation pattern.
 * Standard email format validation.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ZIP code pattern: exactly 5 digits.
 * Required for unlicensed anglers.
 */
const ZIP_REGEX = /^\d{5}$/;

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate a harvest report input before submission.
 *
 * Performs comprehensive validation of all DMF-required fields
 * with conditional logic based on license status and other flags.
 *
 * Validation Rules:
 * - Always required: harvestDate, at least one species > 0, areaCode, usedHookAndLine
 * - hasLicense = true: wrcId required
 * - hasLicense = false: firstName, lastName, zipCode required
 * - usedHookAndLine = false: gearCode required
 * - wantTextConfirmation = true: phone required (xxx-xxx-xxxx format)
 * - wantEmailConfirmation = true: email required (valid format)
 * - enterRaffle = true: email OR phone required
 *
 * @param input - The harvest report input to validate
 * @returns Validation result with isValid flag and array of errors
 */
export function validateHarvestReport(input: HarvestReportInput): ValidationResult {
  const errors: ValidationError[] = [];

  // ==========================================
  // DMF REQUIRED FIELDS (Always Required)
  // ==========================================

  // License status must be defined
  if (input.hasLicense === undefined || input.hasLicense === null) {
    errors.push({
      field: 'hasLicense',
      message: 'Please indicate if you have a NC fishing license',
    });
  }

  // Harvest date is always required
  if (!input.harvestDate) {
    errors.push({
      field: 'harvestDate',
      message: 'Harvest date is required',
    });
  } else {
    // Date cannot be in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (input.harvestDate > today) {
      errors.push({
        field: 'harvestDate',
        message: 'Harvest date cannot be in the future',
      });
    }
  }

  // At least one species must have count > 0
  const totalFish = getTotalFishFromInput(input);
  if (totalFish === 0) {
    errors.push({
      field: 'species',
      message: 'You must report at least one fish',
    });
  }

  // Area code is always required
  if (!input.areaCode || input.areaCode.trim() === '') {
    errors.push({
      field: 'areaCode',
      message: 'Area of harvest is required',
    });
  }

  // Hook & Line status must be defined
  if (input.usedHookAndLine === undefined || input.usedHookAndLine === null) {
    errors.push({
      field: 'usedHookAndLine',
      message: 'Please indicate if you used hook and line',
    });
  }

  // ==========================================
  // CONDITIONALLY REQUIRED: License Status
  // ==========================================

  if (input.hasLicense === true) {
    // Licensed anglers must provide WRC ID
    if (!input.wrcId || input.wrcId.trim() === '') {
      errors.push({
        field: 'wrcId',
        message: 'WRC ID or Customer ID is required for licensed anglers',
      });
    }
  }

  if (input.hasLicense === false) {
    // Unlicensed anglers must provide name and ZIP
    if (!input.firstName || input.firstName.trim() === '') {
      errors.push({
        field: 'firstName',
        message: 'First name is required',
      });
    }

    if (!input.lastName || input.lastName.trim() === '') {
      errors.push({
        field: 'lastName',
        message: 'Last name is required',
      });
    }

    if (!input.zipCode || input.zipCode.trim() === '') {
      errors.push({
        field: 'zipCode',
        message: 'ZIP code is required',
      });
    } else if (!ZIP_REGEX.test(input.zipCode.trim())) {
      errors.push({
        field: 'zipCode',
        message: 'ZIP code must be exactly 5 digits',
      });
    }
  }

  // ==========================================
  // CONDITIONALLY REQUIRED: Gear Type
  // ==========================================

  if (input.usedHookAndLine === false) {
    if (!input.gearCode || input.gearCode.trim() === '') {
      errors.push({
        field: 'gearCode',
        message: 'Please select the gear type used',
      });
    }
  }

  // ==========================================
  // CONDITIONALLY REQUIRED: Contact Info
  // ==========================================

  // Text confirmation requires valid phone
  if (input.wantTextConfirmation) {
    if (!input.phone || input.phone.trim() === '') {
      errors.push({
        field: 'phone',
        message: 'Phone number is required for text confirmation',
      });
    } else if (!PHONE_REGEX.test(input.phone.trim())) {
      errors.push({
        field: 'phone',
        message: 'Phone must be in xxx-xxx-xxxx format',
      });
    }
  }

  // Email confirmation requires valid email
  if (input.wantEmailConfirmation) {
    if (!input.email || input.email.trim() === '') {
      errors.push({
        field: 'email',
        message: 'Email address is required for email confirmation',
      });
    } else if (!EMAIL_REGEX.test(input.email.trim())) {
      errors.push({
        field: 'email',
        message: 'Please enter a valid email address',
      });
    }
  }

  // ==========================================
  // APP-SPECIFIC: Raffle Entry
  // ==========================================

  if (input.enterRaffle) {
    // Raffle requires at least one contact method
    const hasValidPhone = input.phone && PHONE_REGEX.test(input.phone.trim());
    const hasValidEmail = input.email && EMAIL_REGEX.test(input.email.trim());

    if (!hasValidPhone && !hasValidEmail) {
      errors.push({
        field: 'contact',
        message: 'Email or phone number is required for raffle entry',
      });
    }
  }

  // ==========================================
  // OPTIONAL: Family Reporting
  // ==========================================

  if (input.reportingFor === 'family') {
    if (!input.familyCount || input.familyCount < 2) {
      errors.push({
        field: 'familyCount',
        message: 'Family count must be at least 2 when reporting for family',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================
// INDIVIDUAL FIELD VALIDATORS
// ============================================

/**
 * Validate phone number format.
 *
 * @param phone - Phone number to validate
 * @returns True if valid or empty, false if invalid format
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone || phone.trim() === '') return true; // Empty is valid (not required by default)
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Validate email format.
 *
 * @param email - Email address to validate
 * @returns True if valid or empty, false if invalid format
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || email.trim() === '') return true; // Empty is valid (not required by default)
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate ZIP code format (5 digits).
 *
 * @param zipCode - ZIP code to validate
 * @returns True if valid or empty, false if invalid format
 */
export function isValidZipCode(zipCode: string | null | undefined): boolean {
  if (!zipCode || zipCode.trim() === '') return true; // Empty is valid (not required by default)
  return ZIP_REGEX.test(zipCode.trim());
}

/**
 * Validate harvest date (not in future).
 *
 * @param date - Date to validate
 * @returns True if valid (not in future), false otherwise
 */
export function isValidHarvestDate(date: Date | null | undefined): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

/**
 * Check if input has at least one fish reported.
 *
 * @param input - Harvest report input
 * @returns True if at least one species count > 0
 */
export function hasAtLeastOneFish(input: HarvestReportInput): boolean {
  return getTotalFishFromInput(input) > 0;
}

// ============================================
// FORMAT HELPERS
// ============================================

/**
 * Format a phone number to xxx-xxx-xxxx format.
 * Strips non-digits and formats if 10 digits provided.
 *
 * @param phone - Raw phone input
 * @returns Formatted phone or original if can't format
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';

  // Strip all non-digits
  const digits = phone.replace(/\D/g, '');

  // Format if exactly 10 digits
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Return original if can't format
  return phone;
}

/**
 * Format a ZIP code to 5 digits.
 * Strips non-digits and truncates to first 5 digits.
 * Does NOT pad short ZIP codes - returns as-is for validation to catch.
 *
 * @param zipCode - Raw ZIP input
 * @returns Digits only (up to 5), empty string if null/undefined
 */
export function formatZipCode(zipCode: string | null | undefined): string {
  if (!zipCode) return '';

  // Strip all non-digits
  const digits = zipCode.replace(/\D/g, '');

  // Take first 5 digits (don't pad - let validation catch short ZIPs)
  return digits.slice(0, 5);
}

// ============================================
// ERROR MESSAGE HELPERS
// ============================================

/**
 * Get validation errors for a specific field.
 *
 * @param errors - Array of validation errors
 * @param field - Field name to filter by
 * @returns Array of error messages for the field
 */
export function getFieldErrors(errors: ValidationError[], field: string): string[] {
  return errors.filter(e => e.field === field).map(e => e.message);
}

/**
 * Get the first validation error for a specific field.
 *
 * @param errors - Array of validation errors
 * @param field - Field name to filter by
 * @returns First error message or undefined
 */
export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  return errors.find(e => e.field === field)?.message;
}

/**
 * Check if a specific field has validation errors.
 *
 * @param errors - Array of validation errors
 * @param field - Field name to check
 * @returns True if field has errors
 */
export function hasFieldError(errors: ValidationError[], field: string): boolean {
  return errors.some(e => e.field === field);
}

// ============================================
// EXPORTS
// ============================================

export default {
  validateHarvestReport,
  isValidPhone,
  isValidEmail,
  isValidZipCode,
  isValidHarvestDate,
  hasAtLeastOneFish,
  formatPhoneNumber,
  formatZipCode,
  getFieldErrors,
  getFieldError,
  hasFieldError,
};
