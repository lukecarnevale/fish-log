// components/CardBadges.tsx
//
// Playful badge components for quick action cards.
// Includes counters, notification dots, and activity indicators.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================
// COUNTER BUBBLE
// Circular badge with count, gradient, and shine
// ============================================

interface CounterBubbleProps {
  count: number;
  /** Gradient colors [start, end] */
  gradientColors: [string, string];
  /** Box shadow color with opacity */
  shadowColor: string;
  /** Size in pixels (default 32) */
  size?: number;
  /** Delay before animation starts in ms (default 0) */
  delay?: number;
}

export const CounterBubble: React.FC<CounterBubbleProps> = ({
  count,
  gradientColors,
  shadowColor,
  size = 32,
  delay = 0,
}) => {
  const fontSize = size < 30 ? 11 : 13;
  const shineSize = Math.round(size * 0.25);

  // Entrance animation
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(entranceAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [entranceAnim, delay]);

  const scale = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <Animated.View style={[
      styles.counterBubble,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor,
        opacity: entranceAnim,
        transform: [{ scale }],
      },
    ]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.counterGradient, { borderRadius: size / 2 }]}
      >
        <Text style={[styles.counterText, { fontSize }]}>
          {count > 99 ? '99+' : count}
        </Text>
        {/* Shine effect */}
        <View style={[
          styles.counterShine,
          {
            width: shineSize,
            height: shineSize,
            borderRadius: shineSize / 2,
          },
        ]} />
      </LinearGradient>
    </Animated.View>
  );
};

// ============================================
// NEW DOT NOTIFICATION
// Small pulsing dot indicator
// ============================================

interface NewDotNotificationProps {
  /** Whether to show the dot */
  visible: boolean;
  /** Color of the dot (default amber) */
  color?: string;
  /** Size in pixels (default 12) */
  size?: number;
  /** Delay before animation starts in ms (default 0) */
  delay?: number;
}

export const NewDotNotification: React.FC<NewDotNotificationProps> = ({
  visible,
  color = '#f59e0b',
  size = 12,
  delay = 0,
}) => {
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        // Entrance animation first, then start pulsing
        entranceAnim.setValue(0);
        Animated.spring(entranceAnim, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }).start(() => {
          // Start pulsing after entrance
          const pulse = Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.3,
                duration: 800,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 800,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          );
          pulse.start();
        });
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [visible, entranceAnim, pulseAnim, delay]);

  if (!visible) return null;

  // Combine entrance scale with pulse scale
  const combinedScale = Animated.multiply(entranceAnim, pulseAnim);

  return (
    <Animated.View style={[
      styles.newDot,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: entranceAnim,
        transform: [{ scale: combinedScale }],
      },
    ]} />
  );
};

// ============================================
// ACTIVITY BADGE
// Pill-shaped "+X new" badge
// ============================================

interface ActivityBadgeProps {
  count: number;
  /** Gradient colors [start, end] */
  gradientColors: [string, string];
  /** Box shadow color with opacity */
  shadowColor: string;
  /** Delay before animation starts in ms (default 0) */
  delay?: number;
}

export const ActivityBadge: React.FC<ActivityBadgeProps> = ({
  count,
  gradientColors,
  shadowColor,
  delay = 0,
}) => {
  // Entrance animation
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => {
        entranceAnim.setValue(0);
        Animated.spring(entranceAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [count, entranceAnim, delay]);

  if (count <= 0) return null;

  const scale = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <Animated.View style={[
      styles.activityBadge,
      {
        shadowColor,
        opacity: entranceAnim,
        transform: [{ scale }],
      },
    ]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.activityBadgeGradient}
      >
        <Text style={styles.activityBadgeText}>
          +{count > 99 ? '99' : count} new
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

// ============================================
// ACTIVITY DOTS
// 3 small bouncing dots with staggered animation
// ============================================

interface ActivityDotsProps {
  /** Whether to show and animate the dots */
  visible: boolean;
  /** Color of the dots (default green) */
  color?: string;
  /** Size of each dot in pixels (default 6) */
  dotSize?: number;
  /** Delay before animation starts in ms (default 0) */
  delay?: number;
}

export const ActivityDots: React.FC<ActivityDotsProps> = ({
  visible,
  color = '#48bb78',
  dotSize = 6,
  delay = 0,
}) => {
  // Entrance animation
  const entranceAnim = useRef(new Animated.Value(0)).current;
  // Single master animation value that coordinates all dots
  const masterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        // Entrance fade-in first
        entranceAnim.setValue(0);
        Animated.timing(entranceAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();

        // Reset bounce animation
        masterAnim.setValue(0);

        // Single loop that drives all three dots
        // Full cycle is 2400ms for a soft, gentle bounce
        const animation = Animated.loop(
          Animated.timing(masterAnim, {
            toValue: 1,
            duration: 2400,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );

        animation.start();
      }, delay);

      return () => {
        clearTimeout(timer);
        masterAnim.stopAnimation();
      };
    } else {
      masterAnim.setValue(0);
    }
  }, [visible, entranceAnim, masterAnim, delay]);

  if (!visible) return null;

  // Create gentle wave effect: each dot bounces softly during its portion
  // Bounce (-5px) with slow timing for a calm, noticeable effect
  const bounce1 = masterAnim.interpolate({
    inputRange: [0, 0.08, 0.20, 0.40, 1],
    outputRange: [0, -5, 0, 0, 0],
  });

  const bounce2 = masterAnim.interpolate({
    inputRange: [0, 0.12, 0.20, 0.32, 0.50, 1],
    outputRange: [0, 0, -5, 0, 0, 0],
  });

  const bounce3 = masterAnim.interpolate({
    inputRange: [0, 0.24, 0.32, 0.44, 0.60, 1],
    outputRange: [0, 0, -5, 0, 0, 0],
  });

  const dotStyle = {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: color,
  };

  return (
    <Animated.View style={[styles.activityDotsContainer, { opacity: entranceAnim }]}>
      <Animated.View style={[dotStyle, { transform: [{ translateY: bounce1 }] }]} />
      <Animated.View style={[dotStyle, { transform: [{ translateY: bounce2 }] }]} />
      <Animated.View style={[dotStyle, { transform: [{ translateY: bounce3 }] }]} />
    </Animated.View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Counter Bubble
  counterBubble: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  counterGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  counterShine: {
    position: 'absolute',
    top: 4,
    left: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },

  // New Dot
  newDot: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },

  // Activity Badge
  activityBadge: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  activityBadgeGradient: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activityBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Activity Dots
  activityDotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
});

export default {
  CounterBubble,
  NewDotNotification,
  ActivityBadge,
  ActivityDots,
};
