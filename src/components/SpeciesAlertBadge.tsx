// components/SpeciesAlertBadge.tsx
//
// Animated alert badge for the Species Guide quick action card.
// Shows closure (red) and advisory (orange) indicators with pulse animation.
// Follows the same animation patterns as CounterBubble and NewDotNotification.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';

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
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const entranceAnim = useRef(new Animated.Value(0)).current;

  const hasClosure = closureCount > 0;
  const hasAdvisory = advisoryCount > 0;
  const hasAny = hasClosure || hasAdvisory;

  useEffect(() => {
    if (!hasAny) return;

    const timer = setTimeout(() => {
      Animated.spring(entranceAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [hasAny, entranceAnim, delay]);

  if (!hasAny) return null;

  const badgeColor = hasClosure ? theme.colors.error : theme.colors.warning;
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
          transform: [{ scale: entranceAnim }],
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Species alert: ${label} affecting ${totalSpeciesCount} species`}
    >
      <Feather name={iconName} size={11} color={theme.colors.white} />
      <Text style={styles.countText} maxFontSizeMultiplier={1.1}>{totalSpeciesCount}</Text>
    </Animated.View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
    shadowColor: theme.colors.error,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
  countText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default SpeciesAlertBadge;
