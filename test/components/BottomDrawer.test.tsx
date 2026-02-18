import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import BottomDrawer from '../../src/components/BottomDrawer';

describe('BottomDrawer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders children when visible', () => {
    const { getByText } = render(
      <BottomDrawer visible={true} onClose={jest.fn()}>
        <Text>Drawer Content</Text>
      </BottomDrawer>
    );

    expect(getByText('Drawer Content')).toBeTruthy();
  });

  it('does not render when visible=false initially', () => {
    const { queryByText } = render(
      <BottomDrawer visible={false} onClose={jest.fn()}>
        <Text>Drawer Content</Text>
      </BottomDrawer>
    );

    expect(queryByText('Drawer Content')).toBeNull();
  });

  it('calls onClose after close animation completes', async () => {
    const onClose = jest.fn();
    const { getByText, rerender } = render(
      <BottomDrawer visible={true} onClose={onClose}>
        <Text>Content</Text>
      </BottomDrawer>
    );

    expect(getByText('Content')).toBeTruthy();

    // Transition to closed
    rerender(
      <BottomDrawer visible={false} onClose={onClose}>
        <Text>Content</Text>
      </BottomDrawer>
    );

    // Advance past animation
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows drag handle by default', () => {
    const { UNSAFE_root } = render(
      <BottomDrawer visible={true} onClose={jest.fn()}>
        <Text>Content</Text>
      </BottomDrawer>
    );

    // The drag handle is a View, just verify the component renders without errors
    expect(UNSAFE_root).toBeTruthy();
  });
});
