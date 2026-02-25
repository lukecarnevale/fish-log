import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PromotionCard from '../../../src/components/promotions/PromotionCard';
import { makeAdvertisement } from '../../factories';

const defaultPromo = makeAdvertisement({
  id: 'promo-1',
  companyName: 'Captain Bob Charters',
  promoText: '20% off summer trips',
  promoCode: 'SUM20',
  linkUrl: 'https://captainbob.com',
  imageUrl: 'https://img.com/bob.jpg',
  category: 'charter',
  areaCodes: ['OBX'],
});

describe('PromotionCard', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  it('renders company name and promo text', () => {
    const { getByText } = render(<PromotionCard promotion={defaultPromo} />);
    expect(getByText('Captain Bob Charters')).toBeTruthy();
    expect(getByText('20% off summer trips')).toBeTruthy();
  });

  it('renders promo code badge', () => {
    const { getByText } = render(<PromotionCard promotion={defaultPromo} />);
    expect(getByText('SUM20')).toBeTruthy();
  });

  it('renders category label', () => {
    const { getByText } = render(<PromotionCard promotion={defaultPromo} />);
    expect(getByText('Charters')).toBeTruthy();
  });

  it('opens valid URL on press', () => {
    const { getByLabelText } = render(<PromotionCard promotion={defaultPromo} />);
    fireEvent.press(getByLabelText(/Captain Bob Charters/));
    expect(Linking.openURL).toHaveBeenCalledWith('https://captainbob.com');
  });

  it('blocks javascript: URL', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const dangerousPromo = makeAdvertisement({ linkUrl: 'javascript:alert(1)' });
    const { getByRole } = render(<PromotionCard promotion={dangerousPromo} />);
    fireEvent.press(getByRole('button'));
    expect(Linking.openURL).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('calls onPress callback when provided', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PromotionCard promotion={defaultPromo} onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(defaultPromo);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('has accessibility role button', () => {
    const { getByRole } = render(<PromotionCard promotion={defaultPromo} />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('renders placeholder when no image source', () => {
    const noImage = makeAdvertisement({ imageUrl: '', companyName: 'Test Shop' });
    const { getByText } = render(<PromotionCard promotion={noImage} />);
    expect(getByText('TS')).toBeTruthy();
  });
});
