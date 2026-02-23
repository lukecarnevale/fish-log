import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import FloatingBackButton from '../../src/components/FloatingBackButton';

describe('FloatingBackButton', () => {
  it('renders without crashing', () => {
    const opacity = new Animated.Value(1);
    const translateX = new Animated.Value(0);

    const { toJSON } = render(
      <FloatingBackButton
        opacity={opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })}
        translateX={translateX.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] })}
        onPress={jest.fn()}
      />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const opacity = new Animated.Value(1);
    const translateX = new Animated.Value(0);

    const { getByText } = render(
      <FloatingBackButton
        opacity={opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })}
        translateX={translateX.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] })}
        onPress={onPress}
      />
    );

    // FloatingBackButton renders a Feather icon "arrow-left" which is mocked as Text
    await fireEvent.press(getByText('arrow-left'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
