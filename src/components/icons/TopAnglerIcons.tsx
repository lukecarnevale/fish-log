import React from 'react';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

export const TrophyIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 17V15M12 15C14.2091 15 16 13.2091 16 11V5H8V11C8 13.2091 9.79086 15 12 15Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 5V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M16 6H18C19.1046 6 20 6.89543 20 8V9C20 10.1046 19.1046 11 18 11H16"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M8 6H6C4.89543 6 4 6.89543 4 8V9C4 10.1046 4.89543 11 6 11H8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M9 21H15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M12 17V21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

export const FishIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Ellipse cx={12} cy={12} rx={8} ry={5} stroke={color} strokeWidth={2} />
    <Path
      d="M20 12C22 10 22 14 20 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Circle cx={7} cy={11} r={1} fill={color} />
  </Svg>
);

export const RulerIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 5H21V19H3V5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M7 5V9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M11 5V7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M15 5V9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M19 5V7" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
