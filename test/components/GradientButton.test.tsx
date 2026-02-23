import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import GradientButton from '../../src/components/GradientButton';

describe('GradientButton', () => {
  it('renders children', () => {
    const { getByText } = render(
      <GradientButton onPress={jest.fn()}>
        <Text>Submit</Text>
      </GradientButton>
    );

    expect(getByText('Submit')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <GradientButton onPress={onPress}>
        <Text>Submit</Text>
      </GradientButton>
    );

    await fireEvent.press(getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <GradientButton onPress={onPress} disabled>
        <Text>Submit</Text>
      </GradientButton>
    );

    await fireEvent.press(getByText('Submit'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders without onPress (no crash)', () => {
    const { getByText } = render(
      <GradientButton>
        <Text>Label</Text>
      </GradientButton>
    );

    expect(getByText('Label')).toBeTruthy();
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <GradientButton onPress={jest.fn()}>
        <Text>Submit</Text>
      </GradientButton>
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
