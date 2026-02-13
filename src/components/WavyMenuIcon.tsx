// components/WavyMenuIcon.tsx
// Wavy hamburger menu icon that looks like ocean waves

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface WavyMenuIconProps {
  size?: number;
  color?: string;
}

export const WavyMenuIcon: React.FC<WavyMenuIconProps> = ({
  size = 24,
  color = '#fff'
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <Path
      d="M3 6 Q6 4 9 6 Q12 8 15 6 Q18 4 21 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M3 12 Q6 10 9 12 Q12 14 15 12 Q18 10 21 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M3 18 Q6 16 9 18 Q12 20 15 18 Q18 16 21 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

export default WavyMenuIcon;
