import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePromotions, useSubmitPartnerInquiry, PROMOTIONS_KEYS } from '../../src/api/promotionsApi';
import { makeAdvertisement, makePartnerInquiry } from '../factories';

// Mock the service layer
jest.mock('../../src/services/promotionsService', () => ({
  fetchPromotions: jest.fn(),
  submitPartnerInquiry: jest.fn(),
}));

const { fetchPromotions, submitPartnerInquiry } = require('../../src/services/promotionsService');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, retryDelay: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('usePromotions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches promotions on mount', async () => {
    const mockData = {
      promotions: [makeAdvertisement()],
      fromCache: false,
      total: 1,
    };
    fetchPromotions.mockResolvedValue(mockData);

    const { result } = renderHook(() => usePromotions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(fetchPromotions).toHaveBeenCalledTimes(1);
  });

  it('passes area and category filters to fetchPromotions', async () => {
    fetchPromotions.mockResolvedValue({ promotions: [], fromCache: false });

    const { result } = renderHook(
      () => usePromotions({ area: 'OBX', category: 'charter' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchPromotions).toHaveBeenCalledWith({
      area: 'OBX',
      category: 'charter',
    });
  });

  it('handles fetch error gracefully', async () => {
    fetchPromotions.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePromotions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

    expect(result.current.error).toBeDefined();
  });
});

describe('useSubmitPartnerInquiry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls submitPartnerInquiry with inquiry data', async () => {
    const inquiry = makePartnerInquiry();
    submitPartnerInquiry.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useSubmitPartnerInquiry(), { wrapper: createWrapper() });

    await result.current.mutateAsync({ inquiry });

    expect(submitPartnerInquiry).toHaveBeenCalledWith(inquiry, undefined);
  });

  it('passes userId when provided', async () => {
    const inquiry = makePartnerInquiry();
    submitPartnerInquiry.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useSubmitPartnerInquiry(), { wrapper: createWrapper() });

    await result.current.mutateAsync({ inquiry, userId: 'user-123' });

    expect(submitPartnerInquiry).toHaveBeenCalledWith(inquiry, 'user-123');
  });

  it('returns error result from service', async () => {
    submitPartnerInquiry.mockResolvedValue({ success: false, error: 'Validation failed' });

    const { result } = renderHook(() => useSubmitPartnerInquiry(), { wrapper: createWrapper() });

    const response = await result.current.mutateAsync({ inquiry: makePartnerInquiry() });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Validation failed');
  });
});

describe('PROMOTIONS_KEYS', () => {
  it('generates stable query keys', () => {
    expect(PROMOTIONS_KEYS.all).toEqual(['promotions']);
    expect(PROMOTIONS_KEYS.list({ area: 'OBX', category: 'charter' }))
      .toEqual(['promotions', 'list', { area: 'OBX', category: 'charter' }]);
  });

  it('generates different keys for different filters', () => {
    const key1 = PROMOTIONS_KEYS.list({ area: 'OBX' });
    const key2 = PROMOTIONS_KEYS.list({ area: 'CRC' });
    expect(key1).not.toEqual(key2);
  });
});
