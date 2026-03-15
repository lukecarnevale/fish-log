import { useState, useEffect } from 'react';
import { getReports, getFishEntriesBatch } from '../services/reportsService';
import { FishingStats } from '../screens/profile/profileScreen.types';

export const useFishingStats = () => {
  const [fishingStats, setFishingStats] = useState<FishingStats>({
    totalCatches: 0,
    uniqueSpecies: 0,
    largestFish: null,
  });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const loadFishingStats = async () => {
      setStatsLoading(true);
      try {
        const reports = await getReports();

        if (cancelled) return;

        if (reports.length === 0) {
          setFishingStats({ totalCatches: 0, uniqueSpecies: 0, largestFish: null });
          return;
        }

        // Calculate total catches (sum of all species counts)
        const totalCatches = reports.reduce((sum, report) =>
          sum +
          report.redDrumCount +
          report.flounderCount +
          report.spottedSeatroutCount +
          report.weakfishCount +
          report.stripedBassCount,
          0
        );

        // Calculate unique species (count species with at least one catch)
        const speciesCaught = new Set<string>();
        reports.forEach((report) => {
          if (report.redDrumCount > 0) speciesCaught.add('Red Drum');
          if (report.flounderCount > 0) speciesCaught.add('Flounder');
          if (report.spottedSeatroutCount > 0) speciesCaught.add('Spotted Seatrout (speckled trout)');
          if (report.weakfishCount > 0) speciesCaught.add('Weakfish (gray trout)');
          if (report.stripedBassCount > 0) speciesCaught.add('Striped Bass');
        });
        const uniqueSpecies = speciesCaught.size;

        // Batch-fetch all fish entries in a single query (avoids N+1 round-trips)
        const remoteReportIds = reports
          .filter((r) => !r.id.startsWith('local_'))
          .map((r) => r.id);

        const entriesByReport = await getFishEntriesBatch(remoteReportIds);

        if (cancelled) return;

        // Find largest fish across all entries
        let largestFish: number | null = null;
        for (const entries of entriesByReport.values()) {
          for (const entry of entries) {
            if (entry.lengths && entry.lengths.length > 0) {
              for (const lengthStr of entry.lengths) {
                const length = parseFloat(lengthStr);
                if (!isNaN(length) && (largestFish === null || length > largestFish)) {
                  largestFish = length;
                }
              }
            }
          }
        }

        setFishingStats({ totalCatches, uniqueSpecies, largestFish });
      } catch (error) {
        console.error('Failed to load fishing stats:', error);
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    loadFishingStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return { fishingStats, statsLoading };
};
