// types/leaderboard.ts

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  shareData: boolean;
  joinDate: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatar?: string;
  fishCount: number;
  biggestCatch?: {
    species: string;
    length: string;
    weight: string;
    date: string;
  };
  totalWeight: number;
  mostCaughtSpecies: string;
  badges: string[];
  lastCatch: string;
  region?: string;
}

export interface SpeciesLeaderboard {
  species: string;
  entries: {
    userId: string;
    userName: string;
    length: string;
    weight: string;
    date: string;
    location?: string;
  }[];
}

export type LeaderboardTimeframe = 'all_time' | 'this_year' | 'this_month' | 'this_week';
export type LeaderboardCategory = 'most_fish' | 'biggest_catch' | 'species_specific';