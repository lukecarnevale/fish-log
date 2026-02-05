import * as yup from 'yup';
import { isValidPhoneNumber } from 'libphonenumber-js';

// Create validation schema with Yup
// Validation is conditional based on hasLicense status
export const profileSchema = yup.object().shape({
  hasLicense: yup.boolean(),
  // WRC ID required when hasLicense = true
  wrcId: yup.string().when('hasLicense', {
    is: true,
    then: (schema) => schema.required('WRC ID or Customer ID is required'),
    otherwise: (schema) => schema,
  }),
  // Name required when hasLicense = false
  firstName: yup.string().when('hasLicense', {
    is: false,
    then: (schema) => schema.required('First name is required'),
    otherwise: (schema) => schema,
  }),
  lastName: yup.string().when('hasLicense', {
    is: false,
    then: (schema) => schema.required('Last name is required'),
    otherwise: (schema) => schema,
  }),
  // ZIP code is optional but must be 5 digits if provided
  zipCode: yup.string().test('is-valid-zip', 'ZIP code must be exactly 5 digits', function(value) {
    if (!value) return true; // Optional field
    return /^\d{5}$/.test(value);
  }),
  dateOfBirth: yup.string(),
  email: yup.string().email('Please enter a valid email'),
  phone: yup.string().test('is-valid-phone', 'Please enter a valid phone number', function(value) {
    if (!value) return true; // Optional field
    try {
      return isValidPhoneNumber(value, 'US');
    } catch (e) {
      return false;
    }
  }),
  profileImage: yup.string(),
});
