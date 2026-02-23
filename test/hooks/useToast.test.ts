import { renderHook, act } from '@testing-library/react-native';
import { useToast } from '../../src/hooks/useToast';

describe('useToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts hidden', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.visible).toBe(false);
    expect(result.current.title).toBe('');
    expect(result.current.subtitle).toBe('');
  });

  it('show sets visible, title, and subtitle', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.show('Success', 'Report submitted');
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.title).toBe('Success');
    expect(result.current.subtitle).toBe('Report submitted');
  });

  it('auto-dismisses after 5 seconds', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.show('Test', 'Message');
    });

    expect(result.current.visible).toBe(true);

    // Advance past the auto-dismiss timeout (5s) + animation (300ms)
    act(() => {
      jest.advanceTimersByTime(5300);
    });

    expect(result.current.visible).toBe(false);
  });

  it('hide dismisses the toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.show('Test', 'Message');
    });

    expect(result.current.visible).toBe(true);

    act(() => {
      result.current.hide();
      jest.advanceTimersByTime(300); // animation duration
    });

    expect(result.current.visible).toBe(false);
  });

  it('calling show again resets auto-dismiss timer', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.show('First', 'Message');
    });

    // Advance 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Show again — should reset the 5s timer
    act(() => {
      result.current.show('Second', 'Message');
    });

    expect(result.current.title).toBe('Second');

    // 3 more seconds — would be 6s total from first show
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Should still be visible because second show reset the timer
    expect(result.current.visible).toBe(true);

    // 2 more seconds + animation to complete the 5s from second show
    act(() => {
      jest.advanceTimersByTime(2300);
    });

    expect(result.current.visible).toBe(false);
  });

  it('provides an animValue for animations', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.animValue).toBeDefined();
    // animValue is an Animated.Value, should have _value or similar
    expect(typeof result.current.animValue).toBe('object');
  });
});
