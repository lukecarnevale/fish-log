import { useState, useEffect } from 'react';
import { getReports, getFishEntries } from '../services/reportsService';
import { FishingStats } from '../screens/profile/profileScreen.types';

export const useFishingStats = () => {
  const [fishingStats, setFishingStats] = useState<FishingStats>({
    totalCatches: 0,
    uniqueSpecies: 0,
    largestFish: null,
  });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadFishingStats = async () => {
      setStatsLoading(true);
      try {
        const reports = await getReports();

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
          if (report.flounderCount > 0) speciesCaught.add('Southern Flounder');
          if (report.spottedSeatroutCount > 0) speciesCaught.add('Spotted Seatrout');
          if (report.weakfishCount > 0) speciesCaught.add('Weakfish');
          if (report.stripedBassCount > 0) speciesCaught.add('Striped Bass');
        });
        const uniqueSpecies = speciesCaught.size;

        // Find largest fish from fish entries
        let largestFish: number | null = null;
        for (const report of reports) {
          if (!report.id.startsWith('local_')) {
            const entries = await getFishEntries(report.id);
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
        }

        setFishingStats({ totalCatches, uniqueSpecies, largestFish });
      } catch (error) {
        console.error('Failed to load fishing stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadFishingStats();
  }, []);

  return { fishingStats, statsLoading };
};
