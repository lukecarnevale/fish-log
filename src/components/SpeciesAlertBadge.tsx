// components/SpeciesAlertBadge.tsx
//
// Animated alert badge for the Species Guide quick action card.
// Shows closure (red) and advisory (orange) indicators with pulse animation.
// Follows the same animation patterns as CounterBubble and NewDotNotification.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../styles/common';

interface SpeciesAlertBadgeProps {
  /** Number of active closures. */
  closureCount: number;
  /** Number of active advisories. */
  advisoryCount: number;
  /** Total species affected. */
  totalSpeciesCount: number;
  /** Delay before animation starts in ms (default 400). */
  delay?: number;
}

export const SpeciesAlertBadge: React.FC<SpeciesAlertBadgeProps> = ({
  closureCount,
  advisoryCount,
  totalSpeciesCount,
  delay = 400,
}) => {
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const hasClosure = closureCount > 0;
  const hasAdvisory = advisoryCount > 0;
  const hasAny = hasClosure || hasAdvisory;

  useEffect(() => {
    if (!hasAny) return;

    const timer = setTimeout(() => {
      // Spring entrance
      Animated.spring(entranceAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }).start(() => {
        // Pulse loop after entrance
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: hasClosure ? 800 : 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: hasClosure ? 800 : 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        pulse.start();
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [hasAny, hasClosure, entranceAnim, pulseAnim, delay]);

  if (!hasAny) return null;

  const combinedScale = Animated.multiply(entranceAnim, pulseAnim);
  const badgeColor = hasClosure ? colors.error : colors.warning;
  const iconName = hasClosure ? 'alert-octagon' : 'alert-triangle';
  const label = hasClosure
    ? `${closureCount} closure${closureCount > 1 ? 's' : ''}`
    : `${advisoryCount} advisory`;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: badgeColor,
          opacity: entranceAnim,
          transform: [{ scale: combinedScale }],
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Species alert: ${label} affecting ${totalSpeciesCount} species`}
    >
      <Feather name={iconName} size={11} color={colors.white} />
      <Text style={styles.countText}>{totalSpeciesCount}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
  countText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default SpeciesAlertBadge;
