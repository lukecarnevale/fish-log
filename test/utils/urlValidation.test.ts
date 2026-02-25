import { isValidUrl, isSafeExternalUrl } from '../../src/utils/urlValidation';

describe('urlValidation', () => {
  describe('isValidUrl', () => {
    it('accepts valid https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('accepts valid http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('accepts URL with path and query', () => {
      expect(isValidUrl('https://example.com/path?q=1&foo=bar')).toBe(true);
    });

    it('rejects javascript: protocol', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: protocol', () => {
      expect(isValidUrl('data:text/html,<h1>hi</h1>')).toBe(false);
    });

    it('rejects sms: protocol', () => {
      expect(isValidUrl('sms://+1234567890')).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidUrl(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidUrl(undefined)).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(isValidUrl('   ')).toBe(false);
    });

    it('rejects malformed URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });

    it('rejects ftp: protocol', () => {
      expect(isValidUrl('ftp://files.example.com')).toBe(false);
    });
  });

  describe('isSafeExternalUrl', () => {
    it('allows any valid URL when no domain whitelist is given', () => {
      expect(isSafeExternalUrl('https://anything.com')).toBe(true);
    });

    it('allows exact domain match', () => {
      expect(isSafeExternalUrl('https://example.com/path', ['example.com'])).toBe(true);
    });

    it('allows subdomain match', () => {
      expect(isSafeExternalUrl('https://sub.example.com', ['example.com'])).toBe(true);
    });

    it('rejects non-whitelisted domain', () => {
      expect(isSafeExternalUrl('https://evil.com', ['example.com'])).toBe(false);
    });

    it('rejects invalid URL regardless of whitelist', () => {
      expect(isSafeExternalUrl('javascript:alert(1)', ['javascript'])).toBe(false);
    });

    it('returns true for empty whitelist array', () => {
      expect(isSafeExternalUrl('https://any.com', [])).toBe(true);
    });
  });
});
