// hooks/usePulseAnimation.ts
//
// Shared hook for looping pulse animations.
// Used by HomeScreen (badge pulse) and CatchFeedScreen (live dot pulse).
//

import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface PulseAnimationOptions {
  /** Duration of one half-cycle in ms (default: 1000) */
  duration?: number;
  /** Whether the animation should be running (default: true) */
  enabled?: boolean;
  /** Whether to use native driver (default: true). Set false for color interpolation. */
  useNativeDriver?: boolean;
}

interface PulseAnimationResult {
  /** The animated value oscillating between 0 and 1 */
  pulseValue: Animated.Value;
}

/**
 * Creates a looping pulse animation that oscillates between 0 and 1.
 *
 * Usage:
 * ```tsx
 * const { pulseValue } = usePulseAnimation({ duration: 1500, enabled: isLive });
 *
 * const opacity = pulseValue.interpolate({
 *   inputRange: [0, 1],
 *   outputRange: [1, 0.4],
 * });
 * ```
 */
export function usePulseAnimation(options: PulseAnimationOptions = {}): PulseAnimationResult {
  const {
    duration = 1000,
    enabled = true,
    useNativeDriver = true,
  } = options;

  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      pulseValue.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration,
          useNativeDriver,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration,
          useNativeDriver,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [enabled, duration, useNativeDriver, pulseValue]);

  return { pulseValue };
}
