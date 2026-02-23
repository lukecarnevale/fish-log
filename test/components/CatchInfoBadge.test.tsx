import React from 'react';
import { render } from '@testing-library/react-native';
import CatchInfoBadge from '../../src/components/CatchInfoBadge';

describe('CatchInfoBadge', () => {
  it('renders species variant with text', () => {
    const { getByText } = render(
      <CatchInfoBadge text="Red Drum" variant="species" />
    );

    expect(getByText('Red Drum')).toBeTruthy();
  });

  it('renders species variant with species dot when speciesTheme provided', () => {
    const theme = {
      id: 'red_drum',
      name: 'Red Drum',
      primary: '#E57373',
      light: '#FFEBEE',
      icon: '#C62828',
      gradient: ['#E57373', '#EF9A9A'] as [string, string],
    };

    const { getByText } = render(
      <CatchInfoBadge text="Red Drum" variant="species" speciesTheme={theme} />
    );

    expect(getByText('Red Drum')).toBeTruthy();
  });

  it('renders size variant with icon and text', () => {
    const { getByText } = render(
      <CatchInfoBadge text="3 fish" variant="size" />
    );

    expect(getByText('3 fish')).toBeTruthy();
    // The Feather icon mock renders the icon name as text
    expect(getByText('maximize-2')).toBeTruthy();
  });

  it('renders location variant with map-pin icon', () => {
    const { getByText } = render(
      <CatchInfoBadge text="Pamlico Sound" variant="location" />
    );

    expect(getByText('Pamlico Sound')).toBeTruthy();
    expect(getByText('map-pin')).toBeTruthy();
  });

  it('uses custom icon when provided for non-species variant', () => {
    const { getByText } = render(
      <CatchInfoBadge text="Custom" variant="size" icon="star" />
    );

    expect(getByText('star')).toBeTruthy();
  });
});
