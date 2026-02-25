/**
 * URL validation utility for safe external link handling
 */

/**
 * Validates that a URL has a safe protocol (http/https only)
 * Rejects javascript:, data:, sms://, market://, tel:, file:// schemes
 * Uses URL constructor for validation
 *
 * @param url - URL string to validate
 * @returns true if valid http/https URL, false otherwise
 */
export function isValidUrl(url: string | null | undefined): boolean {
  // Reject empty/null/undefined
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Ensure hostname exists
    if (!parsed.hostname) {
      return false;
    }

    return true;
  } catch {
    // URL constructor throws on invalid URLs
    return false;
  }
}

/**
 * Validates that a URL is safe and optionally matches allowed domains
 * First validates the URL structure, then optionally checks hostname against allowed list
 *
 * @param url - URL string to validate
 * @param allowedDomains - Optional array of allowed domain suffixes (e.g., ['example.com', 'test.org'])
 * @returns true if URL is valid and (if allowedDomains provided) hostname matches one of them
 */
export function isSafeExternalUrl(
  url: string | null | undefined,
  allowedDomains?: string[]
): boolean {
  // First validate the URL structure
  if (!isValidUrl(url)) {
    return false;
  }

  // If no allowed domains specified, just return the URL validation result
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }

  try {
    const parsed = new URL(url!);
    const hostname = parsed.hostname || '';

    // Check if hostname ends with any of the allowed domains
    return allowedDomains.some((domain) => {
      const normalizedDomain = domain.toLowerCase();
      return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
    });
  } catch {
    return false;
  }
}
