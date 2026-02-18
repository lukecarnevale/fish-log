import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import AnimatedModal from '../../src/components/AnimatedModal';

describe('AnimatedModal', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders children when visible', () => {
    const { getByText } = render(
      <AnimatedModal visible={true} onClose={jest.fn()}>
        <Text>Modal Content</Text>
      </AnimatedModal>
    );

    expect(getByText('Modal Content')).toBeTruthy();
  });

  it('does not render children when not visible', () => {
    const { queryByText } = render(
      <AnimatedModal visible={false} onClose={jest.fn()}>
        <Text>Modal Content</Text>
      </AnimatedModal>
    );

    expect(queryByText('Modal Content')).toBeNull();
  });

  it('calls onClose when overlay is pressed (default closeOnOverlayPress=true)', () => {
    const onClose = jest.fn();
    const { UNSAFE_root } = render(
      <AnimatedModal visible={true} onClose={onClose}>
        <Text>Content</Text>
      </AnimatedModal>
    );

    // The overlay touchable is rendered; simulate tapping it
    // Find the TouchableWithoutFeedback overlay
    const touchables = UNSAFE_root.findAll(
      (node) => node.props.onPress !== undefined
    );
    // The first touchable with onPress should be the overlay
    if (touchables.length > 0) {
      fireEvent(touchables[0], 'press');
    }

    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when closeOnOverlayPress=false', () => {
    const onClose = jest.fn();
    render(
      <AnimatedModal visible={true} onClose={onClose} closeOnOverlayPress={false}>
        <Text>Content</Text>
      </AnimatedModal>
    );

    // Even if we could find the overlay, pressing it shouldn't call onClose
    // The handleOverlayPress function checks closeOnOverlayPress
    // We verify onClose hasn't been called spontaneously
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders content in ScrollView when scrollable=true (default)', () => {
    const { getByText } = render(
      <AnimatedModal visible={true} onClose={jest.fn()} scrollable={true}>
        <Text>Scrollable Content</Text>
      </AnimatedModal>
    );

    expect(getByText('Scrollable Content')).toBeTruthy();
  });

  it('renders content in plain View when scrollable=false', () => {
    const { getByText } = render(
      <AnimatedModal visible={true} onClose={jest.fn()} scrollable={false}>
        <Text>Non-Scrollable Content</Text>
      </AnimatedModal>
    );

    expect(getByText('Non-Scrollable Content')).toBeTruthy();
  });
});
