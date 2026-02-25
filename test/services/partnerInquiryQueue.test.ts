import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getInquiryQueue,
  getSubmittedInquiries,
  checkRateLimit,
  isDuplicateInquiry,
  addToInquiryQueue,
  syncInquiryQueue,
  clearInquiryQueue,
  QueuedInquiry,
} from '../../src/services/partnerInquiryQueue';
import type { PartnerInquiry } from '../../src/types/partnerInquiry';

const makeInquiry = (overrides?: Partial<PartnerInquiry>): PartnerInquiry => ({
  businessName: 'Test Bait Shop',
  contactName: 'John Doe',
  email: 'john@test.com',
  businessType: 'gear_shop',
  areaCodes: ['OBX'],
  message: 'We want to advertise our bait and tackle to NC anglers.',
  ...overrides,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('getInquiryQueue', () => {
  it('returns empty array when no queue exists', async () => {
    const queue = await getInquiryQueue();
    expect(queue).toEqual([]);
  });

  it('returns stored queue items', async () => {
    const items = [{ localId: 'test-1', inquiry: makeInquiry(), queuedAt: new Date().toISOString(), retryCount: 0 }];
    await AsyncStorage.setItem('@partner_inquiry_queue', JSON.stringify(items));
    const queue = await getInquiryQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].localId).toBe('test-1');
  });
});

describe('getSubmittedInquiries', () => {
  it('returns empty array when no history exists', async () => {
    const history = await getSubmittedInquiries();
    expect(history).toEqual([]);
  });
});

describe('checkRateLimit', () => {
  it('allows first inquiry from an email', async () => {
    const result = await checkRateLimit('new@test.com');
    expect(result.allowed).toBe(true);
  });

  it('blocks duplicate email within 24 hours', async () => {
    // Add an entry to the queue with the same email
    const items = [{
      localId: 'q1',
      inquiry: makeInquiry({ email: 'repeat@test.com' }),
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    }];
    await AsyncStorage.setItem('@partner_inquiry_queue', JSON.stringify(items));

    const result = await checkRateLimit('repeat@test.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('24 hours');
  });

  it('allows email after 24 hours have passed', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const items = [{
      localId: 'q1',
      inquiry: makeInquiry({ email: 'old@test.com' }),
      queuedAt: oldDate,
      retryCount: 0,
    }];
    await AsyncStorage.setItem('@partner_inquiry_queue', JSON.stringify(items));

    const result = await checkRateLimit('old@test.com');
    expect(result.allowed).toBe(true);
  });

  it('blocks when 5 total inquiries in last hour', async () => {
    const recentItems = Array.from({ length: 5 }, (_, i) => ({
      localId: `q${i}`,
      inquiry: makeInquiry({ email: `user${i}@test.com` }),
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    }));
    await AsyncStorage.setItem('@partner_inquiry_queue', JSON.stringify(recentItems));

    const result = await checkRateLimit('newuser@test.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('hour');
  });

  it('is case-insensitive for email check', async () => {
    const items = [{
      localId: 'q1',
      inquiry: makeInquiry({ email: 'John@Test.com' }),
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    }];
    await AsyncStorage.setItem('@partner_inquiry_queue', JSON.stringify(items));

    const result = await checkRateLimit('john@test.com');
    expect(result.allowed).toBe(false);
  });
});

describe('isDuplicateInquiry', () => {
  it('detects duplicate by email + businessName', () => {
    const queue: QueuedInquiry[] = [{
      localId: 'q1',
      inquiry: makeInquiry({ email: 'john@test.com', businessName: 'Test Shop' }),
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    }];
    const result = isDuplicateInquiry(makeInquiry({ email: 'john@test.com', businessName: 'Test Shop' }), queue);
    expect(result).toBe(true);
  });

  it('is case-insensitive', () => {
    const queue: QueuedInquiry[] = [{
      localId: 'q1',
      inquiry: makeInquiry({ email: 'JOHN@TEST.COM', businessName: 'TEST SHOP' }),
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    }];
    const result = isDuplicateInquiry(makeInquiry({ email: 'john@test.com', businessName: 'test shop' }), queue);
    expect(result).toBe(true);
  });

  it('returns false for different email', () => {
    const queue: QueuedInquiry[] = [{
      localId: 'q1',
      inquiry: makeInquiry({ email: 'other@test.com' }),
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    }];
    const result = isDuplicateInquiry(makeInquiry({ email: 'john@test.com' }), queue);
    expect(result).toBe(false);
  });
});

describe('addToInquiryQueue', () => {
  it('adds inquiry to queue successfully', async () => {
    const result = await addToInquiryQueue(makeInquiry());
    expect(result.success).toBe(true);
    expect(result.queued).toBe(true);

    const queue = await getInquiryQueue();
    expect(queue).toHaveLength(1);
  });

  it('rejects duplicate inquiry (rate limit on same email)', async () => {
    await addToInquiryQueue(makeInquiry());
    const result = await addToInquiryQueue(makeInquiry());
    expect(result.success).toBe(false);
    expect(result.error).toContain('24 hours');
  });
});

describe('syncInquiryQueue', () => {
  it('syncs queued items using submit function', async () => {
    await addToInquiryQueue(makeInquiry({ email: 'sync1@test.com' }));
    
    const submitFn = jest.fn().mockResolvedValue({ success: true });
    const result = await syncInquiryQueue(submitFn);

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(submitFn).toHaveBeenCalledTimes(1);

    // Queue should be empty after sync
    const queue = await getInquiryQueue();
    expect(queue).toHaveLength(0);
  });

  it('retries failed items', async () => {
    await addToInquiryQueue(makeInquiry({ email: 'fail@test.com' }));

    const submitFn = jest.fn().mockResolvedValue({ success: false, error: 'Server error' });
    const result = await syncInquiryQueue(submitFn);

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0); // Not failed yet — still has retries left

    const queue = await getInquiryQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].retryCount).toBe(1);
  });

  it('removes items after max retries', async () => {
    // Manually set an item with 2 retries already
    const items = [{
      localId: 'q1',
      inquiry: makeInquiry({ email: 'maxretry@test.com' }),
      queuedAt: new Date().toISOString(),
      retryCount: 2,
    }];
    await AsyncStorage.setItem('@partner_inquiry_queue', JSON.stringify(items));

    const submitFn = jest.fn().mockResolvedValue({ success: false, error: 'Still failing' });
    const result = await syncInquiryQueue(submitFn);

    expect(result.failed).toBe(1);
    const queue = await getInquiryQueue();
    expect(queue).toHaveLength(0);
  });
});

describe('clearInquiryQueue', () => {
  it('clears both queue and history', async () => {
    await addToInquiryQueue(makeInquiry());
    await clearInquiryQueue();

    const queue = await getInquiryQueue();
    const history = await getSubmittedInquiries();
    expect(queue).toEqual([]);
    expect(history).toEqual([]);
  });
});
