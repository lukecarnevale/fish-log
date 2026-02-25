import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CategoryTabs from '../../../src/components/promotions/CategoryTabs';

describe('CategoryTabs', () => {
  const defaultProps = {
    selectedCategory: null as any,
    onSelectCategory: jest.fn(),
    categoryCounts: { promotion: 5, charter: 3, gear: 2 } as any,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders All tab', () => {
    const { getByText } = render(<CategoryTabs {...defaultProps} />);
    expect(getByText('All')).toBeTruthy();
  });

  it('renders all category labels', () => {
    const { getByText } = render(<CategoryTabs {...defaultProps} />);
    expect(getByText('Deals')).toBeTruthy();
    expect(getByText('Charters')).toBeTruthy();
    expect(getByText('Gear')).toBeTruthy();
    expect(getByText('Services')).toBeTruthy();
    expect(getByText('Experiences')).toBeTruthy();
  });

  it('calls onSelectCategory with null when All pressed', () => {
    const { getByLabelText } = render(<CategoryTabs {...defaultProps} />);
    fireEvent.press(getByLabelText('All categories'));
    expect(defaultProps.onSelectCategory).toHaveBeenCalledWith(null);
  });

  it('calls onSelectCategory with category value on press', () => {
    const { getByLabelText } = render(<CategoryTabs {...defaultProps} />);
    fireEvent.press(getByLabelText(/Charters category/));
    expect(defaultProps.onSelectCategory).toHaveBeenCalledWith('charter');
  });

  it('has accessibility role radio on each tab', () => {
    const { getAllByRole } = render(<CategoryTabs {...defaultProps} />);
    const radios = getAllByRole('radio');
    expect(radios.length).toBe(6); // All + 5 categories
  });

  it('renders count badges for categories with counts', () => {
    const { getByText } = render(<CategoryTabs {...defaultProps} />);
    expect(getByText('5')).toBeTruthy(); // promotion count
    expect(getByText('3')).toBeTruthy(); // charter count
  });
});
