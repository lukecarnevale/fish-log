/**
 * communityStats.test.ts - Type transformers for community stats
 */
import {
  transformCommunityStatBySpecies,
  transformCommunityStatOverall,
  transformLeaderboardEntry,
} from '../../src/types/communityStats';

describe('communityStats transformers', () => {
  describe('transformCommunityStatBySpecies', () => {
    it('transforms a species stats row', () => {
      const row = {
        species: 'Red Drum',
        total_fish_count: 2500,
        total_reports: 800,
        unique_anglers: 150,
      };

      const result = transformCommunityStatBySpecies(row);

      expect(result.species).toBe('Red Drum');
      expect(result.totalFishCount).toBe(2500);
      expect(result.totalReports).toBe(800);
      expect(result.uniqueAnglers).toBe(150);
      expect(result.avgFishPerReport).toBe(3.13);
    });

    it('handles zero reports (no divide-by-zero)', () => {
      const row = {
        species: 'Weakfish',
        total_fish_count: 0,
        total_reports: 0,
        unique_anglers: 0,
      };

      const result = transformCommunityStatBySpecies(row);

      expect(result.avgFishPerReport).toBe(0);
    });

    it('handles null/undefined values as 0', () => {
      const row = {
        species: 'Striped Bass',
        total_fish_count: null as any,
        total_reports: null as any,
        unique_anglers: null as any,
      };

      const result = transformCommunityStatBySpecies(row);

      expect(result.totalFishCount).toBe(0);
      expect(result.totalReports).toBe(0);
      expect(result.uniqueAnglers).toBe(0);
      expect(result.avgFishPerReport).toBe(0);
    });
  });

  describe('transformCommunityStatOverall', () => {
    it('transforms an overall stats row', () => {
      const row = {
        total_fish_count: 10000,
        total_reports: 3000,
        unique_anglers: 500,
        avg_fish_per_report: 3.33,
      };

      const result = transformCommunityStatOverall(row);

      expect(result.species).toBeNull();
      expect(result.totalFishCount).toBe(10000);
      expect(result.totalReports).toBe(3000);
      expect(result.uniqueAnglers).toBe(500);
      expect(result.avgFishPerReport).toBe(3.33);
    });

    it('handles null values as 0', () => {
      const row = {
        total_fish_count: null as any,
        total_reports: null as any,
        unique_anglers: null as any,
        avg_fish_per_report: null as any,
      };

      const result = transformCommunityStatOverall(row);

      expect(result.totalFishCount).toBe(0);
      expect(result.totalReports).toBe(0);
      expect(result.uniqueAnglers).toBe(0);
      expect(result.avgFishPerReport).toBe(0);
    });
  });

  describe('transformLeaderboardEntry', () => {
    it('transforms a leaderboard row', () => {
      const row = {
        rank: 1,
        user_id: 'abc-123',
        first_name: 'John',
        last_name: 'Doe',
        profile_image_url: 'https://example.com/photo.jpg',
        total_fish: 42,
        total_reports: 15,
        primary_species: 'Red Drum',
      };

      const result = transformLeaderboardEntry(row);

      expect(result.rank).toBe(1);
      expect(result.userId).toBe('abc-123');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.profileImageUrl).toBe('https://example.com/photo.jpg');
      expect(result.totalFish).toBe(42);
      expect(result.totalReports).toBe(15);
      expect(result.primarySpecies).toBe('Red Drum');
    });

    it('handles null optional fields', () => {
      const row = {
        rank: 5,
        user_id: 'xyz-789',
        first_name: null,
        last_name: null,
        profile_image_url: null,
        total_fish: 0,
        total_reports: 0,
        primary_species: null,
      };

      const result = transformLeaderboardEntry(row);

      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
      expect(result.profileImageUrl).toBeNull();
      expect(result.totalFish).toBe(0);
      expect(result.primarySpecies).toBeNull();
    });
  });
});
