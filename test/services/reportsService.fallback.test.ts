/**
 * reportsService.fallback.test.ts - Triple-path submission fallback chain
 *
 * Tests the createReportFromHarvestInput fallback:
 * 1. Authenticated RPC (create_report_atomic) -> rewards members
 * 2. Anonymous RPC (create_report_anonymous) -> fallback or anonymous users
 * 3. Offline storage -> when both RPCs fail
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';
import { makeHarvestInput, makeUser } from '../factories';

// Service mocks
const mockGetOrCreateAnonymousUser = jest.fn().mockResolvedValue({
  id: 'anon-user-123', deviceId: 'device-123',
  createdAt: '2026-01-01T00:00:00.000Z', lastActiveAt: '2026-01-01T00:00:00.000Z',
  dismissedRewardsPrompt: false,
});

const mockGetRewardsMemberForAnonymousUser = jest.fn().mockResolvedValue(null);
const mockEnsureValidSession = jest.fn().mockResolvedValue({ valid: true, authUserId: 'auth-123' });
const mockFetchCurrentDrawing = jest.fn().mockResolvedValue(null);

jest.mock('../../src/services/userProfileService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: (...args: any[]) => mockGetRewardsMemberForAnonymousUser(...args),
}));
jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: (...args: any[]) => mockGetOrCreateAnonymousUser(...args),
}));
jest.mock('../../src/services/photoUploadService', () => ({
  ensurePublicPhotoUrl: jest.fn().mockResolvedValue(null),
  isLocalUri: jest.fn(() => false),
}));
jest.mock('../../src/services/authService', () => ({
  ensureValidSession: (...args: any[]) => mockEnsureValidSession(...args),
}));
jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

import { createReportFromHarvestInput } from '../../src/services/reportsService';

describe('createReportFromHarvestInput fallback chain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    mockGetRewardsMemberForAnonymousUser.mockResolvedValue(null);
    mockEnsureValidSession.mockResolvedValue({ valid: true, authUserId: 'auth-123' });
    mockFetchCurrentDrawing.mockResolvedValue(null);

    // Default successful RPC
    (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
      data: {
        report_id: 'sb-report-1',
        dmf_status: 'pending',
        anonymous_user_id: 'anon-user-123',
        created_at: '2026-01-15T00:00:00.000Z',
      },
      error: null,
    });
  });

  it('uses anonymous path for anonymous user (no rewards member)', async () => {
    const input = makeHarvestInput();
    const result = await createReportFromHarvestInput(input);

    expect(result.success).toBe(true);
    expect(result.savedToSupabase).toBe(true);

    // Should have called create_report_anonymous (not create_report_atomic)
    expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
      'create_report_anonymous',
      expect.objectContaining({
        p_device_id: 'device-123',
      })
    );
  });

  it('uses authenticated path for rewards member', async () => {
    const member = makeUser({ id: 'user-1', rewardsOptedInAt: '2026-01-01' });
    mockGetRewardsMemberForAnonymousUser.mockResolvedValue(member);

    const input = makeHarvestInput();
    const result = await createReportFromHarvestInput(input);

    expect(result.success).toBe(true);
    // Should have called create_report_atomic first
    expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
      'create_report_atomic',
      expect.objectContaining({
        p_input: expect.objectContaining({
          user_id: 'user-1',
        }),
      })
    );
  });

  it('falls back to anonymous path when authenticated RPC returns auth error', async () => {
    const member = makeUser({ id: 'user-1', rewardsOptedInAt: '2026-01-01' });
    mockGetRewardsMemberForAnonymousUser.mockResolvedValue(member);

    // First call (create_report_atomic) fails with auth error
    // Second call (create_report_anonymous) succeeds
    (mockSupabase as any).rpc = jest.fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Unauthorized: JWT expired' },
      })
      .mockResolvedValueOnce({
        data: {
          report_id: 'sb-anon-report',
          dmf_status: 'pending',
          anonymous_user_id: 'anon-user-123',
          created_at: '2026-01-15T00:00:00.000Z',
        },
        error: null,
      });

    const input = makeHarvestInput();
    const result = await createReportFromHarvestInput(input);

    expect(result.success).toBe(true);
    expect(result.savedToSupabase).toBe(true);
    // Both RPCs should have been called
    expect((mockSupabase as any).rpc).toHaveBeenCalledTimes(2);
    expect((mockSupabase as any).rpc).toHaveBeenNthCalledWith(1, 'create_report_atomic', expect.anything());
    expect((mockSupabase as any).rpc).toHaveBeenNthCalledWith(2, 'create_report_anonymous', expect.anything());
  });

  it('does NOT fall back to anonymous for non-auth errors (throws)', async () => {
    const member = makeUser({ id: 'user-1', rewardsOptedInAt: '2026-01-01' });
    mockGetRewardsMemberForAnonymousUser.mockResolvedValue(member);

    // Non-auth error (unique violation)
    (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    });

    const input = makeHarvestInput();
    const result = await createReportFromHarvestInput(input);

    // Should fall back to local save (not try anonymous RPC)
    expect(result.success).toBe(true);
    expect(result.savedToSupabase).toBe(false);
    expect((mockSupabase as any).rpc).toHaveBeenCalledTimes(1);
  });

  it('falls back to offline when session is invalid', async () => {
    const member = makeUser({ id: 'user-1', rewardsOptedInAt: '2026-01-01' });
    mockGetRewardsMemberForAnonymousUser.mockResolvedValue(member);
    mockEnsureValidSession.mockResolvedValue({ valid: false, reason: 'no_session' });

    // Anonymous path also fails
    (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const input = makeHarvestInput();
    const result = await createReportFromHarvestInput(input);

    expect(result.success).toBe(true);
    expect(result.savedToSupabase).toBe(false);
    expect(result.report.id).toMatch(/^local_/);
  });

  it('falls back to offline when completely disconnected', async () => {
    mockIsSupabaseConnected.mockResolvedValue(false);

    const input = makeHarvestInput();
    const result = await createReportFromHarvestInput(input);

    expect(result.success).toBe(true);
    expect(result.savedToSupabase).toBe(false);
    expect(result.supabaseError).toBe('No connection to Supabase');
  });

  it('uses cached rewards user when getRewardsMemberForAnonymousUser returns null', async () => {
    // Simulate cached rewards user in AsyncStorage
    const cachedUser = { id: 'cached-user-1', rewardsOptedInAt: '2026-01-01' };
    await AsyncStorage.setItem('@current_user', JSON.stringify(cachedUser));

    const input = makeHarvestInput();
    await createReportFromHarvestInput(input);

    // Should use the cached user's ID
    expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
      'create_report_atomic',
      expect.objectContaining({
        p_input: expect.objectContaining({
          user_id: 'cached-user-1',
        }),
      })
    );
  });

  it('includes DMF result data when provided', async () => {
    const input = makeHarvestInput();
    const dmfResult = {
      confirmationNumber: 'DMF-12345',
      objectId: 42,
      submittedAt: '2026-01-15T12:00:00.000Z',
    };

    await createReportFromHarvestInput(input, dmfResult);

    const rpcInput = (mockSupabase as any).rpc.mock.calls[0][1].p_input;
    expect(rpcInput.dmf_confirmation_number).toBe('DMF-12345');
    expect(rpcInput.dmf_object_id).toBe(42);
    expect(rpcInput.dmf_status).toBe('submitted');
  });

  it('sets dmf_status to pending when no confirmation number', async () => {
    const input = makeHarvestInput();
    await createReportFromHarvestInput(input, {});

    const rpcInput = (mockSupabase as any).rpc.mock.calls[0][1].p_input;
    expect(rpcInput.dmf_status).toBe('pending');
  });
});
