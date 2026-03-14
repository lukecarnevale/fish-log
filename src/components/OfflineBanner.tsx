// components/OfflineBanner.tsx
//
// Animated offline indicator that slides in when the device loses
// connectivity and slides out when it returns. Uses the advisory bulletin
// styling (orange accent) to match the app's bulletin design language.

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, borderRadius } from '../styles/common';
import { BULLETIN_TYPE_CONFIG } from '../constants/bulletin';

interface OfflineBannerProps {
  /** Whether the device is currently online */
  isOnline: boolean;
  /** Optional message override (default: "You're offline") */
  message?: string;
  /** Number of reports waiting to sync (shown as a secondary detail) */
  pendingCount?: number;
}

const advisory = BULLETIN_TYPE_CONFIG.advisory;
const BANNER_HEIGHT = 44;

const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  message = "You're offline",
  pendingCount = 0,
}) => {
  // Visual animation (native driver — smooth 60fps slide + fade)
  const slideAnim = useRef(new Animated.Value(isOnline ? 0 : 1)).current;
  // Layout animation (JS driver — collapses height so it doesn't push content down)
  const layoutAnim = useRef(new Animated.Value(isOnline ? 0 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOnline ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(layoutAnim, {
        toValue: isOnline ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isOnline, slideAnim, layoutAnim]);

  // Interpolate: 0 → collapsed (translated up out of view), 1 → visible
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-BANNER_HEIGHT, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Layout interpolations — collapse space when online
  const maxHeight = layoutAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BANNER_HEIGHT + 16],
  });

  const marginBottom = layoutAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, spacing.sm],
  });

  return (
    <Animated.View style={{ maxHeight, marginBottom, overflow: 'hidden' }}>
    <Animated.View
      style={[
        styles.containerInner,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={isOnline ? 'none' : 'auto'}
    >
      <View style={styles.inner}>
        <Feather name="wifi-off" size={13} color={advisory.color} />
        <Text style={styles.message}>{message}</Text>
        {pendingCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {pendingCount} queued
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  containerInner: {
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: advisory.badgeBg,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: `${advisory.color}30`,
    gap: 8,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    color: advisory.color,
    letterSpacing: 0.2,
  },
  countBadge: {
    backgroundColor: `${advisory.color}18`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: advisory.color,
  },
});

export default React.memo(OfflineBanner);
