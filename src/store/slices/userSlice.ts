import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '../../models/schemas';
import secureStorage from '../../utils/storage/secureStorage';
import { STORAGE_KEYS } from '../../utils/storage/secureStorage';
import { v4 as uuid } from 'uuid';

interface UserState {
  profile: UserProfile | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  status: 'idle',
  error: null,
};

// Async thunks for profile management
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const profile = await secureStorage.getObject<UserProfile>(STORAGE_KEYS.USER_PROFILE);
      return profile;
    } catch (error) {
      return rejectWithValue('Failed to load user profile');
    }
  }
);

export const saveUserProfile = createAsyncThunk(
  'user/saveProfile',
  async (profile: UserProfile, { rejectWithValue }) => {
    try {
      const profileToSave = {
        ...profile,
        id: profile.id || uuid(),
        updatedAt: new Date(),
        createdAt: profile.createdAt || new Date(),
      };
      
      await secureStorage.setObject(STORAGE_KEYS.USER_PROFILE, profileToSave);
      return profileToSave;
    } catch (error) {
      return rejectWithValue('Failed to save user profile');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    clearUserProfile: (state) => {
      state.profile = null;
    },
    updateUserField: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.profile) {
        state.profile = {
          ...state.profile,
          ...action.payload,
          updatedAt: new Date(),
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUserProfile
      .addCase(fetchUserProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // saveUserProfile
      .addCase(saveUserProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(saveUserProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload;
      })
      .addCase(saveUserProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { setUserProfile, clearUserProfile, updateUserField } = userSlice.actions;

export default userSlice.reducer;