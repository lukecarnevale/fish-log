// hooks/useSkeletonAnimation.ts
//
// Shared hook for the skeleton shimmer animation.
// Used by all skeleton loader components in SkeletonLoader.tsx.
//

import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface SkeletonAnimationOptions {
  /** Duration of one shimmer cycle in ms (default: 1200) */
  duration?: number;
  /** TranslateX range [from, to] (default: [-200, 200]) */
  translateRange?: [number, number];
}

interface SkeletonAnimationResult {
  /** The animated translateX value for the shimmer overlay */
  translateX: Animated.AnimatedInterpolation<number>;
}

/**
 * Creates a looping shimmer animation for skeleton loading states.
 *
 * Usage:
 * ```tsx
 * const { translateX } = useSkeletonAnimation();
 *
 * <Animated.View style={{ transform: [{ translateX }] }}>
 *   <LinearGradient colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']} />
 * </Animated.View>
 * ```
 */
export function useSkeletonAnimation(options: SkeletonAnimationOptions = {}): SkeletonAnimationResult {
  const {
    duration = 1200,
    translateRange = [-200, 200],
  } = options;

  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim, duration]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: translateRange,
  });

  return { translateX };
}
