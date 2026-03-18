/**
 * Comprehensive tests for promotionsService.
 * Tests fetch logic, offline fallback, safe transforms, date filtering,
 * submission validation, and error mapping.
 */

import { fetchPromotions, submitPartnerInquiry, getCategoryLabel, getCategoryIcon } from '../../src/services/promotionsService';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';
import { makeSupabaseAdvertisementRow, makePartnerInquiry } from '../factories';

// Supabase mock is already wired in jest.setup.ts

// Build a chainable query mock that returns data at the end
function mockQuery(data: any[] | null, error: any = null, count: number | null = null) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
  };
  // Make the chain thenable so await resolves it
  chain.then = (resolve: Function) => resolve({ data, error, count });
  mockSupabase.from.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsSupabaseConnected.mockResolvedValue(true);
});

describe('fetchPromotions', () => {
  it('returns promotions from Supabase when connected', async () => {
    const rows = [
      makeSupabaseAdvertisementRow({ id: 'p1', image_url: 'https://img.com/1.jpg' }),
      makeSupabaseAdvertisementRow({ id: 'p2', image_url: 'https://img.com/2.jpg' }),
    ];
    mockQuery(rows, null, 2);

    const result = await fetchPromotions();

    expect(result.fromCache).toBe(false);
    expect(result.promotions).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('filters by area when provided', async () => {
    const chain = mockQuery([makeSupabaseAdvertisementRow({ image_url: 'https://img.com/1.jpg' })], null, 1);

    await fetchPromotions({ area: 'OBX' });

    expect(chain.contains).toHaveBeenCalledWith('area_codes', ['OBX']);
  });

  it('filters by category when provided', async () => {
    const chain = mockQuery([makeSupabaseAdvertisementRow({ image_url: 'https://img.com/1.jpg', category: 'charter' })], null, 1);

    await fetchPromotions({ category: 'charter' });

    expect(chain.eq).toHaveBeenCalledWith('category', 'charter');
  });

  it('falls back to local data when offline', async () => {
    mockIsSupabaseConnected.mockResolvedValue(false);

    const result = await fetchPromotions();

    expect(result.fromCache).toBe(true);
    expect(result.promotions.length).toBeGreaterThanOrEqual(0);
  });

  it('falls back to local data on Supabase error', async () => {
    mockQuery(null, { message: 'Connection refused' });

    const result = await fetchPromotions();

    expect(result.fromCache).toBe(true);
  });

  it('skips invalid rows via safe transform and still returns valid ones', async () => {
    const rows = [
      makeSupabaseAdvertisementRow({ id: 'good', image_url: 'https://img.com/g.jpg' }),
      { id: '', company_name: '' }, // invalid — will be filtered
    ];
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockQuery(rows, null, 2);

    const result = await fetchPromotions();

    expect(result.promotions.length).toBeGreaterThanOrEqual(1);
    consoleSpy.mockRestore();
  });

  it('filters expired promotions by date', async () => {
    const expired = makeSupabaseAdvertisementRow({
      id: 'expired',
      image_url: 'https://img.com/e.jpg',
      start_date: '2020-01-01',
      end_date: '2020-12-31',
    });
    const active = makeSupabaseAdvertisementRow({
      id: 'active',
      image_url: 'https://img.com/a.jpg',
      start_date: '2020-01-01',
      end_date: '2099-12-31',
    });
    mockQuery([expired, active], null, 2);

    const result = await fetchPromotions();

    expect(result.promotions.some(p => p.id === 'active')).toBe(true);
    expect(result.promotions.some(p => p.id === 'expired')).toBe(false);
  });

  it('includes promotions with no date constraints', async () => {
    const noDate = makeSupabaseAdvertisementRow({
      id: 'evergreen',
      image_url: 'https://img.com/ev.jpg',
      start_date: null,
      end_date: null,
    });
    mockQuery([noDate], null, 1);

    const result = await fetchPromotions();

    expect(result.promotions.some(p => p.id === 'evergreen')).toBe(true);
  });

  it('includes promotions with future end date', async () => {
    const future = makeSupabaseAdvertisementRow({
      id: 'future',
      image_url: 'https://img.com/f.jpg',
      start_date: '2020-01-01',
      end_date: '2099-12-31',
    });
    mockQuery([future], null, 1);

    const result = await fetchPromotions();

    expect(result.promotions).toHaveLength(1);
  });

  it('falls back to local data when all transforms fail', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockQuery([{ id: '', company_name: '' }], null, 1);

    const result = await fetchPromotions();

    expect(result.fromCache).toBe(true);
    consoleSpy.mockRestore();
  });

  it('detects placeholder URLs and falls back to local data', async () => {
    const placeholder = makeSupabaseAdvertisementRow({
      image_url: 'https://your-supabase-url.com/placeholder.jpg',
    });
    mockQuery([placeholder], null, 1);

    const result = await fetchPromotions();

    expect(result.fromCache).toBe(true);
  });

  it('applies limit and offset when provided', async () => {
    const chain = mockQuery([], null, 0);

    await fetchPromotions({ limit: 10, offset: 20 });

    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.range).toHaveBeenCalledWith(20, 29);
  });

  it('returns empty from Supabase when no promotions match and falls back', async () => {
    mockQuery([], null, 0);

    const result = await fetchPromotions();

    // Empty Supabase result falls through to local data
    expect(result.fromCache).toBe(true);
  });
});

describe('submitPartnerInquiry', () => {
  it('rejects invalid inquiry (missing required fields)', async () => {
    const invalid = makePartnerInquiry({ email: 'not-an-email' });

    const result = await submitPartnerInquiry(invalid);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects inquiry with empty message', async () => {
    const result = await submitPartnerInquiry(makePartnerInquiry({ message: '' }));

    expect(result.success).toBe(false);
  });

  it('queues inquiry when offline', async () => {
    mockIsSupabaseConnected.mockResolvedValue(false);

    const result = await submitPartnerInquiry(makePartnerInquiry());

    expect(result.success).toBe(true);
  });

  it('submits to Supabase when connected', async () => {
    const chain: any = {
      insert: jest.fn().mockReturnThis(),
    };
    chain.then = (resolve: Function) => resolve({ error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await submitPartnerInquiry(makePartnerInquiry());

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledTimes(1);
  });

  it('maps duplicate email error to user-friendly message', async () => {
    const chain: any = {
      insert: jest.fn().mockReturnThis(),
    };
    chain.then = (resolve: Function) => resolve({ error: { code: '23505', message: 'duplicate' } });
    mockSupabase.from.mockReturnValue(chain);

    const result = await submitPartnerInquiry(makePartnerInquiry());

    expect(result.success).toBe(false);
    expect(result.error).toContain('already submitted');
  });

  it('queues on network error for retry', async () => {
    const chain: any = {
      insert: jest.fn().mockReturnThis(),
    };
    chain.then = (resolve: Function) => resolve({ error: { message: 'network error' } });
    mockSupabase.from.mockReturnValue(chain);

    const result = await submitPartnerInquiry(makePartnerInquiry());

    // Network errors should queue for retry
    expect(result.success).toBe(true);
  });
});
