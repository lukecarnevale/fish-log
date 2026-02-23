import { configureStore } from '@reduxjs/toolkit';
import licenseReducer, {
  fetchLicense,
  saveLicense,
  setLicense,
  clearLicense,
  updateLicenseField,
} from '../../src/store/slices/licenseSlice';
import secureStorage from '../../src/utils/storage/secureStorage';

// Mock secureStorage
jest.mock('../../src/utils/storage/secureStorage', () => ({
  __esModule: true,
  default: {
    getObject: jest.fn(),
    setObject: jest.fn(),
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  STORAGE_KEYS: {
    USER_PROFILE: 'userProfile',
    FISHING_LICENSE: 'fishingLicense',
    FISH_REPORTS: 'fishReports',
    AUTH_TOKEN: 'authToken',
  },
}));

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;

function createStore() {
  return configureStore({
    reducer: { license: licenseReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
}

describe('licenseSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with null license and idle status', () => {
      const store = createStore();
      const state = store.getState().license;
      expect(state.license).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
    });
  });

  describe('synchronous reducers', () => {
    it('setLicense sets the license', () => {
      const store = createStore();
      const license = { licenseNumber: 'NC12345', licenseType: 'recreational' };

      store.dispatch(setLicense(license as any));

      expect(store.getState().license.license).toEqual(license);
    });

    it('clearLicense resets license to null', () => {
      const store = createStore();
      store.dispatch(setLicense({ licenseNumber: 'NC12345' } as any));
      store.dispatch(clearLicense());

      expect(store.getState().license.license).toBeNull();
    });

    it('updateLicenseField merges partial updates and sets updatedAt', () => {
      const store = createStore();
      store.dispatch(setLicense({ licenseNumber: 'NC12345', licenseType: 'recreational' } as any));
      store.dispatch(updateLicenseField({ licenseNumber: 'NC99999' }));

      const license = store.getState().license.license;
      expect(license?.licenseNumber).toBe('NC99999');
      expect(license?.licenseType).toBe('recreational');
      expect(license?.updatedAt).toBeDefined();
    });

    it('updateLicenseField does nothing if license is null', () => {
      const store = createStore();
      store.dispatch(updateLicenseField({ licenseNumber: 'NC99999' }));

      expect(store.getState().license.license).toBeNull();
    });
  });

  describe('fetchLicense', () => {
    it('loads license from secure storage', async () => {
      const stored = { licenseNumber: 'NC12345', licenseType: 'recreational' };
      mockSecureStorage.getObject.mockResolvedValue(stored);

      const store = createStore();
      await store.dispatch(fetchLicense());

      expect(store.getState().license.license).toEqual(stored);
      expect(store.getState().license.status).toBe('succeeded');
    });

    it('handles null storage value', async () => {
      mockSecureStorage.getObject.mockResolvedValue(null);

      const store = createStore();
      await store.dispatch(fetchLicense());

      expect(store.getState().license.license).toBeNull();
      expect(store.getState().license.status).toBe('succeeded');
    });

    it('sets error on failure', async () => {
      mockSecureStorage.getObject.mockRejectedValue(new Error('Read error'));

      const store = createStore();
      await store.dispatch(fetchLicense());

      expect(store.getState().license.status).toBe('failed');
      expect(store.getState().license.error).toBe('Failed to load fishing license');
    });
  });

  describe('saveLicense', () => {
    it('saves license with generated id if missing', async () => {
      mockSecureStorage.setObject.mockResolvedValue(undefined);

      const store = createStore();
      await store.dispatch(saveLicense({ licenseNumber: 'NC12345' } as any));

      const saved = store.getState().license.license;
      expect(saved?.id).toBeDefined();
      expect(saved?.licenseNumber).toBe('NC12345');
      expect(saved?.createdAt).toBeDefined();
      expect(saved?.updatedAt).toBeDefined();
    });

    it('preserves existing id', async () => {
      mockSecureStorage.setObject.mockResolvedValue(undefined);

      const store = createStore();
      await store.dispatch(saveLicense({ id: 'existing-id', licenseNumber: 'NC12345' } as any));

      expect(store.getState().license.license?.id).toBe('existing-id');
    });

    it('sets error on save failure', async () => {
      mockSecureStorage.setObject.mockRejectedValue(new Error('Write error'));

      const store = createStore();
      const result = await store.dispatch(saveLicense({ licenseNumber: 'NC12345' } as any));

      expect(result.type).toBe('license/save/rejected');
      expect(store.getState().license.status).toBe('failed');
    });
  });
});
