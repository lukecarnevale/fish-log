// components/NCFlagIcon.tsx
//
// North Carolina Flag icon component rendered as a card shape.
// Uses react-native-svg to render a simplified NC flag.

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Path, Text as SvgText, G, Defs, ClipPath } from 'react-native-svg';

interface NCFlagIconProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

/**
 * Simplified North Carolina flag icon.
 * Displays the key elements: blue stripe with gold N★C, red top, white bottom.
 */
export const NCFlagIcon: React.FC<NCFlagIconProps> = ({
  width = 60,
  height = 40,
  style,
}) => {
  // Calculate proportions based on actual flag ratio (3:2)
  const blueWidth = width * 0.33;
  const stripeHeight = height / 2;

  const cornerRadius = 4;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Define clip path with uniform rounded corners */}
        <Defs>
          <ClipPath id="roundedCorners">
            <Rect x="0" y="0" width={width} height={height} rx={cornerRadius} ry={cornerRadius} />
          </ClipPath>
        </Defs>

        {/* Apply clip path to all flag content */}
        <G clipPath="url(#roundedCorners)">
          {/* White background */}
          <Rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />

          {/* Red top stripe */}
          <Rect x={blueWidth} y="0" width={width - blueWidth} height={stripeHeight} fill="#BF0A30" />

          {/* White bottom stripe (already covered by background) */}
          <Rect x={blueWidth} y={stripeHeight} width={width - blueWidth} height={stripeHeight} fill="#FFFFFF" />

          {/* Blue vertical stripe */}
          <Rect x="0" y="0" width={blueWidth} height={height} fill="#00205B" />

          {/* Gold star (simplified 5-point star) */}
          <G>
            {/* Star in center of blue stripe */}
            <Path
              d={createStarPath(blueWidth / 2, height / 2, height * 0.18, height * 0.08)}
              fill="#FFCA00"
            />
          </G>

          {/* N and C letters */}
          <SvgText
            x={blueWidth / 2}
            y={height * 0.28}
            fill="#FFCA00"
            fontSize={height * 0.22}
            fontWeight="bold"
            textAnchor="middle"
          >
            N
          </SvgText>
          <SvgText
            x={blueWidth / 2}
            y={height * 0.88}
            fill="#FFCA00"
            fontSize={height * 0.22}
            fontWeight="bold"
            textAnchor="middle"
          >
            C
          </SvgText>
        </G>
      </Svg>
    </View>
  );
};

/**
 * Create SVG path for a 5-point star.
 */
function createStarPath(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  const angleOffset = -Math.PI / 2; // Start from top

  for (let i = 0; i < 10; i++) {
    const angle = angleOffset + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return points.join(' ') + ' Z';
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default NCFlagIcon;
