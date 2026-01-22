import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FishingLicense } from '../../models/schemas';
import secureStorage from '../../utils/storage/secureStorage';
import { STORAGE_KEYS } from '../../utils/storage/secureStorage';
import { v4 as uuid } from 'uuid';

interface LicenseState {
  license: FishingLicense | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: LicenseState = {
  license: null,
  status: 'idle',
  error: null,
};

// Async thunks for license management
export const fetchLicense = createAsyncThunk(
  'license/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const license = await secureStorage.getObject<FishingLicense>(STORAGE_KEYS.FISHING_LICENSE);
      return license;
    } catch (error) {
      return rejectWithValue('Failed to load fishing license');
    }
  }
);

export const saveLicense = createAsyncThunk(
  'license/save',
  async (license: FishingLicense, { rejectWithValue }) => {
    try {
      const licenseToSave = {
        ...license,
        id: license.id || uuid(),
        updatedAt: new Date(),
        createdAt: license.createdAt || new Date(),
      };
      
      await secureStorage.setObject(STORAGE_KEYS.FISHING_LICENSE, licenseToSave);
      return licenseToSave;
    } catch (error) {
      return rejectWithValue('Failed to save fishing license');
    }
  }
);

const licenseSlice = createSlice({
  name: 'license',
  initialState,
  reducers: {
    setLicense: (state, action: PayloadAction<FishingLicense>) => {
      state.license = action.payload;
    },
    clearLicense: (state) => {
      state.license = null;
    },
    updateLicenseField: (state, action: PayloadAction<Partial<FishingLicense>>) => {
      if (state.license) {
        state.license = {
          ...state.license,
          ...action.payload,
          updatedAt: new Date(),
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchLicense
      .addCase(fetchLicense.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLicense.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.license = action.payload;
      })
      .addCase(fetchLicense.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // saveLicense
      .addCase(saveLicense.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(saveLicense.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.license = action.payload;
      })
      .addCase(saveLicense.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { setLicense, clearLicense, updateLicenseField } = licenseSlice.actions;

export default licenseSlice.reducer;