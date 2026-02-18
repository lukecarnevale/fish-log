import { configureStore } from '@reduxjs/toolkit';
import fishReportsReducer, {
  fetchFishReports,
  addFishReport,
  updateFishReport,
  deleteFishReport,
  selectAllFishReports,
  selectFishReportById,
  selectFishReportIds,
} from '../../src/store/slices/fishReportsSlice';
import persistedStorage from '../../src/utils/storage/persistedStorage';
import type { RootState } from '../../src/store';

// Mock persistedStorage
jest.mock('../../src/utils/storage/persistedStorage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockPersistedStorage = persistedStorage as jest.Mocked<typeof persistedStorage>;

function createStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: { fishReports: fishReportsReducer, user: (s = null) => s, license: (s = null) => s },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
}

describe('fishReportsSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const store = createStore();
      const state = store.getState().fishReports;
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
      expect(state.lastFetched).toBeNull();
      expect(state.ids).toEqual([]);
      expect(state.entities).toEqual({});
    });
  });

  describe('fetchFishReports', () => {
    it('sets status to loading when pending', () => {
      const store = createStore();
      // Dispatch but don't await - check intermediate state
      mockPersistedStorage.getItem.mockReturnValue(new Promise(() => {})); // never resolves
      store.dispatch(fetchFishReports());
      expect(store.getState().fishReports.status).toBe('loading');
    });

    it('populates state with fetched reports', async () => {
      const reports = [
        { id: '1', species: 'Red Drum', createdAt: '2026-01-15T00:00:00.000Z' },
        { id: '2', species: 'Flounder', createdAt: '2026-01-14T00:00:00.000Z' },
      ];
      mockPersistedStorage.getItem.mockResolvedValue(reports);

      const store = createStore();
      await store.dispatch(fetchFishReports());

      const state = store.getState().fishReports;
      expect(state.status).toBe('succeeded');
      expect(state.ids).toHaveLength(2);
      expect(state.lastFetched).not.toBeNull();
      expect(selectAllFishReports(store.getState())).toHaveLength(2);
    });

    it('returns empty array when no reports stored', async () => {
      mockPersistedStorage.getItem.mockResolvedValue(null);

      const store = createStore();
      await store.dispatch(fetchFishReports());

      expect(store.getState().fishReports.status).toBe('succeeded');
      expect(selectAllFishReports(store.getState())).toEqual([]);
    });

    it('sets error state on fetch failure', async () => {
      mockPersistedStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const store = createStore();
      await store.dispatch(fetchFishReports());

      const state = store.getState().fishReports;
      expect(state.status).toBe('failed');
      expect(state.error).toBe('Failed to load fish reports');
    });
  });

  describe('addFishReport', () => {
    it('adds a new report with generated id and timestamps', async () => {
      mockPersistedStorage.setItem.mockResolvedValue(undefined);

      const store = createStore();
      const result = await store.dispatch(
        addFishReport({ species: 'Spotted Seatrout', length: '18in' })
      );

      expect(result.type).toBe('fishReports/add/fulfilled');
      const reports = selectAllFishReports(store.getState());
      expect(reports).toHaveLength(1);
      expect(reports[0].species).toBe('Spotted Seatrout');
      expect(reports[0].id).toBeDefined();
      expect(reports[0].createdAt).toBeDefined();
      expect(reports[0].updatedAt).toBeDefined();
    });

    it('persists to storage after adding', async () => {
      mockPersistedStorage.setItem.mockResolvedValue(undefined);

      const store = createStore();
      await store.dispatch(addFishReport({ species: 'Red Drum' }));

      expect(mockPersistedStorage.setItem).toHaveBeenCalledWith(
        'fishReports',
        expect.any(Array),
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });

    it('sets error on storage failure', async () => {
      mockPersistedStorage.setItem.mockRejectedValue(new Error('Write error'));

      const store = createStore();
      const result = await store.dispatch(addFishReport({ species: 'Red Drum' }));

      expect(result.type).toBe('fishReports/add/rejected');
    });
  });

  describe('updateFishReport', () => {
    it('updates an existing report with new timestamp', async () => {
      mockPersistedStorage.getItem.mockResolvedValue([
        { id: '1', species: 'Red Drum', createdAt: '2026-01-15' },
      ]);
      mockPersistedStorage.setItem.mockResolvedValue(undefined);

      const store = createStore();
      await store.dispatch(fetchFishReports());

      await store.dispatch(
        updateFishReport({ id: '1', species: 'Red Drum', length: '24in' } as any)
      );

      const report = selectFishReportById(store.getState(), '1');
      expect(report?.length).toBe('24in');
      expect(report?.updatedAt).toBeDefined();
    });
  });

  describe('deleteFishReport', () => {
    it('removes a report from state', async () => {
      mockPersistedStorage.getItem.mockResolvedValue([
        { id: '1', species: 'Red Drum', createdAt: '2026-01-15' },
        { id: '2', species: 'Flounder', createdAt: '2026-01-14' },
      ]);
      mockPersistedStorage.setItem.mockResolvedValue(undefined);

      const store = createStore();
      await store.dispatch(fetchFishReports());
      expect(selectAllFishReports(store.getState())).toHaveLength(2);

      await store.dispatch(deleteFishReport('1'));

      expect(selectAllFishReports(store.getState())).toHaveLength(1);
      expect(selectFishReportById(store.getState(), '1')).toBeUndefined();
    });

    it('persists updated list after deletion', async () => {
      mockPersistedStorage.getItem.mockResolvedValue([
        { id: '1', species: 'Red Drum', createdAt: '2026-01-15' },
      ]);
      mockPersistedStorage.setItem.mockResolvedValue(undefined);

      const store = createStore();
      await store.dispatch(fetchFishReports());
      await store.dispatch(deleteFishReport('1'));

      expect(mockPersistedStorage.setItem).toHaveBeenLastCalledWith(
        'fishReports',
        [],
        expect.any(Object)
      );
    });
  });

  describe('selectors', () => {
    it('selectAllFishReports sorts by createdAt descending', async () => {
      const reports = [
        { id: '1', species: 'Red Drum', createdAt: '2026-01-10T00:00:00.000Z' },
        { id: '2', species: 'Flounder', createdAt: '2026-01-15T00:00:00.000Z' },
        { id: '3', species: 'Weakfish', createdAt: '2026-01-12T00:00:00.000Z' },
      ];
      mockPersistedStorage.getItem.mockResolvedValue(reports);

      const store = createStore();
      await store.dispatch(fetchFishReports());

      const sorted = selectAllFishReports(store.getState());
      expect(sorted[0].id).toBe('2'); // Jan 15 - most recent
      expect(sorted[1].id).toBe('3'); // Jan 12
      expect(sorted[2].id).toBe('1'); // Jan 10
    });

    it('selectFishReportIds returns all IDs', async () => {
      mockPersistedStorage.getItem.mockResolvedValue([
        { id: 'a', species: 'Red Drum', createdAt: '2026-01-15' },
        { id: 'b', species: 'Flounder', createdAt: '2026-01-14' },
      ]);

      const store = createStore();
      await store.dispatch(fetchFishReports());

      const ids = selectFishReportIds(store.getState());
      expect(ids).toHaveLength(2);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
    });
  });
});
