import { configureStore } from '@reduxjs/toolkit';
import userReducer, {
  fetchUserProfile,
  saveUserProfile,
  setUserProfile,
  clearUserProfile,
  updateUserField,
} from '../../src/store/slices/userSlice';
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
    reducer: { user: userReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
}

describe('userSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with null profile and idle status', () => {
      const store = createStore();
      const state = store.getState().user;
      expect(state.profile).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
    });
  });

  describe('synchronous reducers', () => {
    it('setUserProfile sets the profile', () => {
      const store = createStore();
      const profile = { firstName: 'Test', lastName: 'Angler', email: 'test@example.com' };

      store.dispatch(setUserProfile(profile as any));

      expect(store.getState().user.profile).toEqual(profile);
    });

    it('clearUserProfile resets profile to null', () => {
      const store = createStore();
      store.dispatch(setUserProfile({ firstName: 'Test' } as any));
      store.dispatch(clearUserProfile());

      expect(store.getState().user.profile).toBeNull();
    });

    it('updateUserField merges partial updates and sets updatedAt', () => {
      const store = createStore();
      store.dispatch(setUserProfile({ firstName: 'Test', lastName: 'Angler' } as any));
      store.dispatch(updateUserField({ firstName: 'Updated' }));

      const profile = store.getState().user.profile;
      expect(profile?.firstName).toBe('Updated');
      expect(profile?.lastName).toBe('Angler');
      expect(profile?.updatedAt).toBeDefined();
    });

    it('updateUserField does nothing if profile is null', () => {
      const store = createStore();
      store.dispatch(updateUserField({ firstName: 'Updated' }));

      expect(store.getState().user.profile).toBeNull();
    });
  });

  describe('fetchUserProfile', () => {
    it('loads profile from secure storage', async () => {
      const storedProfile = { firstName: 'Stored', lastName: 'User' };
      mockSecureStorage.getObject.mockResolvedValue(storedProfile);

      const store = createStore();
      await store.dispatch(fetchUserProfile());

      expect(store.getState().user.profile).toEqual(storedProfile);
      expect(store.getState().user.status).toBe('succeeded');
    });

    it('handles null storage value', async () => {
      mockSecureStorage.getObject.mockResolvedValue(null);

      const store = createStore();
      await store.dispatch(fetchUserProfile());

      expect(store.getState().user.profile).toBeNull();
      expect(store.getState().user.status).toBe('succeeded');
    });

    it('sets error state on storage failure', async () => {
      mockSecureStorage.getObject.mockRejectedValue(new Error('Read error'));

      const store = createStore();
      await store.dispatch(fetchUserProfile());

      expect(store.getState().user.status).toBe('failed');
      expect(store.getState().user.error).toBe('Failed to load user profile');
    });
  });

  describe('saveUserProfile', () => {
    it('saves profile with generated id if missing', async () => {
      mockSecureStorage.setObject.mockResolvedValue(undefined);

      const store = createStore();
      const result = await store.dispatch(
        saveUserProfile({ firstName: 'New', lastName: 'User' } as any)
      );

      expect(result.type).toBe('user/saveProfile/fulfilled');
      const saved = store.getState().user.profile;
      expect(saved?.id).toBeDefined();
      expect(saved?.firstName).toBe('New');
      expect(saved?.createdAt).toBeDefined();
      expect(saved?.updatedAt).toBeDefined();
    });

    it('preserves existing id and createdAt', async () => {
      mockSecureStorage.setObject.mockResolvedValue(undefined);
      const existingDate = new Date('2026-01-01');

      const store = createStore();
      await store.dispatch(
        saveUserProfile({ id: 'existing-id', firstName: 'Existing', createdAt: existingDate } as any)
      );

      const saved = store.getState().user.profile;
      expect(saved?.id).toBe('existing-id');
      expect(saved?.createdAt).toEqual(existingDate);
    });

    it('sets error on save failure', async () => {
      mockSecureStorage.setObject.mockRejectedValue(new Error('Write error'));

      const store = createStore();
      const result = await store.dispatch(
        saveUserProfile({ firstName: 'Test' } as any)
      );

      expect(result.type).toBe('user/saveProfile/rejected');
      expect(store.getState().user.status).toBe('failed');
    });
  });
});
