import React from 'react';
import Svg, { Ellipse, Path, Circle } from 'react-native-svg';

export const FishIcon: React.FC<{ bodyColor: string; tailColor: string }> = ({ bodyColor, tailColor }) => (
  <Svg width={26} height={18} viewBox="0 0 40 28">
    <Ellipse cx={18} cy={14} rx={16} ry={8} fill={bodyColor} />
    <Path d="M32 14 Q40 8 38 14 Q40 20 32 14" fill={tailColor} />
    <Circle cx={6} cy={12} r={2} fill="white" />
  </Svg>
);
