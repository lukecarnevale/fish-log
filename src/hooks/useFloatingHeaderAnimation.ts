// hooks/useFloatingHeaderAnimation.ts
//
// Shared hook for the floating header/back-button animation pattern.
// Used by HomeScreen, CatchFeedScreen, and ReportFormScreen.
//
// As the user scrolls past HEADER_HEIGHT, a floating element fades in
// with a horizontal slide animation.

import { useRef } from 'react';
import { Animated } from 'react-native';
import { HEADER_HEIGHT } from '../constants/ui';

interface FloatingHeaderAnimation {
  /** Animated scroll value — pass to Animated.event onScroll */
  scrollY: Animated.Value;
  /** Opacity value for the floating element (0 → 1 as user scrolls past header) */
  floatingOpacity: Animated.AnimatedInterpolation<number>;
  /** Pre-built translateX interpolation for slide-in from the left (-60 → 0) */
  floatingTranslateXLeft: Animated.AnimatedInterpolation<number>;
  /** Pre-built translateX interpolation for slide-in from the right (60 → 0) */
  floatingTranslateXRight: Animated.AnimatedInterpolation<number>;
}

/**
 * Creates the floating header scroll animation values.
 *
 * Usage:
 * ```tsx
 * const { scrollY, floatingOpacity, floatingTranslateXLeft } = useFloatingHeaderAnimation();
 *
 * // In onScroll:
 * onScroll={Animated.event(
 *   [{ nativeEvent: { contentOffset: { y: scrollY } } }],
 *   { useNativeDriver: true }
 * )}
 *
 * // In render:
 * <Animated.View style={{ opacity: floatingOpacity, transform: [{ translateX: floatingTranslateXLeft }] }}>
 * ```
 */
export function useFloatingHeaderAnimation(): FloatingHeaderAnimation {
  const scrollY = useRef(new Animated.Value(0)).current;

  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.5, HEADER_HEIGHT],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const floatingTranslateXLeft = floatingOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  const floatingTranslateXRight = floatingOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  return {
    scrollY,
    floatingOpacity,
    floatingTranslateXLeft,
    floatingTranslateXRight,
  };
}
