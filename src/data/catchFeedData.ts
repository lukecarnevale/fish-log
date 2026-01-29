// data/catchFeedData.ts
//
// Sample catch feed data for development and testing.
// This data will be replaced by real Supabase data in production.
//

import { CatchFeedEntry, AnglerProfile, TopAngler } from '../types/catchFeed';

// Generate dates relative to now for realistic timestamps
const now = new Date();
const hoursAgo = (hours: number) => {
  const date = new Date(now);
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};
const daysAgo = (days: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

/**
 * Sample catch feed entries for development.
 */
export const sampleCatchFeedEntries: CatchFeedEntry[] = [
  {
    id: '1',
    userId: 'user-1',
    anglerName: 'Mike J.',
    species: 'Red Drum',
    length: '28 inches',
    location: 'Pamlico Sound',
    catchDate: hoursAgo(2),
    createdAt: hoursAgo(2),
  },
  {
    id: '2',
    userId: 'user-2',
    anglerName: 'Sarah W.',
    species: 'Southern Flounder',
    length: '19 inches',
    location: 'Bogue Sound',
    catchDate: hoursAgo(5),
    createdAt: hoursAgo(5),
  },
  {
    id: '3',
    userId: 'user-3',
    anglerName: 'David C.',
    species: 'Spotted Seatrout',
    location: 'Core Sound',
    catchDate: hoursAgo(8),
    createdAt: hoursAgo(8),
  },
  {
    id: '4',
    userId: 'user-1',
    anglerName: 'Mike J.',
    species: 'Striped Bass',
    length: '32 inches',
    location: 'Albemarle Sound',
    catchDate: daysAgo(1),
    createdAt: daysAgo(1),
  },
  {
    id: '5',
    userId: 'user-4',
    anglerName: 'Emma R.',
    species: 'Red Drum',
    length: '24 inches',
    location: 'Neuse River',
    catchDate: daysAgo(1),
    createdAt: daysAgo(1),
  },
  {
    id: '6',
    userId: 'user-5',
    anglerName: 'James W.',
    species: 'Weakfish',
    location: 'Pamlico Sound',
    catchDate: daysAgo(2),
    createdAt: daysAgo(2),
  },
  {
    id: '7',
    userId: 'user-2',
    anglerName: 'Sarah W.',
    species: 'Spotted Seatrout',
    length: '22 inches',
    location: 'Bogue Sound',
    catchDate: daysAgo(2),
    createdAt: daysAgo(2),
  },
  {
    id: '8',
    userId: 'user-6',
    anglerName: 'Linda M.',
    species: 'Southern Flounder',
    length: '21 inches',
    location: 'Cape Fear River',
    catchDate: daysAgo(3),
    createdAt: daysAgo(3),
  },
  {
    id: '9',
    userId: 'user-3',
    anglerName: 'David C.',
    species: 'Red Drum',
    length: '26 inches',
    location: 'Core Sound',
    catchDate: daysAgo(4),
    createdAt: daysAgo(4),
  },
  {
    id: '10',
    userId: 'user-7',
    anglerName: 'Robert T.',
    species: 'Striped Bass',
    location: 'Roanoke River',
    catchDate: daysAgo(5),
    createdAt: daysAgo(5),
  },
];

/**
 * Sample angler profiles for development.
 */
export const sampleAnglerProfiles: Record<string, AnglerProfile> = {
  'user-1': {
    userId: 'user-1',
    displayName: 'Mike J.',
    totalCatches: 47,
    speciesCaught: ['Red Drum', 'Striped Bass', 'Spotted Seatrout', 'Southern Flounder'],
    topSpecies: 'Red Drum',
    memberSince: '2024-06-15T00:00:00Z',
    recentCatches: [
      sampleCatchFeedEntries[0],
      sampleCatchFeedEntries[3],
    ],
  },
  'user-2': {
    userId: 'user-2',
    displayName: 'Sarah W.',
    totalCatches: 32,
    speciesCaught: ['Southern Flounder', 'Spotted Seatrout', 'Weakfish'],
    topSpecies: 'Southern Flounder',
    memberSince: '2024-08-20T00:00:00Z',
    recentCatches: [
      sampleCatchFeedEntries[1],
      sampleCatchFeedEntries[6],
    ],
  },
  'user-3': {
    userId: 'user-3',
    displayName: 'David C.',
    totalCatches: 28,
    speciesCaught: ['Spotted Seatrout', 'Red Drum'],
    topSpecies: 'Spotted Seatrout',
    memberSince: '2024-09-10T00:00:00Z',
    recentCatches: [
      sampleCatchFeedEntries[2],
      sampleCatchFeedEntries[8],
    ],
  },
  'user-4': {
    userId: 'user-4',
    displayName: 'Emma R.',
    totalCatches: 15,
    speciesCaught: ['Red Drum', 'Spotted Seatrout'],
    topSpecies: 'Red Drum',
    memberSince: '2024-11-01T00:00:00Z',
    recentCatches: [
      sampleCatchFeedEntries[4],
    ],
  },
  'user-5': {
    userId: 'user-5',
    displayName: 'James W.',
    totalCatches: 21,
    speciesCaught: ['Weakfish', 'Spotted Seatrout', 'Red Drum'],
    topSpecies: 'Weakfish',
    memberSince: '2024-07-05T00:00:00Z',
    recentCatches: [
      sampleCatchFeedEntries[5],
    ],
  },
  'user-6': {
    userId: 'user-6',
    displayName: 'Linda M.',
    totalCatches: 18,
    speciesCaught: ['Southern Flounder', 'Spotted Seatrout'],
    topSpecies: 'Southern Flounder',
    memberSince: '2024-10-12T00:00:00Z',
    recentCatches: [
      sampleCatchFeedEntries[7],
    ],
  },
  'user-7': {
    userId: 'user-7',
    displayName: 'Robert T.',
    totalCatches: 35,
    speciesCaught: ['Striped Bass', 'Red Drum', 'Weakfish'],
    topSpecies: 'Striped Bass',
    memberSince: '2024-05-22T00:00:00Z',
    recentCatches: [
      sampleCatchFeedEntries[9],
    ],
  },
};

/**
 * Get sample catch feed entries.
 * Simulates async fetch for development.
 */
export async function getSampleCatchFeed(): Promise<CatchFeedEntry[]> {
  // Simulate network delay
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  return sampleCatchFeedEntries;
}

/**
 * Get sample angler profile.
 * Simulates async fetch for development.
 */
export async function getSampleAnglerProfile(userId: string): Promise<AnglerProfile | null> {
  // Simulate network delay
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  return sampleAnglerProfiles[userId] || null;
}

/**
 * Sample top anglers for "This Week's Top Anglers" section.
 * Based on different ranking criteria.
 */
export const sampleTopAnglers: TopAngler[] = [
  {
    type: 'catches',
    userId: 'user-1',
    displayName: 'Mike J.',
    value: 47,
    label: 'catches',
  },
  {
    type: 'species',
    userId: 'user-1',
    displayName: 'Mike J.',
    value: 4,
    label: 'species',
  },
  {
    type: 'length',
    userId: 'user-7',
    displayName: 'Robert T.',
    value: '32"',
    label: 'longest',
  },
];

/**
 * Get sample top anglers.
 * Simulates async fetch for development.
 */
export async function getSampleTopAnglers(): Promise<TopAngler[]> {
  // Simulate network delay
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  return sampleTopAnglers;
}
