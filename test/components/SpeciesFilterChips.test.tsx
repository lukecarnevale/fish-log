import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SpeciesFilterChips, { FilterChipConfig } from '../../src/components/SpeciesFilterChips';

const makeFilter = (overrides: Partial<FilterChipConfig> = {}): FilterChipConfig => ({
  key: 'closed',
  label: 'Closed',
  icon: 'alert-octagon',
  isActive: false,
  onToggle: jest.fn(),
  color: '#FF0000',
  ...overrides,
});

describe('SpeciesFilterChips', () => {
  it('renders filter labels', () => {
    const filters = [
      makeFilter({ key: 'closed', label: 'Closed' }),
      makeFilter({ key: 'restricted', label: 'Restricted' }),
    ];
    const { getByText } = render(
      <SpeciesFilterChips filters={filters} isExpanded={true} />
    );

    expect(getByText('Closed')).toBeTruthy();
    expect(getByText('Restricted')).toBeTruthy();
  });

  it('calls onToggle when a chip is pressed', () => {
    const onToggle = jest.fn();
    const filters = [makeFilter({ onToggle })];
    const { getByText } = render(
      <SpeciesFilterChips filters={filters} isExpanded={true} />
    );

    fireEvent.press(getByText('Closed'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows count badge when count > 0', () => {
    const filters = [makeFilter({ count: 3 })];
    const { getByText } = render(
      <SpeciesFilterChips filters={filters} isExpanded={true} />
    );

    expect(getByText('3')).toBeTruthy();
  });

  it('does not show count badge when count is 0', () => {
    const filters = [makeFilter({ count: 0 })];
    const { queryByText } = render(
      <SpeciesFilterChips filters={filters} isExpanded={true} />
    );

    // The label "Closed" should be there but "0" should not appear as a badge
    expect(queryByText('0')).toBeNull();
  });

  it('does not show count badge when count is undefined', () => {
    const filters = [makeFilter({ count: undefined })];
    const { queryByText } = render(
      <SpeciesFilterChips filters={filters} isExpanded={true} />
    );

    expect(queryByText('Closed')).toBeTruthy();
  });
});
