import { renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';

jest.mock('../../src/constants/ui', () => ({
  HEADER_HEIGHT: 100,
}));

import { useFloatingHeaderAnimation } from '../../src/hooks/useFloatingHeaderAnimation';

describe('useFloatingHeaderAnimation', () => {
  it('returns scrollY as an Animated.Value', () => {
    const { result } = renderHook(() => useFloatingHeaderAnimation());

    expect(result.current.scrollY).toBeInstanceOf(Animated.Value);
  });

  it('returns floatingOpacity as an interpolation', () => {
    const { result } = renderHook(() => useFloatingHeaderAnimation());

    expect(result.current.floatingOpacity).toBeDefined();
  });

  it('returns floatingTranslateXLeft as an interpolation', () => {
    const { result } = renderHook(() => useFloatingHeaderAnimation());

    expect(result.current.floatingTranslateXLeft).toBeDefined();
  });

  it('returns floatingTranslateXRight as an interpolation', () => {
    const { result } = renderHook(() => useFloatingHeaderAnimation());

    expect(result.current.floatingTranslateXRight).toBeDefined();
  });

  it('maintains stable references across re-renders', () => {
    const { result, rerender } = renderHook(() => useFloatingHeaderAnimation());

    const firstScrollY = result.current.scrollY;
    rerender({});

    // scrollY uses useRef, so it should be the same object
    expect(result.current.scrollY).toBe(firstScrollY);
  });
});
