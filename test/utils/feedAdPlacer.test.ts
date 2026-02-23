import { intersperseFeedAds, FeedItem } from '../../src/utils/feedAdPlacer';
import type { Advertisement } from '../../src/services/transformers/advertisementTransformer';

const makeCatch = (id: string) => ({ id, userId: 'u1', anglerName: 'Test' } as any);
const makeAd = (id: string): Advertisement => ({
  id,
  companyName: `Company ${id}`,
  promoText: 'promo',
  linkUrl: 'https://example.com',
  imageUrl: 'https://example.com/img.jpg',
  isActive: true,
  priority: 1,
  placements: ['catch_feed'],
  clickCount: 0,
  impressionCount: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

describe('intersperseFeedAds', () => {
  it('returns catches unchanged when no ads available', () => {
    const catches = Array.from({ length: 10 }, (_, i) => makeCatch(`c${i}`));
    const result = intersperseFeedAds(catches, []);
    expect(result).toHaveLength(10);
    expect(result.every(item => item.type === 'catch')).toBe(true);
  });

  it('returns catches unchanged when fewer catches than firstAdAfter', () => {
    const catches = Array.from({ length: 3 }, (_, i) => makeCatch(`c${i}`));
    const ads = [makeAd('a1')];
    const result = intersperseFeedAds(catches, ads, { firstAdAfter: 5 });
    expect(result).toHaveLength(3);
    expect(result.every(item => item.type === 'catch')).toBe(true);
  });

  it('does not insert ads before firstAdAfter threshold', () => {
    const catches = Array.from({ length: 20 }, (_, i) => makeCatch(`c${i}`));
    const ads = [makeAd('a1')];
    const result = intersperseFeedAds(catches, ads, { firstAdAfter: 5, baseInterval: 8, jitter: 0 });

    // First 5 items should all be catches
    for (let i = 0; i < 5; i++) {
      expect(result[i].type).toBe('catch');
    }
    // The 6th item (index 5) should be the first ad
    expect(result[5].type).toBe('ad');
  });

  it('maintains minimum gap of 5 between ads', () => {
    const catches = Array.from({ length: 50 }, (_, i) => makeCatch(`c${i}`));
    const ads = [makeAd('a1'), makeAd('a2'), makeAd('a3')];
    const result = intersperseFeedAds(catches, ads, { firstAdAfter: 5, baseInterval: 3, jitter: 2 });

    let lastAdIndex = -1;
    for (let i = 0; i < result.length; i++) {
      if (result[i].type === 'ad') {
        if (lastAdIndex >= 0) {
          // Count catches between this ad and the previous one
          let catchesBetween = 0;
          for (let j = lastAdIndex + 1; j < i; j++) {
            if (result[j].type === 'catch') catchesBetween++;
          }
          expect(catchesBetween).toBeGreaterThanOrEqual(5);
        }
        lastAdIndex = i;
      }
    }
  });

  it('cycles through ad pool when more slots than ads', () => {
    const catches = Array.from({ length: 50 }, (_, i) => makeCatch(`c${i}`));
    const ads = [makeAd('a1'), makeAd('a2')];
    const result = intersperseFeedAds(catches, ads, { firstAdAfter: 5, baseInterval: 5, jitter: 0 });

    const adItems = result.filter(item => item.type === 'ad');
    expect(adItems.length).toBeGreaterThan(2);

    // Should cycle: a1, a2, a1, a2, ...
    const adIds = adItems.map(item => (item.data as Advertisement).id);
    expect(adIds[0]).toBe('a1');
    expect(adIds[1]).toBe('a2');
    if (adIds.length > 2) expect(adIds[2]).toBe('a1');
  });

  it('handles empty catches array', () => {
    const result = intersperseFeedAds([], [makeAd('a1')]);
    expect(result).toHaveLength(0);
  });

  it('produces deterministic results for same input', () => {
    const catches = Array.from({ length: 20 }, (_, i) => makeCatch(`c${i}`));
    const ads = [makeAd('a1')];
    const result1 = intersperseFeedAds(catches, ads);
    const result2 = intersperseFeedAds(catches, ads);
    expect(result1.map(r => r.type)).toEqual(result2.map(r => r.type));
  });
});
