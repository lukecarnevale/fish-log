/**
 * feedbackService.test.ts - Feedback submission and retrieval
 */
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

jest.mock('../../src/services/anonymousUserService', () => ({
  getOrCreateAnonymousUser: jest.fn().mockResolvedValue({
    id: 'anon-123',
    deviceId: 'device-123',
    createdAt: '2026-01-01',
    lastActiveAt: '2026-01-01',
    dismissedRewardsPrompt: false,
  }),
}));

jest.mock('../../src/services/rewardsConversionService', () => ({
  getRewardsMemberForAnonymousUser: jest.fn().mockResolvedValue(null),
}));

import {
  submitFeedback,
  sendFeedback,
  reportBug,
  requestFeature,
  getMyFeedback,
} from '../../src/services/feedbackService';

describe('feedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  // ============================================================
  // submitFeedback
  // ============================================================
  describe('submitFeedback', () => {
    it('submits feedback via RPC when connected', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: { id: 'fb-1', type: 'feedback', message: 'Great app!' },
        error: null,
      });

      const result = await submitFeedback({
        type: 'feedback',
        message: 'Great app!',
      });

      expect(result.success).toBe(true);
      expect(result.feedbackId).toBeDefined();
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'submit_feedback_rpc',
        expect.objectContaining({
          p_input: expect.objectContaining({
            type: 'feedback',
            message: 'Great app!',
            anonymous_user_id: 'anon-123',
          }),
        })
      );
    });

    it('sets user_id to null for anonymous users', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: { id: 'fb-2' },
        error: null,
      });

      await submitFeedback({ type: 'feedback', message: 'Test' });

      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'submit_feedback_rpc',
        expect.objectContaining({
          p_input: expect.objectContaining({
            user_id: null,
          }),
        })
      );
    });

    it('returns error when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await submitFeedback({
        type: 'feedback',
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles RPC error', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const result = await submitFeedback({
        type: 'feedback',
        message: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // Convenience wrappers
  // ============================================================
  describe('sendFeedback', () => {
    it('wraps submitFeedback with type=feedback', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: { id: 'fb-3' },
        error: null,
      });

      const result = await sendFeedback('Nice!');
      expect(result.success).toBe(true);
    });
  });

  describe('reportBug', () => {
    it('wraps submitFeedback with type=bug_report', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: { id: 'fb-4' },
        error: null,
      });

      const result = await reportBug('Something broke');
      expect(result.success).toBe(true);
    });
  });

  describe('requestFeature', () => {
    it('wraps submitFeedback with type=feature_request', async () => {
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: { id: 'fb-5' },
        error: null,
      });

      const result = await requestFeature('Add dark mode');
      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // getMyFeedback
  // ============================================================
  describe('getMyFeedback', () => {
    it('returns empty array when not connected', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const feedback = await getMyFeedback();
      expect(feedback).toEqual([]);
    });
  });
});
