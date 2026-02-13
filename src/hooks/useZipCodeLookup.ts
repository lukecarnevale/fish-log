/**
 * useZipCodeLookup Hook
 *
 * Debounced ZIP code lookup with loading states and offline support.
 * Purely for display - does not affect form validation or submission.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { lookupZipCode, ZipCodeResult, getCachedZipCode } from '../services/zipCodeService';

// ============================================
// TYPES
// ============================================

export interface ZipCodeLookupState {
  /** City/state data if lookup succeeded */
  result: ZipCodeResult | null;
  /** Whether a lookup is in progress */
  isLoading: boolean;
  /** Error message if ZIP is invalid (not shown for network errors) */
  error: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const DEBOUNCE_DELAY_MS = 500;
const ZIP_REGEX = /^\d{5}$/;

// ============================================
// HOOK
// ============================================

/**
 * Hook for debounced ZIP code lookup with city/state display.
 *
 * Features:
 * - Debounces API calls by 500ms
 * - Shows cached data immediately when available
 * - Only shows errors for invalid ZIPs (404), not network failures
 * - Graceful offline degradation (silent fail, no error shown)
 *
 * @param zipCode - The ZIP code to look up (should be from formData.zipCode)
 * @returns Lookup state with result, isLoading, and error
 *
 * @example
 * ```tsx
 * const { result, isLoading, error } = useZipCodeLookup(formData.zipCode);
 *
 * // In JSX:
 * {isLoading && <Text>Checking...</Text>}
 * {result && <Text>{result.city}, {result.stateAbbr}</Text>}
 * {error && <Text style={{ color: 'orange' }}>{error}</Text>}
 * ```
 */
export function useZipCodeLookup(zipCode: string | undefined | null): ZipCodeLookupState {
  const [result, setResult] = useState<ZipCodeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Track current lookup to cancel stale requests
  const currentZipRef = useRef<string | null>(null);

  // Debounce timeout ref
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Perform the actual lookup after debounce.
   */
  const performLookup = useCallback(async (zip: string) => {
    // Update current zip being looked up
    currentZipRef.current = zip;

    // Check cache first for instant feedback
    const cached = await getCachedZipCode(zip);
    if (cached && isMountedRef.current && currentZipRef.current === zip) {
      setResult(cached);
      setError(null);
      // Continue with API call to refresh cache, but don't show loading
    }

    // Set loading only if no cached data
    if (!cached && isMountedRef.current && currentZipRef.current === zip) {
      setIsLoading(true);
    }

    // Perform API lookup
    const lookupResult = await lookupZipCode(zip);

    // Check if this is still the current lookup (not stale)
    if (!isMountedRef.current || currentZipRef.current !== zip) {
      return;
    }

    setIsLoading(false);

    if (lookupResult.data) {
      setResult(lookupResult.data);
      setError(null);
    } else if (lookupResult.notFound) {
      // Only show error if API confirmed ZIP is invalid
      setResult(null);
      setError('ZIP code not found');
    } else {
      // Network error - keep cached data if any, don't show error
      // result is already set from cache above (or null if no cache)
      if (!cached) {
        setResult(null);
      }
      setError(null);
    }
  }, []);

  /**
   * Effect to trigger lookup when ZIP changes.
   */
  useEffect(() => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Reset state if ZIP is invalid or empty
    const normalizedZip = zipCode?.trim() || '';
    if (!ZIP_REGEX.test(normalizedZip)) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      currentZipRef.current = null;
      return;
    }

    // Debounce the lookup
    debounceTimeoutRef.current = setTimeout(() => {
      performLookup(normalizedZip);
      debounceTimeoutRef.current = null;
    }, DEBOUNCE_DELAY_MS);

    // Cleanup on unmount or ZIP change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [zipCode, performLookup]);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    result,
    isLoading,
    error,
  };
}

export default useZipCodeLookup;
