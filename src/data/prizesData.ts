// data/prizesData.ts
//
// DEPRECATED: This file is maintained for backward compatibility.
// New code should use the rewards context: import { useRewards } from '../contexts/RewardsContext';
// Or import directly from: import { FALLBACK_PRIZES, FALLBACK_DRAWING } from './rewardsFallbackData';
//

import { Prize, RewardsDrawing as PrizeDrawing, UserRewardsEntry as UserPrizeEntry } from '../types/rewards';
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
  quarter: FALLBACK_DRAWING.quarter,
  year: FALLBACK_DRAWING.year,
  startDate: FALLBACK_DRAWING.startDate,
  endDate: FALLBACK_DRAWING.endDate,
  drawingDate: FALLBACK_DRAWING.drawingDate,
  isActive: FALLBACK_DRAWING.isActive,
};

/**
 * @deprecated Use UserRewardsEntry from useRewards() hook or Supabase directly
 * This export is removed as the schema has changed significantly.
 * See types/rewards.ts for the new UserRewardsEntry interface.
 */
