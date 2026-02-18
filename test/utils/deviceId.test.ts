import { generateUUID, getDeviceId } from '../../src/utils/deviceId';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('generateUUID', () => {
  it('produces valid UUID v4 format', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('sets version digit to 4', () => {
    const uuid = generateUUID();
    expect(uuid[14]).toBe('4');
  });

  it('sets variant bits correctly (8, 9, a, or b)', () => {
    const uuid = generateUUID();
    expect(['8', '9', 'a', 'b']).toContain(uuid[19]);
  });

  it('generates unique UUIDs', () => {
    const uuids = new Set(Array.from({ length: 100 }, () => generateUUID()));
    expect(uuids.size).toBe(100);
  });
});

describe('getDeviceId', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('generates and persists a new device ID', async () => {
    const id = await getDeviceId();
    expect(id).toBeDefined();
    expect(id.length).toBeGreaterThan(0);

    // Should be persisted
    const stored = await AsyncStorage.getItem('@device_id');
    expect(stored).toBe(id);
  });

  it('returns the same ID on subsequent calls', async () => {
    const id1 = await getDeviceId();
    const id2 = await getDeviceId();
    expect(id1).toBe(id2);
  });

  it('returns existing ID from storage', async () => {
    await AsyncStorage.setItem('@device_id', 'existing-device-id');
    const id = await getDeviceId();
    expect(id).toBe('existing-device-id');
  });
});
