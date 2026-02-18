import React from 'react';
import { render } from '@testing-library/react-native';
import SpeciesPlaceholder from '../../src/components/SpeciesPlaceholder';

// Mock the species icons module
jest.mock('../../src/components/icons/SpeciesIcons', () => {
  const { View, Text } = require('react-native');
  return {
    FishSvg: (props: any) => <View testID="fish-svg"><Text>{props.width}</Text></View>,
    RedDrumSvg: (props: any) => <View testID="red-drum-svg" />,
    FlounderSvg: (props: any) => <View testID="flounder-svg" />,
    SeatroutSvg: (props: any) => <View testID="seatrout-svg" />,
    WeakfishSvg: (props: any) => <View testID="weakfish-svg" />,
    StripedBassSvg: (props: any) => <View testID="striped-bass-svg" />,
    Bubbles: () => <View testID="bubbles" />,
    SIZE_CONFIGS: {
      large: { container: { height: 200 }, fishWidth: 120, fishHeight: 80 },
      medium: { container: { height: 120 }, fishWidth: 80, fishHeight: 50 },
      small: { container: { height: 80 }, fishWidth: 50, fishHeight: 35 },
    },
    PlaceholderSize: {},
  };
});

describe('SpeciesPlaceholder', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <SpeciesPlaceholder species="Red Drum" />
    );

    expect(toJSON()).not.toBeNull();
  });

  it('renders Red Drum SVG for Red Drum species', () => {
    const { getByTestId } = render(
      <SpeciesPlaceholder species="Red Drum" />
    );

    expect(getByTestId('red-drum-svg')).toBeTruthy();
  });

  it('renders Flounder SVG for Flounder species', () => {
    const { getByTestId } = render(
      <SpeciesPlaceholder species="Southern Flounder" />
    );

    expect(getByTestId('flounder-svg')).toBeTruthy();
  });

  it('renders generic fish SVG for unknown species', () => {
    const { getByTestId } = render(
      <SpeciesPlaceholder species="Unknown Fish" />
    );

    expect(getByTestId('fish-svg')).toBeTruthy();
  });

  it('renders bubbles decoration', () => {
    const { getByTestId } = render(
      <SpeciesPlaceholder species="Red Drum" size="large" />
    );

    expect(getByTestId('bubbles')).toBeTruthy();
  });
});
