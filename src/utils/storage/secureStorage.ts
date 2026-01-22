import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Keys for our stored data
export const STORAGE_KEYS = {
  USER_PROFILE: 'userProfile',
  FISHING_LICENSE: 'fishingLicense',
  FISH_REPORTS: 'fishReports',
  AUTH_TOKEN: 'authToken',
};

/**
 * SecureStorage utility
 * 
 * Provides secure storage for sensitive information with fallback to AsyncStorage
 * for web or when secure storage is not available.
 */
class SecureStorage {
  /**
   * Store data securely
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Fallback for web
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error('Error storing data securely:', error);
      // Fallback to AsyncStorage if SecureStore fails
      await AsyncStorage.setItem(key, value);
    }
  }

  /**
   * Retrieve secure data
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Fallback for web
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error('Error retrieving secure data:', error);
      // Fallback to AsyncStorage if SecureStore fails
      return await AsyncStorage.getItem(key);
    }
  }

  /**
   * Delete secure data
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Fallback for web
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error('Error removing secure data:', error);
      // Fallback to AsyncStorage if SecureStore fails
      await AsyncStorage.removeItem(key);
    }
  }

  /**
   * Store object data (automatically handles JSON serialization)
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    const jsonValue = JSON.stringify(value);
    await this.setItem(key, jsonValue);
  }

  /**
   * Get object data (automatically handles JSON parsing)
   */
  async getObject<T>(key: string): Promise<T | null> {
    const jsonValue = await this.getItem(key);
    return jsonValue !== null ? JSON.parse(jsonValue) as T : null;
  }
}

export default new SecureStorage();