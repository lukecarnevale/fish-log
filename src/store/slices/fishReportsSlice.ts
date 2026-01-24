import { createSlice, createAsyncThunk, PayloadAction, createEntityAdapter, EntityState } from '@reduxjs/toolkit';
import { FishReport } from '../../models/schemas';
import persistedStorage from '../../utils/storage/persistedStorage';
import { v4 as uuid } from 'uuid';
import { RootState } from '..';

// Time constants for caching
const ONE_DAY = 24 * 60 * 60 * 1000;

// Type for FishReport with required id
type FishReportWithId = FishReport & { id: string };

// Setup entity adapter for normalized state management
const fishReportsAdapter = createEntityAdapter<FishReportWithId, string>({
  selectId: (report) => report.id,
  sortComparer: (a, b) => {
    // Sort by date created (most recent first)
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  },
});

// Define the initial state with the entity adapter
interface FishReportsState extends EntityState<FishReportWithId, string> {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastFetched: number | null;
}

const initialState: FishReportsState = fishReportsAdapter.getInitialState({
  status: 'idle',
  error: null,
  lastFetched: null,
});

// Fetch all reports from storage
export const fetchFishReports = createAsyncThunk(
  'fishReports/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      // We don't use secureStorage here since these aren't sensitive
      const reports = await persistedStorage.getItem<FishReportWithId[]>('fishReports');
      return reports || [];
    } catch (error) {
      return rejectWithValue('Failed to load fish reports');
    }
  }
);

// Add a new report
export const addFishReport = createAsyncThunk(
  'fishReports/add',
  async (report: Omit<FishReport, 'id' | 'createdAt' | 'updatedAt'>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const allReports = selectAllFishReports(state);

      // Create new report with ID and timestamps
      const newReport: FishReportWithId = {
        ...report,
        id: uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to local storage
      const updatedReports = [newReport, ...allReports];
      await persistedStorage.setItem('fishReports', updatedReports, { ttl: ONE_DAY * 90 }); // Cache for 90 days

      return newReport;
    } catch (error) {
      return rejectWithValue('Failed to save fish report');
    }
  }
);

// Update an existing report
export const updateFishReport = createAsyncThunk(
  'fishReports/update',
  async (report: FishReportWithId, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const allReports = selectAllFishReports(state);

      // Update the report with new timestamp
      const updatedReport: FishReportWithId = {
        ...report,
        updatedAt: new Date(),
      };

      // Find and replace the report in our array
      const updatedReports = allReports.map(r =>
        r.id === report.id ? updatedReport : r
      );

      // Save back to storage
      await persistedStorage.setItem('fishReports', updatedReports, { ttl: ONE_DAY * 90 });

      return updatedReport;
    } catch (error) {
      return rejectWithValue('Failed to update fish report');
    }
  }
);

// Delete a report
export const deleteFishReport = createAsyncThunk(
  'fishReports/delete',
  async (reportId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const allReports = selectAllFishReports(state);
      
      // Filter out the deleted report
      const updatedReports = allReports.filter(r => r.id !== reportId);
      
      // Save back to storage
      await persistedStorage.setItem('fishReports', updatedReports, { ttl: ONE_DAY * 90 });
      
      return reportId;
    } catch (error) {
      return rejectWithValue('Failed to delete fish report');
    }
  }
);

const fishReportsSlice = createSlice({
  name: 'fishReports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchFishReports
      .addCase(fetchFishReports.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFishReports.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.lastFetched = Date.now();
        // Use the adapter to set all entities
        fishReportsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchFishReports.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // addFishReport
      .addCase(addFishReport.fulfilled, (state, action) => {
        // Add one entity
        fishReportsAdapter.addOne(state, action.payload);
      })
      
      // updateFishReport
      .addCase(updateFishReport.fulfilled, (state, action) => {
        // Update one entity
        fishReportsAdapter.updateOne(state, {
          id: action.payload.id,
          changes: action.payload
        });
      })
      
      // deleteFishReport
      .addCase(deleteFishReport.fulfilled, (state, action) => {
        // Remove one entity
        fishReportsAdapter.removeOne(state, action.payload);
      });
  },
});

// Export the entity adapter selectors
export const {
  selectAll: selectAllFishReports,
  selectById: selectFishReportById,
  selectIds: selectFishReportIds,
} = fishReportsAdapter.getSelectors<RootState>((state) => state.fishReports);

export default fishReportsSlice.reducer;