import { renderHook, waitFor, act } from '@testing-library/react-native';

jest.mock('../../src/services/partnersService', () => ({
  fetchPartners: jest.fn(() =>
    Promise.resolve({
      partners: [
        { id: '1', name: 'Partner A', websiteUrl: 'https://a.com', logoUrl: null, displayOrder: 1, isActive: true },
      ],
    })
  ),
  refreshPartners: jest.fn(() =>
    Promise.resolve({
      partners: [
        { id: '1', name: 'Partner A', websiteUrl: 'https://a.com', logoUrl: null, displayOrder: 1, isActive: true },
        { id: '2', name: 'Partner B', websiteUrl: 'https://b.com', logoUrl: null, displayOrder: 2, isActive: true },
      ],
    })
  ),
}));

import { usePartners } from '../../src/hooks/usePartners';
import { fetchPartners, refreshPartners } from '../../src/services/partnersService';

describe('usePartners', () => {
  it('loads partners on mount', async () => {
    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.partners).toHaveLength(1);
    expect(result.current.partners[0].name).toBe('Partner A');
    expect(fetchPartners).toHaveBeenCalledTimes(1);
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => usePartners());
    expect(result.current.loading).toBe(true);
  });

  it('refresh fetches fresh partners', async () => {
    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(refreshPartners).toHaveBeenCalled();
    expect(result.current.partners).toHaveLength(2);
  });

  it('handles fetch failure gracefully', async () => {
    (fetchPartners as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.partners).toEqual([]);
    warnSpy.mockRestore();
  });
});
