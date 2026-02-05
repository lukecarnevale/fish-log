// utils/deviceId.ts
//
// Shared device ID and UUID generation utilities.
// Used by anonymousUserService and userService.
//

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@device_id';

/**
 * Generate a UUID v4.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a unique device ID.
 * This ID persists across app reinstalls (until user clears app data).
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate a UUID-like device ID
      deviceId = generateUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('Failed to get device ID:', error);
    // Return a temporary ID if storage fails
    return generateUUID();
  }
}
