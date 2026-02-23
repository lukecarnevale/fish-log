/**
 * userService.test.ts - User CRUD operations
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, mockIsSupabaseConnected } from '../mocks/supabase';

jest.mock('../../src/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

import {
  findUserByDeviceId,
  findUserByEmail,
  createUserInSupabase,
  clearUserCache,
  clearAllUserData,
} from '../../src/services/userService';

function chainMock(resolveWith: any = { data: null, error: null }) {
  const chain: any = {};
  const self = () => chain;
  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'limit', 'single', 'maybeSingle', 'order'].forEach(m => {
    chain[m] = jest.fn(self);
  });
  chain.single = jest.fn().mockResolvedValue(resolveWith);
  chain.maybeSingle = jest.fn().mockResolvedValue(resolveWith);
  return chain;
}

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConnected.mockResolvedValue(true);
  });

  // ============================================================
  // findUserByDeviceId
  // ============================================================
  describe('findUserByDeviceId', () => {
    it('returns transformed user when found', async () => {
      const dbUser = {
        id: 'user-1',
        device_id: 'device-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'Angler',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      (mockSupabase.from as jest.Mock).mockImplementation(() =>
        chainMock({ data: dbUser, error: null })
      );

      const user = await findUserByDeviceId('device-123');
      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('returns null on PGRST116 (no rows)', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() =>
        chainMock({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
      );

      const user = await findUserByDeviceId('device-999');
      expect(user).toBeNull();
    });

    it('throws on other errors', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() =>
        chainMock({ data: null, error: { code: '42P01', message: 'Table not found' } })
      );

      await expect(findUserByDeviceId('device-123')).rejects.toThrow();
    });
  });

  // ============================================================
  // findUserByEmail
  // ============================================================
  describe('findUserByEmail', () => {
    it('lowercases email before querying', async () => {
      const eqMock = jest.fn().mockReturnThis();
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01', updated_at: '2026-01-01' },
          error: null,
        }),
      }));

      await findUserByEmail('TEST@Example.COM');
      expect(eqMock).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('returns null on PGRST116', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() =>
        chainMock({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
      );

      const user = await findUserByEmail('nobody@example.com');
      expect(user).toBeNull();
    });
  });

  // ============================================================
  // createUserInSupabase
  // ============================================================
  describe('createUserInSupabase', () => {
    it('inserts user and returns transformed result', async () => {
      const dbUser = {
        id: 'user-new',
        device_id: 'device-123',
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: dbUser, error: null }),
      }));

      const user = await createUserInSupabase({
        deviceId: 'device-123',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      } as any);

      expect(user.id).toBe('user-new');
    });

    it('throws on insert error', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Duplicate key' },
        }),
      }));

      await expect(
        createUserInSupabase({ deviceId: 'device-123' } as any)
      ).rejects.toThrow('Duplicate key');
    });
  });

  // ============================================================
  // clearUserCache
  // ============================================================
  describe('clearUserCache', () => {
    it('removes user-related keys from AsyncStorage', async () => {
      await AsyncStorage.setItem('@current_user', JSON.stringify({ id: 'u1' }));
      await AsyncStorage.setItem('@user_stats', JSON.stringify({ reports: 5 }));

      await clearUserCache();

      expect(await AsyncStorage.getItem('@current_user')).toBeNull();
      expect(await AsyncStorage.getItem('@user_stats')).toBeNull();
    });
  });

  // ============================================================
  // clearAllUserData
  // ============================================================
  describe('clearAllUserData', () => {
    it('removes all user data keys', async () => {
      const keys = [
        '@current_user',
        '@user_stats',
        'userProfile',
        'fishingLicense',
        '@pending_auth',
        '@catch_feed_cache',
      ];
      for (const key of keys) {
        await AsyncStorage.setItem(key, 'data');
      }

      await clearAllUserData();

      for (const key of keys) {
        expect(await AsyncStorage.getItem(key)).toBeNull();
      }
    });
  });
});
