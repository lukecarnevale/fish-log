// hooks/usePartners.ts
//
// Hook for loading partner data with optimistic rendering.
// Returns cached/fallback data immediately, then refreshes from Supabase.
//

import { useState, useEffect, useCallback, useRef } from 'react';
import { Partner } from '../types/partner';
import { fetchPartners, refreshPartners } from '../services/partnersService';

interface UsePartnersResult {
  /** The current list of active partners, sorted by display_order. */
  partners: Partner[];
  /** Whether a network fetch is currently in progress. */
  loading: boolean;
  /** Manually trigger a fresh fetch (bypasses caches). */
  refresh: () => Promise<void>;
}

/**
 * Provides partner data for the "Our Partners" footer section.
 *
 * Renders optimistically from cache/fallback, then silently updates
 * when fresh data arrives from Supabase.
 */
export function usePartners(): UsePartnersResult {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadPartners();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadPartners = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchPartners();
      if (isMounted.current) {
        setPartners(result.partners);
      }
    } catch (error) {
      console.warn('usePartners: failed to load partners', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await refreshPartners();
      if (isMounted.current) {
        setPartners(result.partners);
      }
    } catch (error) {
      console.warn('usePartners: failed to refresh partners', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  return { partners, loading, refresh };
}
