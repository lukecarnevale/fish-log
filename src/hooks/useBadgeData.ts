// hooks/useBadgeData.ts

import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardBadgeData } from '../components/QuickActionGrid';
import { BADGE_CACHE_TTL, badgeDataCache, PERSISTENT_CACHE_KEYS } from '../screens/home/homeScreenConstants';
import { BADGE_STORAGE_KEYS } from '../utils/badgeUtils';
import { getReportsSummary } from '../services/reportsService';
import { fetchAllFishSpecies } from '../services/fishSpeciesService';
import { fetchRecentCatches } from '../services/catchFeedService';

interface UseBadgeDataResult {
  badgeData: CardBadgeData;
  loadBadgeData: (forceRefresh?: boolean) => Promise<void>;
  updateBadgeData: (updates: Partial<CardBadgeData>) => void;
}

export const useBadgeData = (): UseBadgeDataResult => {
  const [badgeData, setBadgeData] = useState<CardBadgeData>({
    pastReportsCount: 0,
    hasNewReport: false,
    totalSpecies: 0,
    newCatchesCount: 0,
  });

  // Guard against concurrent loadBadgeData calls (e.g., useEffect + focus
  // listener both firing on mount) which cause duplicate fetches and
  // intermediate state updates that trigger badge animation flicker.
  const isLoadingRef = useRef(false);

  const loadBadgeData = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // Check memory cache first (fastest)
    if (!forceRefresh && badgeDataCache.data && (now - badgeDataCache.timestamp) < BADGE_CACHE_TTL) {
      setBadgeData(badgeDataCache.data);
      return;
    }

    // Prevent concurrent fetches — the first call handles the load,
    // subsequent calls are no-ops until it completes
    if (isLoadingRef.current && !forceRefresh) return;
    isLoadingRef.current = true;

    // Load from persistent cache immediately for optimistic UI (don't await)
    if (!badgeDataCache.data) {
      AsyncStorage.getItem(PERSISTENT_CACHE_KEYS.badgeData).then(cached => {
        if (cached && !badgeDataCache.data) {
          try {
            const parsed = JSON.parse(cached);
            setBadgeData(parsed);
          } catch { /* ignore parse errors */ }
        }
      });
    }

    try {
      // Parallelize ALL badge data fetches including catch feed
      const [
        reportsSummary,
        lastViewedPastReports,
        lastReportTimestamp,
        speciesList,
        lastViewedCatchFeed,
        catchFeedResult,
      ] = await Promise.all([
        getReportsSummary(),
        AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastViewedPastReports),
        AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastReportTimestamp),
        fetchAllFishSpecies(),
        AsyncStorage.getItem(BADGE_STORAGE_KEYS.lastViewedCatchFeed),
        fetchRecentCatches({ forceRefresh: false }).catch(() => ({ entries: [] })),
      ]);

      const pastReportsCount = reportsSummary.totalReports;
      const hasNewReport = lastReportTimestamp !== null &&
        (lastViewedPastReports === null || lastReportTimestamp > lastViewedPastReports);
      const totalSpecies = speciesList.length;

      // Calculate new catches count
      let newCatchesCount = 0;
      const recentCatches = catchFeedResult.entries || [];
      if (lastViewedCatchFeed) {
        const lastViewedDate = new Date(lastViewedCatchFeed);
        newCatchesCount = recentCatches.filter(
          (catch_: any) => new Date(catch_.createdAt) > lastViewedDate
        ).length;
      } else {
        newCatchesCount = Math.min(recentCatches.length, 10);
      }

      const newBadgeData = {
        pastReportsCount,
        hasNewReport,
        totalSpecies,
        newCatchesCount,
      };

      // Update memory cache
      badgeDataCache.data = newBadgeData;
      badgeDataCache.timestamp = now;
      setBadgeData(newBadgeData);

      // Persist to storage for next app launch (don't await)
      AsyncStorage.setItem(PERSISTENT_CACHE_KEYS.badgeData, JSON.stringify(newBadgeData));
    } catch (error) {
      console.error('Error loading badge data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  const updateBadgeData = useCallback((updates: Partial<CardBadgeData>) => {
    setBadgeData(prev => ({ ...prev, ...updates }));
  }, []);

  return { badgeData, loadBadgeData, updateBadgeData };
};
