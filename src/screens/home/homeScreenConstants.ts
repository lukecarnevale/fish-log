// screens/home/homeScreenConstants.ts

import { CardBadgeData } from '../../components/QuickActionGrid';

// Cache for badge data to avoid refetching on every focus
export const BADGE_CACHE_TTL = 60000; // 1 minute

export let badgeDataCache: { data: CardBadgeData | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

// Persistent storage keys for cached data (faster initial render)
export const PERSISTENT_CACHE_KEYS = {
  badgeData: 'homeScreen_badgeDataCache',
  rewardsMember: 'homeScreen_rewardsMemberCache',
  rewardsData: 'homeScreen_rewardsDataCache',
};

// Nautical greetings by time of day (moved outside component to avoid recreation)
export const NAUTICAL_GREETINGS = {
  morning: ["Smooth sailing this morning", "Fair winds this morning", "Morning ahoy", "Clear skies ahead"],
  afternoon: ["Afternoon on the high seas", "Steady as she goes this afternoon", "Fisherman's afternoon", "Tight lines this afternoon"],
  evening: ["Evening tides", "Sunset fishing", "Evening on the water", "Dusk on the horizon"],
  night: ["Starboard lights on", "Navigating by stars", "Night fishing", "Port lights on"],
};
