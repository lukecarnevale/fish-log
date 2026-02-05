// utils/index.ts
//
// Barrel export for all utility functions.
//

// Validation utilities
export {
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
} from './validation';

// Date utilities
export {
  formatRelativeTime,
  formatMemberSince,
  getCurrentQuarter,
  getCurrentYear,
  getQuarterStartDate,
  getQuarterEndDate,
  formatQuarterDisplay,
} from './dateUtils';

// Device ID utilities
export {
  generateUUID,
  getDeviceId,
} from './deviceId';

// Badge utilities
export {
  BADGE_STORAGE_KEYS,
  markNewReportSubmitted,
  clearNewReportIndicator,
  clearNewCatchesIndicator,
  hasNewReportSinceLastView,
} from './badgeUtils';

// Debounce utility
export { debounce } from './debounce';
