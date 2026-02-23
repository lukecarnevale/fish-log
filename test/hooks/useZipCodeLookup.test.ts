import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('../../src/services/zipCodeService', () => ({
  lookupZipCode: jest.fn(),
  getCachedZipCode: jest.fn(() => Promise.resolve(null)),
}));

import { useZipCodeLookup } from '../../src/hooks/useZipCodeLookup';
import { lookupZipCode, getCachedZipCode } from '../../src/services/zipCodeService';

describe('useZipCodeLookup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (lookupZipCode as jest.Mock).mockResolvedValue({
      data: { city: 'Raleigh', stateAbbr: 'NC', state: 'North Carolina' },
      notFound: false,
    });
    (getCachedZipCode as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null result for empty zip code', () => {
    const { result } = renderHook(() => useZipCodeLookup(''));

    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns null result for undefined zip code', () => {
    const { result } = renderHook(() => useZipCodeLookup(undefined));

    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns null result for null zip code', () => {
    const { result } = renderHook(() => useZipCodeLookup(null));

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('does not trigger lookup for partial zip (less than 5 digits)', () => {
    const { result } = renderHook(() => useZipCodeLookup('276'));

    expect(result.current.result).toBeNull();
    expect(lookupZipCode).not.toHaveBeenCalled();
  });

  it('does not trigger lookup for non-numeric zip', () => {
    renderHook(() => useZipCodeLookup('abcde'));

    jest.advanceTimersByTime(600);
    expect(lookupZipCode).not.toHaveBeenCalled();
  });

  it('debounces lookup by 500ms', async () => {
    renderHook(() => useZipCodeLookup('27601'));

    // Before debounce
    expect(lookupZipCode).not.toHaveBeenCalled();

    // After debounce
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(lookupZipCode).toHaveBeenCalledWith('27601');
  });

  it('returns lookup result after debounce', async () => {
    const mockResult = { city: 'Raleigh', stateAbbr: 'NC', state: 'North Carolina' };
    (lookupZipCode as jest.Mock).mockResolvedValue({
      data: mockResult,
      notFound: false,
    });

    const { result } = renderHook(() => useZipCodeLookup('27601'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.result).toEqual(mockResult);
      expect(result.current.error).toBeNull();
    });
  });

  it('shows error for not-found zip code', async () => {
    (lookupZipCode as jest.Mock).mockResolvedValue({
      data: null,
      notFound: true,
    });

    const { result } = renderHook(() => useZipCodeLookup('00000'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('ZIP code not found');
      expect(result.current.result).toBeNull();
    });
  });

  it('uses API result after lookup completes (cache provides instant feedback)', async () => {
    const cachedResult = { city: 'Durham', stateAbbr: 'NC', state: 'North Carolina' };
    const apiResult = { city: 'Durham', stateAbbr: 'NC', state: 'North Carolina' };
    (getCachedZipCode as jest.Mock).mockResolvedValue(cachedResult);
    (lookupZipCode as jest.Mock).mockResolvedValue({
      data: apiResult,
      notFound: false,
    });

    const { result } = renderHook(() => useZipCodeLookup('27701'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.result).toEqual(apiResult);
      expect(result.current.error).toBeNull();
    });
  });

  it('silently fails on network error (no error shown)', async () => {
    (lookupZipCode as jest.Mock).mockResolvedValue({
      data: null,
      notFound: false,
      error: 'Network error',
    });

    const { result } = renderHook(() => useZipCodeLookup('27601'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('cancels debounce on zip code change', async () => {
    const { rerender } = renderHook(
      ({ zip }: { zip: string }) => useZipCodeLookup(zip),
      { initialProps: { zip: '27601' } }
    );

    // Before debounce fires, change the zip
    jest.advanceTimersByTime(300);
    rerender({ zip: '27701' });

    // First debounce should be cancelled
    jest.advanceTimersByTime(200);
    expect(lookupZipCode).not.toHaveBeenCalled();

    // Second debounce fires
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(lookupZipCode).toHaveBeenCalledWith('27701');
    expect(lookupZipCode).toHaveBeenCalledTimes(1);
  });

  it('resets state when zip becomes invalid', async () => {
    const { result, rerender } = renderHook(
      ({ zip }: { zip: string | undefined }) => useZipCodeLookup(zip),
      { initialProps: { zip: '27601' as string | undefined } }
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    // Change to invalid zip
    rerender({ zip: '27' });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
