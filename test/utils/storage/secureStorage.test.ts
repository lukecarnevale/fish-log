/**
 * secureStorage.test.ts - Secure storage with platform-aware fallback
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import secureStorage, { STORAGE_KEYS } from '../../../src/utils/storage/secureStorage';

describe('SecureStorage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  // ============================================================
  // STORAGE_KEYS
  // ============================================================
  describe('STORAGE_KEYS', () => {
    it('exports expected storage key constants', () => {
      expect(STORAGE_KEYS.USER_PROFILE).toBe('userProfile');
      expect(STORAGE_KEYS.FISHING_LICENSE).toBe('fishingLicense');
      expect(STORAGE_KEYS.FISH_REPORTS).toBe('fishReports');
      expect(STORAGE_KEYS.AUTH_TOKEN).toBe('authToken');
    });
  });

  // ============================================================
  // setItem
  // ============================================================
  describe('setItem', () => {
    it('uses SecureStore on native platforms', async () => {
      (Platform as any).OS = 'ios';
      await secureStorage.setItem('testKey', 'testValue');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('testKey', 'testValue');
    });

    it('uses AsyncStorage on web platform', async () => {
      (Platform as any).OS = 'web';
      await secureStorage.setItem('testKey', 'testValue');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('testKey', 'testValue');
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('falls back to AsyncStorage when SecureStore fails', async () => {
      (Platform as any).OS = 'ios';
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('SecureStore error'));
      await secureStorage.setItem('testKey', 'testValue');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('testKey', 'testValue');
    });
  });

  // ============================================================
  // getItem
  // ============================================================
  describe('getItem', () => {
    it('uses SecureStore on native platforms', async () => {
      (Platform as any).OS = 'android';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('secureValue');
      const result = await secureStorage.getItem('testKey');
      expect(result).toBe('secureValue');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('testKey');
    });

    it('uses AsyncStorage on web platform', async () => {
      (Platform as any).OS = 'web';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('webValue');
      const result = await secureStorage.getItem('testKey');
      expect(result).toBe('webValue');
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('returns null when key does not exist', async () => {
      (Platform as any).OS = 'ios';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const result = await secureStorage.getItem('nonexistent');
      expect(result).toBeNull();
    });

    it('falls back to AsyncStorage when SecureStore fails', async () => {
      (Platform as any).OS = 'ios';
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('SecureStore error'));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('fallbackValue');
      const result = await secureStorage.getItem('testKey');
      expect(result).toBe('fallbackValue');
    });
  });

  // ============================================================
  // removeItem
  // ============================================================
  describe('removeItem', () => {
    it('uses SecureStore on native platforms', async () => {
      (Platform as any).OS = 'ios';
      await secureStorage.removeItem('testKey');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('testKey');
    });

    it('uses AsyncStorage on web platform', async () => {
      (Platform as any).OS = 'web';
      await secureStorage.removeItem('testKey');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('testKey');
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('falls back to AsyncStorage when SecureStore fails', async () => {
      (Platform as any).OS = 'ios';
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error('SecureStore error'));
      await secureStorage.removeItem('testKey');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('testKey');
    });
  });

  // ============================================================
  // setObject / getObject
  // ============================================================
  describe('setObject and getObject', () => {
    it('serializes and deserializes objects', async () => {
      (Platform as any).OS = 'ios';
      const testObj = { name: 'John', age: 30, tags: ['angler'] };

      // setObject calls setItem which calls SecureStore.setItemAsync
      await secureStorage.setObject('profile', testObj);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('profile', JSON.stringify(testObj));

      // getObject calls getItem which calls SecureStore.getItemAsync
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(testObj));
      const result = await secureStorage.getObject<typeof testObj>('profile');
      expect(result).toEqual(testObj);
    });

    it('returns null when key does not exist', async () => {
      (Platform as any).OS = 'ios';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const result = await secureStorage.getObject('nonexistent');
      expect(result).toBeNull();
    });

    it('handles complex nested objects', async () => {
      (Platform as any).OS = 'web';
      const complex = { nested: { deep: { value: 42 } }, list: [1, 2, 3] };
      await secureStorage.setObject('complex', complex);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('complex', JSON.stringify(complex));
    });
  });
});
