import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FeaturedPromotionCard from '../../../src/components/promotions/FeaturedPromotionCard';
import { makeAdvertisement } from '../../factories';
import { safeOpenURL } from '../../../src/utils/openURL';

jest.mock('../../../src/utils/openURL', () => ({
  safeOpenURL: jest.fn(),
}));

const featured = makeAdvertisement({
  companyName: 'Premium Charters',
  promoText: 'Book now and save',
  description: 'Premium deep-sea fishing experience',
  promoCode: 'DEEP50',
  linkUrl: 'https://premiumcharters.com',
  featured: true,
  category: 'charter',
  areaCodes: ['CRC'],
});

describe('FeaturedPromotionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders company name', () => {
    const { getByText } = render(<FeaturedPromotionCard promotion={featured} />);
    expect(getByText('Premium Charters')).toBeTruthy();
  });

  it('renders description over promoText when available', () => {
    const { getByText } = render(<FeaturedPromotionCard promotion={featured} />);
    expect(getByText('Premium deep-sea fishing experience')).toBeTruthy();
  });

  it('renders Featured badge', () => {
    const { getByText } = render(<FeaturedPromotionCard promotion={featured} />);
    expect(getByText('Featured')).toBeTruthy();
  });

  it('renders promo code', () => {
    const { getByText } = render(<FeaturedPromotionCard promotion={featured} />);
    expect(getByText('DEEP50')).toBeTruthy();
  });

  it('opens valid URL on press', () => {
    const { getByRole } = render(<FeaturedPromotionCard promotion={featured} />);
    fireEvent.press(getByRole('button'));
    expect(safeOpenURL).toHaveBeenCalledWith('https://premiumcharters.com');
  });

  it('has accessibility label with featured prefix', () => {
    const { getByLabelText } = render(<FeaturedPromotionCard promotion={featured} />);
    expect(getByLabelText(/Featured promotion/)).toBeTruthy();
  });
});
