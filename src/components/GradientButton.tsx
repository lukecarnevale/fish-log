import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../styles/common';

/**
 * GradientButton Component
 *
 * A flexible button component that wraps TouchableOpacity with a LinearGradient overlay.
 * Useful for creating visually appealing CTAs with gradient backgrounds.
 *
 * @example
 * ```tsx
 * <GradientButton
 *   colors={[colors.primary, '#1976D2']}
 *   onPress={() => navigation.navigate('Report')}
 *   style={{ marginVertical: 16 }}
 * >
 *   <Feather name="plus" size={18} color={colors.white} />
 *   <Text style={{ color: colors.white }}>Report Your Catch</Text>
 * </GradientButton>
 * ```
 */

export interface GradientButtonProps {
  /** Array of at least two colors for the gradient */
  colors?: readonly [string, string, ...string[]];
  /** Gradient start point */
  start?: { x: number; y: number };
  /** Gradient end point */
  end?: { x: number; y: number };
  /** Handler called when button is pressed */
  onPress?: () => void;
  /** Style object for the TouchableOpacity container */
  style?: ViewStyle;
  /** Opacity value when button is pressed (0-1) */
  activeOpacity?: number;
  /** Button content - typically Icon + Text */
  children?: React.ReactNode;
  /** Whether the button is disabled */
  disabled?: boolean;
}

export const GradientButton = React.forwardRef<View, GradientButtonProps>(
  (
    {
      colors: gradientColors = [colors.primary, '#1976D2'],
      start = { x: 0, y: 0 },
      end = { x: 1, y: 0 },
      onPress,
      style,
      activeOpacity = 0.85,
      children,
      disabled = false,
    },
    ref
  ) => {
    return (
      <TouchableOpacity
        ref={ref}
        style={[styles.container, style]}
        onPress={onPress}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        <LinearGradient
          colors={gradientColors}
          start={start}
          end={end}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </TouchableOpacity>
    );
  }
);

GradientButton.displayName = 'GradientButton';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});

export default GradientButton;
