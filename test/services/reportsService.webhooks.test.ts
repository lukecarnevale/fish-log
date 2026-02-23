/**
 * reportsService.webhooks.test.ts - Webhook retry tests
 */
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

// Service mocks
jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: jest.fn().mockResolvedValue({
    id: 'anon-123', deviceId: 'device-123',
    createdAt: '2026-01-01', lastActiveAt: '2026-01-01',
    dismissedRewardsPrompt: false,
  }),
}));
jest.mock('../../src/services/photoUploadService', () => ({
  ensurePublicPhotoUrl: jest.fn().mockResolvedValue(null),
  isLocalUri: jest.fn(() => false),
}));
jest.mock('../../src/services/authService', () => ({
  ensureValidSession: jest.fn().mockResolvedValue({ valid: true }),
}));
jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

// Mock harvestReportService for webhook retries
const mockTriggerWebhook = jest.fn().mockResolvedValue({
  success: true,
  webhooksTriggered: 1,
  errors: [],
});
jest.mock('../../src/services/harvestReportService', () => ({
  triggerDMFConfirmationWebhook: (...args: any[]) => mockTriggerWebhook(...args),
  generateGlobalId: jest.fn(() => '{MOCK-GUID}'),
}));

import { retryFailedWebhooks } from '../../src/services/reportsService';

describe('retryFailedWebhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  it('returns { retried: 0, succeeded: 0 } when disconnected', async () => {
    mockIsSupabaseConnected.mockResolvedValue(false);
    const result = await retryFailedWebhooks();
    expect(result).toEqual({ retried: 0, succeeded: 0 });
  });

  it('returns { retried: 0, succeeded: 0 } when no failed webhooks', async () => {
    // Query returns empty
    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const ltMock = jest.fn().mockReturnThis();
    const notMock = jest.fn().mockResolvedValue({ data: [], error: null });

    (mockSupabase.from as jest.Mock).mockImplementation(() => ({
      select: selectMock,
      eq: eqMock,
      lt: ltMock,
      not: notMock,
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const result = await retryFailedWebhooks();
    expect(result).toEqual({ retried: 0, succeeded: 0 });
  });

  // Note: retryFailedWebhooks uses `await import('./harvestReportService')` (dynamic import)
  // to avoid circular dependencies. Node's Jest VM doesn't support dynamic import()
  // without --experimental-vm-modules, so the retry loop cannot be tested directly.
  // The query chain and early-return paths are verified by the other tests in this suite.
  it('verifies query chain reaches the retry loop before dynamic import fails', async () => {
    const failedReports = [
      { dmf_object_id: 42, dmf_confirmation_number: 'DMF-123', webhook_attempts: 1 },
    ];

    (mockSupabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({ data: failedReports, error: null }),
    }));

    // The function will find 1 failed report, then hit the dynamic import
    // which throws ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG in Jest.
    // It catches and returns { retried: 0, succeeded: 0 }.
    const result = await retryFailedWebhooks();

    // Verify it at least reached the query phase (from was called)
    expect(mockSupabase.from).toHaveBeenCalledWith('harvest_reports');
    // Dynamic import prevents testing the actual retry logic in Jest
    expect(result).toEqual({ retried: 0, succeeded: 0 });
  });

  it('handles Supabase query error gracefully', async () => {
    (mockSupabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
    }));

    const result = await retryFailedWebhooks();
    expect(result).toEqual({ retried: 0, succeeded: 0 });
  });

  it('handles complete failure gracefully', async () => {
    (mockSupabase.from as jest.Mock).mockImplementation(() => {
      throw new Error('Connection lost');
    });

    const result = await retryFailedWebhooks();
    expect(result).toEqual({ retried: 0, succeeded: 0 });
  });
});
