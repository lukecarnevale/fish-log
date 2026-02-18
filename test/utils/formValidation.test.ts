import { validateEmail, validatePhone, formatPhoneNumber } from '../../src/utils/formValidation';

describe('validateEmail', () => {
  it('returns undefined for empty string', () => {
    expect(validateEmail('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only', () => {
    expect(validateEmail('   ')).toBeUndefined();
  });

  it('returns undefined for valid email', () => {
    expect(validateEmail('user@example.com')).toBeUndefined();
  });

  it('returns undefined for email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toBeUndefined();
  });

  it('returns undefined for email with plus sign', () => {
    expect(validateEmail('user+tag@example.com')).toBeUndefined();
  });

  it('returns error for missing @', () => {
    expect(validateEmail('userexample.com')).toBeDefined();
  });

  it('returns error for missing TLD', () => {
    expect(validateEmail('user@example')).toBeDefined();
  });

  it('returns error for double dots', () => {
    expect(validateEmail('user@example..com')).toBeDefined();
  });

  // TLD typo detection
  it('detects .con typo', () => {
    const result = validateEmail('user@example.con');
    expect(result).toContain('typo');
  });

  it('detects .clm typo', () => {
    const result = validateEmail('user@example.clm');
    expect(result).toContain('typo');
  });

  it('detects .cpm typo', () => {
    const result = validateEmail('user@example.cpm');
    expect(result).toContain('typo');
  });

  // Provider TLD correction
  it('suggests correction for gmail.org', () => {
    const result = validateEmail('user@gmail.org');
    expect(result).toContain('gmail.com');
  });

  it('suggests correction for yahoo.org', () => {
    const result = validateEmail('user@yahoo.org');
    expect(result).toContain('yahoo.com');
  });

  it('accepts gmail.com without error', () => {
    expect(validateEmail('user@gmail.com')).toBeUndefined();
  });

  it('accepts yahoo.co.uk without error', () => {
    expect(validateEmail('user@yahoo.co.uk')).toBeUndefined();
  });

  it('accepts icloud.com without error', () => {
    expect(validateEmail('user@icloud.com')).toBeUndefined();
  });

  it('returns error for TLD > 6 characters', () => {
    expect(validateEmail('user@example.toolong')).toBeDefined();
  });
});

describe('validatePhone', () => {
  it('returns undefined for empty string', () => {
    expect(validatePhone('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only', () => {
    expect(validatePhone('   ')).toBeUndefined();
  });

  it('returns undefined for complete 10-digit phone', () => {
    expect(validatePhone('919-555-1234')).toBeUndefined();
  });

  it('returns undefined for 10 digits without formatting', () => {
    expect(validatePhone('9195551234')).toBeUndefined();
  });

  it('returns error for incomplete phone (less than 10 digits)', () => {
    const result = validatePhone('919-555');
    expect(result).toBeDefined();
    expect(result).toContain('10-digit');
  });

  it('returns error for single digit', () => {
    expect(validatePhone('9')).toBeDefined();
  });
});

describe('formatPhoneNumber', () => {
  it('returns digits only for 1-3 digits', () => {
    expect(formatPhoneNumber('919')).toBe('919');
  });

  it('formats 4-6 digits as xxx-xxx', () => {
    expect(formatPhoneNumber('919555')).toBe('919-555');
  });

  it('formats 7+ digits as xxx-xxx-xxxx', () => {
    expect(formatPhoneNumber('9195551234')).toBe('919-555-1234');
  });

  it('strips non-digit characters', () => {
    expect(formatPhoneNumber('(919) 555-1234')).toBe('919-555-1234');
  });

  it('truncates to 10 digits', () => {
    expect(formatPhoneNumber('91955512345678')).toBe('919-555-1234');
  });

  it('handles empty string', () => {
    expect(formatPhoneNumber('')).toBe('');
  });
});
