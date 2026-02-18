import {
  transformAdvertisement,
  transformAdvertisementList,
} from '../../../src/services/transformers/advertisementTransformer';

const makeRow = (overrides?: Record<string, unknown>) => ({
  id: 'ad-1',
  company_name: 'Bait Shop',
  promo_text: '20% off tackle',
  promo_code: 'FISH20',
  link_url: 'https://baitshop.com',
  image_url: 'https://baitshop.com/ad.jpg',
  is_active: true,
  priority: 1,
  placements: ['home', 'catch_feed'],
  location: 'Outer Banks',
  start_date: '2026-01-01',
  end_date: '2026-03-31',
  click_count: 42,
  impression_count: 1500,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  ...overrides,
});

describe('transformAdvertisement', () => {
  it('maps all snake_case fields to camelCase', () => {
    const result = transformAdvertisement(makeRow());
    expect(result).toEqual({
      id: 'ad-1',
      companyName: 'Bait Shop',
      promoText: '20% off tackle',
      promoCode: 'FISH20',
      linkUrl: 'https://baitshop.com',
      imageUrl: 'https://baitshop.com/ad.jpg',
      isActive: true,
      priority: 1,
      placements: ['home', 'catch_feed'],
      location: 'Outer Banks',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      clickCount: 42,
      impressionCount: 1500,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    });
  });

  it('handles undefined optional fields', () => {
    const result = transformAdvertisement(makeRow({
      promo_code: undefined,
      location: undefined,
      start_date: undefined,
      end_date: undefined,
    }));
    expect(result.promoCode).toBeUndefined();
    expect(result.location).toBeUndefined();
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });
});

describe('transformAdvertisementList', () => {
  it('transforms multiple rows', () => {
    const rows = [makeRow({ id: 'a1' }), makeRow({ id: 'a2' })];
    const result = transformAdvertisementList(rows);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a1');
    expect(result[1].id).toBe('a2');
  });

  it('returns empty array for empty input', () => {
    expect(transformAdvertisementList([])).toEqual([]);
  });
});
