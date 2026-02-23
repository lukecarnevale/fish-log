import { renderHook } from '@testing-library/react-native';

jest.mock('../../src/store', () => ({
  store: {
    dispatch: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../src/store/slices/userSlice', () => ({
  fetchUserProfile: jest.fn(() => ({ type: 'user/fetchUserProfile' })),
}));

jest.mock('../../src/store/slices/licenseSlice', () => ({
  fetchLicense: jest.fn(() => ({ type: 'license/fetchLicense' })),
}));

jest.mock('../../src/store/slices/fishReportsSlice', () => ({
  fetchFishReports: jest.fn(() => ({ type: 'fishReports/fetchFishReports' })),
}));

import { useInitializeData } from '../../src/hooks/useInitializeData';
import { store } from '../../src/store';

describe('useInitializeData', () => {
  it('dispatches all three fetch actions on mount', () => {
    renderHook(() => useInitializeData());

    expect(store.dispatch).toHaveBeenCalledTimes(3);
  });

  it('dispatches fetchUserProfile', () => {
    renderHook(() => useInitializeData());

    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'user/fetchUserProfile' })
    );
  });

  it('dispatches fetchLicense', () => {
    renderHook(() => useInitializeData());

    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'license/fetchLicense' })
    );
  });

  it('dispatches fetchFishReports', () => {
    renderHook(() => useInitializeData());

    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fishReports/fetchFishReports' })
    );
  });

  it('does not dispatch again on re-render', () => {
    const { rerender } = renderHook(() => useInitializeData());

    const initialCallCount = (store.dispatch as jest.Mock).mock.calls.length;
    rerender({});

    expect(store.dispatch).toHaveBeenCalledTimes(initialCallCount);
  });
});
