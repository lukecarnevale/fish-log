import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PromotionsScreen from '../../src/screens/PromotionsScreen';
import { makeAdvertisement } from '../factories';

// ============================================================================
// MOCKS — Hook & Service Layer
// ============================================================================

const mockRefetch = jest.fn();
const mockPromotionsData = {
  promotions: [
    makeAdvertisement({ id: 'feat-1', companyName: 'Featured Co', featured: true, imageUrl: 'https://img.com/f.jpg' }),
    makeAdvertisement({ id: 'reg-1', companyName: 'Regular Co', featured: false, imageUrl: 'https://img.com/r.jpg' }),
    makeAdvertisement({ id: 'reg-2', companyName: 'Other Co', featured: false, category: 'charter', imageUrl: 'https://img.com/o.jpg' }),
  ],
  fromCache: false,
  total: 3,
};

jest.mock('../../src/api/promotionsApi', () => ({
  usePromotions: jest.fn(() => ({
    data: mockPromotionsData,
    isLoading: false,
    isFetching: false,
    refetch: mockRefetch,
  })),
}));

const { usePromotions } = require('../../src/api/promotionsApi');

jest.mock('../../src/hooks/useFloatingHeaderAnimation', () => ({
  useFloatingHeaderAnimation: jest.fn(() => ({
    scrollY: { current: { interpolate: jest.fn(() => 0) } },
    onScroll: jest.fn(),
    headerOpacity: 0,
  })),
}));

// ============================================================================
// MOCKS — Child Components (match existing project pattern)
// ============================================================================

jest.mock('../../src/components/promotions', () => {
  const RN = require('react-native');
  return {
    AreaSelector: ({ onSelectArea }: any) => (
      <RN.View testID="area-selector"><RN.Text>AreaSelector</RN.Text></RN.View>
    ),
    CategoryTabs: ({ onSelectCategory, categoryCounts }: any) => (
      <RN.View testID="category-tabs"><RN.Text>CategoryTabs</RN.Text></RN.View>
    ),
    PromotionCard: ({ promotion }: any) => (
      <RN.View testID={`promo-card-${promotion.id}`}><RN.Text>{promotion.companyName}</RN.Text></RN.View>
    ),
    FeaturedPromotionCard: ({ promotion }: any) => (
      <RN.View testID="featured-card"><RN.Text>{promotion.companyName}</RN.Text></RN.View>
    ),
    PartnerCTACard: ({ onPress }: any) => (
      <RN.TouchableOpacity testID="partner-cta" onPress={onPress} accessibilityLabel="Partner With Us">
        <RN.Text>Partner With Us</RN.Text>
      </RN.TouchableOpacity>
    ),
  };
});

jest.mock('../../src/components/SkeletonLoader', () => ({
  PromotionsSkeletonLoader: () => {
    const { View, Text } = require('react-native');
    return <View testID="skeleton-loader"><Text>Loading...</Text></View>;
  },
}));

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Svg: View, Path: View, G: View, Circle: View, Rect: View, Defs: View, LinearGradient: View, Stop: View };
});

// ============================================================================
// TESTS
// ============================================================================

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
const route = {} as any;

describe('PromotionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePromotions.mockReturnValue({
      data: mockPromotionsData,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
  });

  it('renders the screen title', async () => {
    const { getByText } = render(
      <PromotionsScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText("Fisherman's Locker")).toBeTruthy();
    });
  });

  it('renders regular promotions', async () => {
    const { getByText } = render(
      <PromotionsScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('Regular Co')).toBeTruthy();
      expect(getByText('Other Co')).toBeTruthy();
    });
  });

  it('renders featured promotion card', async () => {
    const { getByText } = render(
      <PromotionsScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('Featured Co')).toBeTruthy();
    });
  });

  it('shows skeleton loader when loading', () => {
    usePromotions.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(
      <PromotionsScreen navigation={navigation} route={route} />
    );

    expect(getByTestId('skeleton-loader')).toBeTruthy();
  });

  it('shows empty state when no promotions', async () => {
    usePromotions.mockReturnValue({
      data: { promotions: [], fromCache: false },
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <PromotionsScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('Nothing in the locker yet')).toBeTruthy();
    });
  });

  it('renders Partner CTA card', async () => {
    const { getByTestId } = render(
      <PromotionsScreen navigation={navigation} route={route} />
    );

    await waitFor(() => {
      expect(getByTestId('partner-cta')).toBeTruthy();
    });
  });

  it('passes filter params to usePromotions', () => {
    render(<PromotionsScreen navigation={navigation} route={route} />);

    expect(usePromotions).toHaveBeenCalledWith({
      area: undefined,
      category: null,
    });
  });
});
