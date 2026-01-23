// data/prizesData.ts
//
// DEPRECATED: This file is maintained for backward compatibility.
// New code should use the rewards context: import { useRewards } from '../contexts/RewardsContext';
// Or import directly from: import { FALLBACK_PRIZES, FALLBACK_DRAWING } from './rewardsFallbackData';
//

import { Prize, PrizeDrawing, UserPrizeEntry } from '../types/prizes';
import {
  FALLBACK_PRIZES,
  FALLBACK_DRAWING,
} from './rewardsFallbackData';

/**
 * @deprecated Use FALLBACK_PRIZES from rewardsFallbackData.ts or useRewards() hook
 */
export const samplePrizes: Prize[] = FALLBACK_PRIZES.map((prize) => ({
  id: prize.id,
  name: prize.name,
  description: prize.description,
  imageUrl: prize.imageUrl,
  value: prize.value,
  category: prize.category,
  sponsor: prize.sponsor,
}));

/**
 * @deprecated Use FALLBACK_DRAWING from rewardsFallbackData.ts or useRewards() hook
 */
export const activePrizeDrawing: PrizeDrawing = {
  id: FALLBACK_DRAWING.id,
  name: FALLBACK_DRAWING.name,
  description: FALLBACK_DRAWING.description,
  eligibilityRequirements: FALLBACK_DRAWING.eligibilityRequirements,
  prizes: samplePrizes,
  startDate: FALLBACK_DRAWING.startDate,
  endDate: FALLBACK_DRAWING.endDate,
  drawingDate: FALLBACK_DRAWING.drawingDate,
  isActive: FALLBACK_DRAWING.isActive,
};

/**
 * @deprecated Sample user entry for testing purposes only
 */
export const sampleUserEntry: UserPrizeEntry = {
  userId: 'user123',
  userName: 'John Smith',
  drawings: [
    {
      drawingId: FALLBACK_DRAWING.id,
      entriesCount: 1,
      eligibleCatches: [],
      isEligible: true,
    },
  ],
};
