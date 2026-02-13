import React from "react";
import Svg, { Circle, Path, G, Ellipse } from 'react-native-svg';
import { colors } from "../../styles/common";

/** Profile avatar - Angler with fishing rod (larger version for profile screen) */
const AnglerAvatarIcon: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    <Circle cx={12} cy={10} r={5} fill={colors.primary} opacity={0.9} />
    <Path d="M7 18 Q7 14 12 14 Q17 14 17 18 L17 28 L7 28 Z" fill={colors.primary} opacity={0.9} />
    <Path d="M16 16 L30 6" stroke={colors.primary} strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.9} />
    <Path d="M30 6 L32 16" stroke={colors.primary} strokeWidth={1} fill="none" opacity={0.7} />
    <G transform="translate(28, 18)">
      <Ellipse cx={5} cy={4} rx={5} ry={3} fill="#FFB74D" />
      <Path d="M9 4 Q12 2 11 4 Q12 6 9 4" fill="#FF8F00" />
      <Circle cx={2} cy={3} r={1} fill="white" />
    </G>
  </Svg>
);

export default AnglerAvatarIcon;
