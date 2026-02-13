import React from 'react';
import Svg, { Path, G, Ellipse, Circle, Rect, Line, Text as SvgText } from 'react-native-svg';

import { colors } from '../../styles/common';

export const AppLogoIcon: React.FC = () => (
  <Svg width={46} height={46} viewBox="0 0 50 50">
    <Path
      d="M28 4 L28 18 Q28 26 20 26 Q12 26 12 18"
      stroke="white"
      strokeWidth={2.5}
      fill="none"
      strokeLinecap="round"
      opacity={0.9}
    />
    <G transform="translate(6, 24)">
      <Ellipse cx={18} cy={10} rx={16} ry={7} fill="#2D9596" />
      <Ellipse cx={18} cy={12} rx={12} ry={4} fill="#4DB6AC" />
      <Path d="M32 10 Q40 5 38 10 Q40 15 32 10" fill="#E57373" />
      <Circle cx={6} cy={8} r={2.5} fill="white" />
      <Circle cx={7} cy={8} r={1.5} fill="#1A1A1A" />
    </G>
  </Svg>
);

export const AnglerAvatarIcon: React.FC = () => (
  <Svg width={32} height={32} viewBox="0 0 40 40">
    <Circle cx={12} cy={10} r={5} fill="white" opacity={0.9} />
    <Path d="M7 18 Q7 14 12 14 Q17 14 17 18 L17 28 L7 28 Z" fill="white" opacity={0.9} />
    <Path d="M16 16 L30 6" stroke="white" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.9} />
    <Path d="M30 6 L32 16" stroke="white" strokeWidth={1} fill="none" opacity={0.7} />
    <G transform="translate(28, 18)">
      <Ellipse cx={5} cy={4} rx={5} ry={3} fill="#FFB74D" />
      <Path d="M9 4 Q12 2 11 4 Q12 6 9 4" fill="#FF8F00" />
      <Circle cx={2} cy={3} r={1} fill="white" />
    </G>
  </Svg>
);

export const JumpingFishIcon: React.FC = () => (
  <Svg width={32} height={26} viewBox="0 0 50 40">
    <Ellipse cx={25} cy={36} rx={14} ry={3} fill="#64B5F6" opacity={0.3} />
    <Ellipse cx={12} cy={28} rx={2.5} ry={3.5} fill="#64B5F6" opacity={0.6} />
    <Ellipse cx={38} cy={26} rx={2} ry={3} fill="#64B5F6" opacity={0.5} />
    <G transform="translate(10, 4) rotate(-25)">
      <Ellipse cx={16} cy={10} rx={14} ry={6.5} fill="#2D9596" />
      <Ellipse cx={16} cy={12} rx={10} ry={3.5} fill="#4DB6AC" />
      <Path d="M29 10 Q36 5 34 10 Q36 15 29 10" fill="#E57373" />
      <Circle cx={6} cy={8} r={2} fill="white" />
      <Circle cx={6.5} cy={8} r={1.2} fill="#1A1A1A" />
    </G>
  </Svg>
);

export const StackedFishIcon: React.FC = () => (
  <Svg width={32} height={28} viewBox="0 0 50 45">
    <G transform="translate(5, 0)">
      <Ellipse cx={20} cy={10} rx={18} ry={7} fill="#90CAF9" opacity={0.5} />
      <Path d="M36 10 Q44 5 42 10 Q44 15 36 10" fill="#64B5F6" opacity={0.5} />
    </G>
    <G transform="translate(2, 10)">
      <Ellipse cx={20} cy={10} rx={18} ry={7} fill="#4DB6AC" opacity={0.7} />
      <Path d="M36 10 Q44 5 42 10 Q44 15 36 10" fill="#26A69A" opacity={0.7} />
    </G>
    <G transform="translate(0, 20)">
      <Ellipse cx={20} cy={10} rx={18} ry={7} fill="#2D9596" />
      <Ellipse cx={20} cy={12} rx={13} ry={4} fill="#4DB6AC" />
      <Path d="M36 10 Q44 5 42 10 Q44 15 36 10" fill="#E57373" />
      <Circle cx={7} cy={9} r={2.5} fill="white" />
      <Circle cx={7.5} cy={9} r={1.5} fill="#1A1A1A" />
    </G>
  </Svg>
);

export const SwimmingFishIcon: React.FC = () => (
  <Svg width={32} height={26} viewBox="0 0 50 40">
    <G transform="translate(8, 10)">
      <Ellipse cx={18} cy={10} rx={16} ry={7} fill="#FFB74D" />
      <Ellipse cx={18} cy={12} rx={12} ry={4} fill="#FFE082" />
      <Path d="M32 10 Q40 5 38 10 Q40 15 32 10" fill="#FF8F00" />
      <Circle cx={6} cy={8} r={2.5} fill="white" />
      <Circle cx={6.5} cy={8} r={1.5} fill="#1A1A1A" />
    </G>
    <Path d="M2 12 L8 12" stroke="#FFB74D" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    <Path d="M0 20 L6 20" stroke="#FFB74D" strokeWidth={2} strokeLinecap="round" opacity={0.4} />
    <Path d="M3 28 L9 28" stroke="#FFB74D" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
  </Svg>
);

export const MultipleFishIcon: React.FC = () => (
  <Svg width={34} height={28} viewBox="0 0 55 45">
    <G transform="translate(25, 2)">
      <Ellipse cx={12} cy={8} rx={11} ry={5} fill="#FFB74D" opacity={0.8} />
      <Path d="M22 8 Q28 4 26 8 Q28 12 22 8" fill="#FF8F00" opacity={0.8} />
      <Circle cx={5} cy={7} r={1.5} fill="white" />
    </G>
    <G transform="translate(0, 12)">
      <Ellipse cx={16} cy={10} rx={14} ry={6} fill="#2D9596" />
      <Ellipse cx={16} cy={12} rx={10} ry={3.5} fill="#4DB6AC" />
      <Path d="M28 10 Q36 5 34 10 Q36 15 28 10" fill="#E57373" />
      <Circle cx={6} cy={8} r={2} fill="white" />
      <Circle cx={6.5} cy={8} r={1.2} fill="#1A1A1A" />
    </G>
    <G transform="translate(22, 26)">
      <Ellipse cx={14} cy={8} rx={12} ry={5.5} fill="#81C784" opacity={0.8} />
      <Path d="M25 8 Q32 4 30 8 Q32 12 25 8" fill="#4CAF50" opacity={0.8} />
      <Circle cx={5} cy={7} r={1.8} fill="white" />
    </G>
  </Svg>
);

export const LicenseCardIcon: React.FC = () => (
  <Svg width={30} height={22} viewBox="0 0 50 36">
    <Rect x={2} y={4} width={46} height={28} rx={4} fill="#E3EBF6" />
    <Rect x={2} y={4} width={46} height={10} fill={colors.primary} />
    <Rect x={6} y={18} width={14} height={10} fill="#CC0000" />
    <Rect x={13} y={18} width={7} height={10} fill="white" />
    <SvgText x={8} y={26} fontSize={6} fill="white" fontWeight="bold">NC</SvgText>
    <Line x1={24} y1={20} x2={42} y2={20} stroke={colors.primary} strokeWidth={2} strokeLinecap="round" opacity={0.3} />
    <Line x1={24} y1={26} x2={38} y2={26} stroke={colors.primary} strokeWidth={2} strokeLinecap="round" opacity={0.3} />
  </Svg>
);
