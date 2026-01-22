// data/leaderboardData.ts
import { LeaderboardEntry, SpeciesLeaderboard } from '../types/leaderboard';

export const sampleLeaderboardEntries: LeaderboardEntry[] = [
  {
    userId: '1',
    userName: 'Mike Johnson',
    fishCount: 87,
    biggestCatch: {
      species: 'Red Drum',
      length: '32',
      weight: '18.5',
      date: '2024-01-15'
    },
    totalWeight: 243.7,
    mostCaughtSpecies: 'Spotted Seatrout',
    badges: ['veteran_angler', 'trophy_fish'],
    lastCatch: '2024-02-28'
  },
  {
    userId: '2',
    userName: 'Sarah Williams',
    fishCount: 102,
    biggestCatch: {
      species: 'Cobia',
      length: '43',
      weight: '32.8',
      date: '2023-09-22'
    },
    totalWeight: 311.4,
    mostCaughtSpecies: 'Southern Flounder',
    badges: ['master_angler', 'conservation_hero', 'trophy_fish'],
    lastCatch: '2024-03-01'
  },
  {
    userId: '3',
    userName: 'David Chen',
    fishCount: 78,
    biggestCatch: {
      species: 'Striped Bass',
      length: '36',
      weight: '22.4',
      date: '2024-01-30'
    },
    totalWeight: 186.2,
    mostCaughtSpecies: 'Bluefish',
    badges: ['veteran_angler'],
    lastCatch: '2024-02-25',
    region: 'Outer Banks'
  },
  {
    userId: '4',
    userName: 'Emma Rodriguez',
    fishCount: 65,
    biggestCatch: {
      species: 'Southern Flounder',
      length: '24',
      weight: '6.8',
      date: '2023-11-14'
    },
    totalWeight: 145.8,
    mostCaughtSpecies: 'Spotted Seatrout',
    badges: ['conservation_hero'],
    lastCatch: '2024-02-27'
  },
  {
    userId: '5',
    userName: 'James Wilson',
    fishCount: 91,
    biggestCatch: {
      species: 'Weakfish',
      length: '27',
      weight: '8.2',
      date: '2023-10-18'
    },
    totalWeight: 201.3,
    mostCaughtSpecies: 'Weakfish',
    badges: ['veteran_angler', 'species_specialist'],
    lastCatch: '2024-02-29'
  },
  {
    userId: '6',
    userName: 'Linda Martinez',
    fishCount: 52,
    biggestCatch: {
      species: 'Striped Bass',
      length: '28',
      weight: '14.6',
      date: '2023-12-05'
    },
    totalWeight: 132.8,
    mostCaughtSpecies: 'Red Drum',
    badges: [],
    lastCatch: '2024-02-15'
  },
  {
    userId: '7',
    userName: 'Robert Taylor',
    fishCount: 124,
    biggestCatch: {
      species: 'Cobia',
      length: '48',
      weight: '41.2',
      date: '2023-06-18'
    },
    totalWeight: 358.6,
    mostCaughtSpecies: 'Spotted Seatrout',
    badges: ['master_angler', 'trophy_fish', 'species_specialist'],
    lastCatch: '2024-03-01',
    region: 'Crystal Coast'
  },
  {
    userId: '8',
    userName: 'Jennifer Lee',
    fishCount: 43,
    biggestCatch: {
      species: 'Red Drum',
      length: '26',
      weight: '9.4',
      date: '2024-01-08'
    },
    totalWeight: 98.7,
    mostCaughtSpecies: 'Bluefish',
    badges: [],
    lastCatch: '2024-02-20'
  },
  {
    userId: '9',
    userName: 'Thomas Brown',
    fishCount: 73,
    biggestCatch: {
      species: 'Striped Bass',
      length: '34',
      weight: '19.8',
      date: '2023-11-27'
    },
    totalWeight: 178.4,
    mostCaughtSpecies: 'Striped Bass',
    badges: ['veteran_angler', 'species_specialist'],
    lastCatch: '2024-02-26'
  },
  {
    userId: '10',
    userName: 'Rebecca Phillips',
    fishCount: 81,
    biggestCatch: {
      species: 'Southern Flounder',
      length: '26',
      weight: '7.6',
      date: '2023-09-15'
    },
    totalWeight: 167.5,
    mostCaughtSpecies: 'Red Drum',
    badges: ['veteran_angler', 'conservation_hero'],
    lastCatch: '2024-02-24'
  }
];

export const speciesLeaderboards: Record<string, SpeciesLeaderboard> = {
  'Red Drum': {
    species: 'Red Drum',
    entries: [
      {
        userId: '1',
        userName: 'Mike Johnson',
        length: '32',
        weight: '18.5',
        date: '2024-01-15',
        location: 'Outer Banks'
      },
      {
        userId: '2',
        userName: 'Sarah Williams',
        length: '30',
        weight: '16.7',
        date: '2023-10-28',
        location: 'Cape Lookout'
      },
      {
        userId: '7',
        userName: 'Robert Taylor',
        length: '28',
        weight: '15.2',
        date: '2023-11-05',
        location: 'Emerald Isle'
      }
    ]
  },
  'Southern Flounder': {
    species: 'Southern Flounder',
    entries: [
      {
        userId: '2',
        userName: 'Sarah Williams',
        length: '28',
        weight: '8.4',
        date: '2023-08-15',
        location: 'Bogue Sound'
      },
      {
        userId: '10',
        userName: 'Rebecca Phillips',
        length: '26',
        weight: '7.6',
        date: '2023-09-15',
        location: 'New River'
      },
      {
        userId: '4',
        userName: 'Emma Rodriguez',
        length: '24',
        weight: '6.8',
        date: '2023-11-14',
        location: 'Topsail Island'
      }
    ]
  },
  'Striped Bass': {
    species: 'Striped Bass',
    entries: [
      {
        userId: '3',
        userName: 'David Chen',
        length: '36',
        weight: '22.4',
        date: '2024-01-30',
        location: 'Roanoke River'
      },
      {
        userId: '9',
        userName: 'Thomas Brown',
        length: '34',
        weight: '19.8',
        date: '2023-11-27',
        location: 'Albemarle Sound'
      },
      {
        userId: '6',
        userName: 'Linda Martinez',
        length: '28',
        weight: '14.6',
        date: '2023-12-05',
        location: 'Lake Gaston'
      }
    ]
  },
  'Cobia': {
    species: 'Cobia',
    entries: [
      {
        userId: '7',
        userName: 'Robert Taylor',
        length: '48',
        weight: '41.2',
        date: '2023-06-18',
        location: 'Cape Lookout'
      },
      {
        userId: '2',
        userName: 'Sarah Williams',
        length: '43',
        weight: '32.8',
        date: '2023-09-22',
        location: 'Hatteras Island'
      },
      {
        userId: '5',
        userName: 'James Wilson',
        length: '38',
        weight: '27.5',
        date: '2023-07-14',
        location: 'Oregon Inlet'
      }
    ]
  }
};