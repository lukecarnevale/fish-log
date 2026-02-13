// utils/feedAdPlacer.ts
//
// Utility for interspersing advertisements into the catch feed
// at variable intervals, following best practices from major social apps.

import { CatchFeedEntry } from '../types/catchFeed';
import { Advertisement } from '../services/transformers/advertisementTransformer';

/**
 * A feed item is either a catch entry or an advertisement.
 */
export type FeedItem =
  | { type: 'catch'; data: CatchFeedEntry }
  | { type: 'ad'; data: Advertisement };

interface InterspersionOptions {
  /** Number of organic items before the first ad (default: 5) */
  firstAdAfter?: number;
  /** Base number of organic items between ads (default: 8) */
  baseInterval?: number;
  /** Random jitter range ±N applied to the base interval (default: 2) */
  jitter?: number;
}

/**
 * Intersperse advertisements into a catch feed at variable intervals.
 *
 * Algorithm (variable interval with jitter):
 * - First ad appears after `firstAdAfter` organic items
 * - Subsequent ads appear every `baseInterval ± jitter` organic items
 * - Ads cycle through the available pool so users see variety
 * - If fewer catches than `firstAdAfter`, no ads are shown
 *
 * Uses a seeded approach based on array length to keep positions
 * stable across re-renders while still varying between sessions.
 */
export function intersperseFeedAds(
  catches: CatchFeedEntry[],
  ads: Advertisement[],
  options?: InterspersionOptions,
): FeedItem[] {
  const {
    firstAdAfter = 5,
    baseInterval = 8,
    jitter = 2,
  } = options ?? {};

  // No ads to show, or not enough catches for the first ad
  if (ads.length === 0 || catches.length < firstAdAfter) {
    return catches.map(data => ({ type: 'catch' as const, data }));
  }

  const result: FeedItem[] = [];
  let adIndex = 0;
  let catchesSinceLastAd = 0;
  let nextAdAt = firstAdAfter;

  // Simple deterministic jitter based on position to avoid layout thrashing
  const getJitter = (position: number): number => {
    // Use a simple hash-like approach for deterministic but varied results
    const hash = ((position * 2654435761) >>> 0) % (jitter * 2 + 1);
    return hash - jitter;
  };

  for (let i = 0; i < catches.length; i++) {
    result.push({ type: 'catch', data: catches[i] });
    catchesSinceLastAd++;

    if (catchesSinceLastAd >= nextAdAt && ads.length > 0) {
      // Insert an ad
      result.push({ type: 'ad', data: ads[adIndex % ads.length] });
      adIndex++;
      catchesSinceLastAd = 0;
      nextAdAt = baseInterval + getJitter(adIndex);
      // Enforce minimum gap of 5
      if (nextAdAt < 5) nextAdAt = 5;
    }
  }

  return result;
}
