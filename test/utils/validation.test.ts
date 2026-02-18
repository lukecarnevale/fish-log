import {
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
} from '../../src/utils/validation';
import { makeHarvestInput } from '../factories';

describe('validateHarvestReport', () => {
  it('accepts a complete valid report (licensed, hook-and-line, self)', () => {
    const input = makeHarvestInput();
    const result = validateHarvestReport(input);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a valid unlicensed report', () => {
    const input = makeHarvestInput({
      hasLicense: false,
      wrcId: undefined,
      firstName: 'Jane',
      lastName: 'Doe',
      zipCode: '27601',
    });
    const result = validateHarvestReport(input);
    expect(result.isValid).toBe(true);
  });

  it('accepts report with other gear type', () => {
    const input = makeHarvestInput({
      usedHookAndLine: false,
      gearCode: 'NET',
    });
    const result = validateHarvestReport(input);
    expect(result.isValid).toBe(true);
  });

  // --- hasLicense field ---
  it('rejects when hasLicense is undefined', () => {
    const input = makeHarvestInput();
    (input as any).hasLicense = undefined;
    const result = validateHarvestReport(input);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'hasLicense' })
    );
  });

  it('rejects when hasLicense is null', () => {
    const input = makeHarvestInput();
    (input as any).hasLicense = null;
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'hasLicense')).toBe(true);
  });

  // --- harvestDate ---
  it('rejects when harvestDate is missing', () => {
    const input = makeHarvestInput();
    (input as any).harvestDate = null;
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'harvestDate')).toBe(true);
  });

  it('rejects future harvest date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const input = makeHarvestInput({ harvestDate: futureDate });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'harvestDate')).toBe(true);
    expect(getFieldError(result.errors, 'harvestDate')).toContain('future');
  });

  it('accepts today as harvest date', () => {
    const input = makeHarvestInput({ harvestDate: new Date() });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'harvestDate')).toBe(false);
  });

  // --- species counts ---
  it('rejects report with no species (all counts 0)', () => {
    const input = makeHarvestInput({
      redDrumCount: 0,
      flounderCount: 0,
      spottedSeatroutCount: 0,
      weakfishCount: 0,
      stripedBassCount: 0,
    });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'species')).toBe(true);
  });

  it('accepts report with single species > 0', () => {
    const input = makeHarvestInput({ redDrumCount: 0, flounderCount: 3 });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'species')).toBe(false);
  });

  // --- areaCode ---
  it('rejects empty areaCode', () => {
    const input = makeHarvestInput({ areaCode: '' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'areaCode')).toBe(true);
  });

  it('rejects whitespace-only areaCode', () => {
    const input = makeHarvestInput({ areaCode: '   ' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'areaCode')).toBe(true);
  });

  // --- usedHookAndLine ---
  it('rejects when usedHookAndLine is undefined', () => {
    const input = makeHarvestInput();
    (input as any).usedHookAndLine = undefined;
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'usedHookAndLine')).toBe(true);
  });

  // --- Licensed angler: wrcId ---
  it('rejects licensed angler without wrcId', () => {
    const input = makeHarvestInput({ hasLicense: true, wrcId: undefined });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'wrcId')).toBe(true);
  });

  it('rejects licensed angler with empty wrcId', () => {
    const input = makeHarvestInput({ hasLicense: true, wrcId: '  ' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'wrcId')).toBe(true);
  });

  // --- Unlicensed angler: name/zip ---
  it('rejects unlicensed angler without firstName', () => {
    const input = makeHarvestInput({ hasLicense: false, firstName: '', lastName: 'Doe', zipCode: '27601' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'firstName')).toBe(true);
  });

  it('rejects unlicensed angler without lastName', () => {
    const input = makeHarvestInput({ hasLicense: false, firstName: 'Jane', lastName: '', zipCode: '27601' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'lastName')).toBe(true);
  });

  it('rejects unlicensed angler with invalid zipCode format', () => {
    const input = makeHarvestInput({ hasLicense: false, firstName: 'Jane', lastName: 'Doe', zipCode: '123' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'zipCode')).toBe(true);
    expect(getFieldError(result.errors, 'zipCode')).toContain('5 digits');
  });

  it('rejects unlicensed angler with missing zipCode', () => {
    const input = makeHarvestInput({ hasLicense: false, firstName: 'Jane', lastName: 'Doe', zipCode: undefined });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'zipCode')).toBe(true);
  });

  // --- Gear type ---
  it('rejects non-hook-and-line without gearCode', () => {
    const input = makeHarvestInput({ usedHookAndLine: false, gearCode: undefined });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'gearCode')).toBe(true);
  });

  it('accepts non-hook-and-line with gearCode', () => {
    const input = makeHarvestInput({ usedHookAndLine: false, gearCode: 'NET' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'gearCode')).toBe(false);
  });

  // --- Text confirmation ---
  it('rejects text confirmation without phone', () => {
    const input = makeHarvestInput({ wantTextConfirmation: true, phone: undefined });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'phone')).toBe(true);
  });

  it('rejects text confirmation with invalid phone format', () => {
    const input = makeHarvestInput({ wantTextConfirmation: true, phone: '1234567' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'phone')).toBe(true);
    expect(getFieldError(result.errors, 'phone')).toContain('xxx-xxx-xxxx');
  });

  it('accepts text confirmation with valid phone', () => {
    const input = makeHarvestInput({ wantTextConfirmation: true, phone: '919-555-1234' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'phone')).toBe(false);
  });

  // --- Email confirmation ---
  it('rejects email confirmation without email', () => {
    const input = makeHarvestInput({ wantEmailConfirmation: true, email: undefined });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'email')).toBe(true);
  });

  it('rejects email confirmation with invalid email', () => {
    const input = makeHarvestInput({ wantEmailConfirmation: true, email: 'not-an-email' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'email')).toBe(true);
  });

  it('accepts email confirmation with valid email', () => {
    const input = makeHarvestInput({ wantEmailConfirmation: true, email: 'test@example.com' });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'email')).toBe(false);
  });

  // --- Raffle entry ---
  it('rejects raffle entry without contact method', () => {
    const input = makeHarvestInput({ enterRaffle: true, phone: undefined, email: undefined });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'contact')).toBe(true);
  });

  it('accepts raffle entry with valid phone only', () => {
    const input = makeHarvestInput({ enterRaffle: true, phone: '919-555-1234', email: undefined });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'contact')).toBe(false);
  });

  it('accepts raffle entry with valid email only', () => {
    const input = makeHarvestInput({ enterRaffle: true, email: 'test@example.com', phone: undefined });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'contact')).toBe(false);
  });

  // --- Family reporting ---
  it('rejects family report with familyCount < 2', () => {
    const input = makeHarvestInput({ reportingFor: 'family', familyCount: 1 });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'familyCount')).toBe(true);
  });

  it('rejects family report with no familyCount', () => {
    const input = makeHarvestInput({ reportingFor: 'family', familyCount: undefined });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'familyCount')).toBe(true);
  });

  it('accepts family report with familyCount >= 2', () => {
    const input = makeHarvestInput({ reportingFor: 'family', familyCount: 3 });
    const result = validateHarvestReport(input);
    expect(hasFieldError(result.errors, 'familyCount')).toBe(false);
  });

  // --- Multiple errors ---
  it('returns multiple errors for multiple invalid fields', () => {
    const input = makeHarvestInput({
      redDrumCount: 0,
      areaCode: '',
      hasLicense: true,
      wrcId: '',
    });
    const result = validateHarvestReport(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('isValidPhone', () => {
  it('returns true for valid phone xxx-xxx-xxxx', () => {
    expect(isValidPhone('919-555-1234')).toBe(true);
  });
  it('returns true for empty string', () => {
    expect(isValidPhone('')).toBe(true);
  });
  it('returns true for null', () => {
    expect(isValidPhone(null)).toBe(true);
  });
  it('returns true for undefined', () => {
    expect(isValidPhone(undefined)).toBe(true);
  });
  it('returns false for partial phone', () => {
    expect(isValidPhone('919-555')).toBe(false);
  });
  it('returns false for 10 digits without dashes', () => {
    expect(isValidPhone('9195551234')).toBe(false);
  });
  it('handles whitespace trimming', () => {
    expect(isValidPhone(' 919-555-1234 ')).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('returns true for valid email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });
  it('returns true for empty string', () => {
    expect(isValidEmail('')).toBe(true);
  });
  it('returns true for null', () => {
    expect(isValidEmail(null)).toBe(true);
  });
  it('returns false for missing @', () => {
    expect(isValidEmail('testexample.com')).toBe(false);
  });
  it('returns false for missing domain', () => {
    expect(isValidEmail('test@')).toBe(false);
  });
});

describe('isValidZipCode', () => {
  it('returns true for 5-digit zip', () => {
    expect(isValidZipCode('27601')).toBe(true);
  });
  it('returns true for empty string', () => {
    expect(isValidZipCode('')).toBe(true);
  });
  it('returns true for null', () => {
    expect(isValidZipCode(null)).toBe(true);
  });
  it('returns false for 4 digits', () => {
    expect(isValidZipCode('2760')).toBe(false);
  });
  it('returns false for 6 digits', () => {
    expect(isValidZipCode('276011')).toBe(false);
  });
  it('returns false for letters', () => {
    expect(isValidZipCode('abcde')).toBe(false);
  });
});

describe('isValidHarvestDate', () => {
  it('returns true for today', () => {
    expect(isValidHarvestDate(new Date())).toBe(true);
  });
  it('returns true for past date', () => {
    expect(isValidHarvestDate(new Date('2025-01-01'))).toBe(true);
  });
  it('returns false for future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    expect(isValidHarvestDate(future)).toBe(false);
  });
  it('returns false for null', () => {
    expect(isValidHarvestDate(null)).toBe(false);
  });
  it('returns false for undefined', () => {
    expect(isValidHarvestDate(undefined)).toBe(false);
  });
});

describe('hasAtLeastOneFish', () => {
  it('returns true when one species has count > 0', () => {
    expect(hasAtLeastOneFish(makeHarvestInput({ redDrumCount: 1 }))).toBe(true);
  });
  it('returns false when all counts are 0', () => {
    expect(hasAtLeastOneFish(makeHarvestInput({
      redDrumCount: 0, flounderCount: 0, spottedSeatroutCount: 0,
      weakfishCount: 0, stripedBassCount: 0,
    }))).toBe(false);
  });
});

describe('formatPhoneNumber', () => {
  it('formats 10 digits correctly', () => {
    expect(formatPhoneNumber('9195551234')).toBe('919-555-1234');
  });
  it('formats digits with existing characters', () => {
    expect(formatPhoneNumber('(919) 555-1234')).toBe('919-555-1234');
  });
  it('returns original if not 10 digits', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
  });
  it('returns empty string for null', () => {
    expect(formatPhoneNumber(null)).toBe('');
  });
  it('returns empty string for undefined', () => {
    expect(formatPhoneNumber(undefined)).toBe('');
  });
});

describe('formatZipCode', () => {
  it('strips non-digits', () => {
    expect(formatZipCode('27601-1234')).toBe('27601');
  });
  it('truncates to 5 digits', () => {
    expect(formatZipCode('276011234')).toBe('27601');
  });
  it('returns empty string for null', () => {
    expect(formatZipCode(null)).toBe('');
  });
  it('does not pad short zips', () => {
    expect(formatZipCode('276')).toBe('276');
  });
});

describe('getFieldErrors', () => {
  const errors = [
    { field: 'name', message: 'Name required' },
    { field: 'name', message: 'Name too short' },
    { field: 'email', message: 'Invalid email' },
  ];
  it('returns all errors for a field', () => {
    expect(getFieldErrors(errors, 'name')).toEqual(['Name required', 'Name too short']);
  });
  it('returns empty array for field with no errors', () => {
    expect(getFieldErrors(errors, 'phone')).toEqual([]);
  });
});

describe('getFieldError', () => {
  const errors = [
    { field: 'name', message: 'Name required' },
    { field: 'email', message: 'Invalid email' },
  ];
  it('returns first error message for a field', () => {
    expect(getFieldError(errors, 'name')).toBe('Name required');
  });
  it('returns undefined for field with no errors', () => {
    expect(getFieldError(errors, 'phone')).toBeUndefined();
  });
});

describe('hasFieldError', () => {
  const errors = [{ field: 'name', message: 'Required' }];
  it('returns true when field has errors', () => {
    expect(hasFieldError(errors, 'name')).toBe(true);
  });
  it('returns false when field has no errors', () => {
    expect(hasFieldError(errors, 'email')).toBe(false);
  });
});
