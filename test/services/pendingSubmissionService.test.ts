/**
 * pendingSubmissionService.test.ts - Pending rewards submission management
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

import {
  savePendingSubmission,
  getPendingSubmission,
  completePendingSubmission,
  clearPendingSubmission,
  updatePendingDrawingEntry,
  getPendingDrawingId,
} from '../../src/services/pendingSubmissionService';

describe('pendingSubmissionService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
    await AsyncStorage.removeItem('@pending_submission');
  });

  // ============================================================
  // savePendingSubmission
  // ============================================================
  describe('savePendingSubmission', () => {
    it('saves via Supabase RPC when connected', async () => {
      const submissionData = {
        id: 'sub-1',
        device_id: 'device-123',
        email: 'test@example.com',
        status: 'pending',
        form_data: { firstName: 'Test' },
        created_at: '2026-01-01',
        expires_at: '2026-01-08',
      };

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: submissionData,
        error: null,
      });

      const result = await savePendingSubmission({
        email: 'test@example.com',
        formData: { firstName: 'Test' },
      } as any);

      expect(result.success).toBe(true);
    });

    it('falls back to local storage when Supabase fails', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);

      const result = await savePendingSubmission({
        email: 'test@example.com',
        formData: { firstName: 'Test' },
      } as any);

      expect(result.success).toBe(true);
      // Local IDs start with 'local_'
      expect(result.submission?.id).toMatch(/^local_/);
    });
  });

  // ============================================================
  // getPendingSubmission
  // ============================================================
  describe('getPendingSubmission', () => {
    it('returns cached submission when available', async () => {
      const cached = {
        id: 'sub-1',
        deviceId: 'device-123',
        email: 'test@example.com',
        status: 'pending',
        formData: { firstName: 'Test' },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await AsyncStorage.setItem('@pending_submission', JSON.stringify(cached));

      const result = await getPendingSubmission();
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('returns null when no submission exists', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await getPendingSubmission();
      expect(result).toBeNull();
    });

    it('clears expired local submissions', async () => {
      const expired = {
        id: 'local_device-123',
        deviceId: 'device-123',
        status: 'pending',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await AsyncStorage.setItem('@pending_submission', JSON.stringify(expired));

      const result = await getPendingSubmission();
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // completePendingSubmission
  // ============================================================
  describe('completePendingSubmission', () => {
    it('clears local cache', async () => {
      await AsyncStorage.setItem('@pending_submission', JSON.stringify({
        id: 'local_device-123',
        status: 'pending',
      }));

      await completePendingSubmission('local_device-123');

      const cached = await AsyncStorage.getItem('@pending_submission');
      expect(cached).toBeNull();
    });

    it('updates Supabase for non-local IDs', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      }));

      await completePendingSubmission('sub-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('pending_submissions');
    });
  });

  // ============================================================
  // clearPendingSubmission
  // ============================================================
  describe('clearPendingSubmission', () => {
    it('clears local cache', async () => {
      await AsyncStorage.setItem('@pending_submission', JSON.stringify({
        id: 'local_123',
      }));

      await clearPendingSubmission();
      expect(await AsyncStorage.getItem('@pending_submission')).toBeNull();
    });
  });

  // ============================================================
  // getPendingDrawingId
  // ============================================================
  describe('getPendingDrawingId', () => {
    it('returns drawingId from pending submission', async () => {
      await AsyncStorage.setItem('@pending_submission', JSON.stringify({
        id: 'sub-1',
        formData: { drawingId: 'draw-1' },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const drawingId = await getPendingDrawingId();
      expect(drawingId).toBe('draw-1');
    });

    it('returns null when no pending submission', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const drawingId = await getPendingDrawingId();
      expect(drawingId).toBeNull();
    });
  });

  // ============================================================
  // updatePendingDrawingEntry
  // ============================================================
  describe('updatePendingDrawingEntry', () => {
    it('returns false when no pending submission exists', async () => {
      mockIsSupabaseConnected.mockResolvedValue(false);
      const result = await updatePendingDrawingEntry('draw-1');
      expect(result).toBe(false);
    });

    it('updates drawingId in local cache', async () => {
      await AsyncStorage.setItem('@pending_submission', JSON.stringify({
        id: 'local_123',
        formData: {},
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const result = await updatePendingDrawingEntry('draw-new');
      expect(result).toBe(true);

      const cached = JSON.parse((await AsyncStorage.getItem('@pending_submission'))!);
      expect(cached.formData.drawingId).toBe('draw-new');
    });
  });
});
