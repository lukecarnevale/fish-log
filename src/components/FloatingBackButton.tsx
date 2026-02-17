// components/FloatingBackButton.tsx
//
// Shared floating back button that slides in from the left when the user
// scrolls past the static header. Uses useFloatingHeaderAnimation values.

import React from 'react';
import { Animated, TouchableOpacity, Platform, StatusBar, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, borderRadius } from '../styles/common';

interface FloatingBackButtonProps {
  opacity: Animated.AnimatedInterpolation<number>;
  translateX: Animated.AnimatedInterpolation<number>;
  onPress: () => void;
}

const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
  opacity,
  translateX,
  onPress,
}) => (
  <Animated.View
    style={[
      fbStyles.container,
      {
        opacity,
        transform: [{ translateX }],
      },
    ]}
  >
    <TouchableOpacity
      onPress={onPress}
      style={fbStyles.touchable}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
    >
      <Feather name="arrow-left" size={22} color={colors.white} />
    </TouchableOpacity>
  </Animated.View>
);

const fbStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 52,
    left: 16,
    zIndex: 100,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  touchable: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FloatingBackButton;
