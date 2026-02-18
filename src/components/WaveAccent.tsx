import React, { useRef } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, ClipPath, Rect } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';
import { borderRadius as br } from '../styles/common';

// Simple incrementing counter for unique SVG IDs across all instances
let instanceCounter = 0;

interface WaveAccentProps {
  /** Primary accent color — should match the card's identity color */
  accentColor: string;
  /** Darker shade of the accent for the gradient midpoint */
  darkShade: string;
  /** Lighter shade of the accent for the gradient endpoint */
  lightShade: string;
  /** Height of the wave area. Default 28 */
  height?: number;
  /** Border radius of the parent card. Must match so corners clip correctly. Default 12 */
  borderRadius?: number;
  /** Preset name, used as part of the unique ID. Default 'default' */
  gradientId?: string;
}

export const WaveAccent: React.FC<WaveAccentProps> = ({
  accentColor,
  darkShade,
  lightShade,
  height = 28,
  borderRadius = 12,
  gradientId = 'default',
}) => {
  // Generate a unique ID per component instance to avoid SVG ID collisions
  const instanceId = useRef(`wave-${gradientId}-${++instanceCounter}`).current;
  const gradId = `grad-${instanceId}`;
  const clipId = `clip-${instanceId}`;

  // The SVG viewBox is 400 wide. Calculate the radius as a proportion of that.
  const svgRadius = (borderRadius / 400) * 400;

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 400 ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={accentColor} />
            <Stop offset="50%" stopColor={darkShade} />
            <Stop offset="100%" stopColor={lightShade} />
          </LinearGradient>
          <ClipPath id={clipId}>
            <Rect
              x="0"
              y="-100"
              width="400"
              height={height + 100}
              rx={svgRadius}
              ry={svgRadius}
            />
          </ClipPath>
        </Defs>
        {/* Primary wave layer */}
        <Path
          d="M0 12 Q50 0, 100 10 Q150 20, 200 8 Q250 -2, 300 12 Q350 22, 400 8 L400 28 L0 28 Z"
          fill={`url(#${gradId})`}
          opacity={0.85}
          clipPath={`url(#${clipId})`}
        />
        {/* Secondary wave layer for depth */}
        <Path
          d="M0 18 Q60 8, 120 16 Q180 24, 240 14 Q300 6, 360 16 Q380 20, 400 14 L400 28 L0 28 Z"
          fill={`url(#${gradId})`}
          opacity={0.35}
          clipPath={`url(#${clipId})`}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export const WAVE_PRESETS = {
  primary: {
    accentColor: '#0B548B',
    darkShade: '#06747F',
    lightShade: '#85C5E5',
    gradientId: 'primary',
    borderRadius: br.md,
  },
  info: {
    accentColor: '#1A7AAD',
    darkShade: '#06747F',
    lightShade: '#85C5E5',
    gradientId: 'info',
    borderRadius: br.md,
  },
  success: {
    accentColor: '#2E8B57',
    darkShade: '#2E7D4B',
    lightShade: '#71EEB8',
    gradientId: 'success',
    borderRadius: br.md,
  },
  warning: {
    accentColor: '#F9A825',
    darkShade: '#F57F17',
    lightShade: '#FFD54F',
    gradientId: 'warning',
    borderRadius: br.md,
  },
  error: {
    accentColor: '#D32F2F',
    darkShade: '#B71C1C',
    lightShade: '#EF9A9A',
    gradientId: 'error',
    borderRadius: br.md,
  },
} as const;
