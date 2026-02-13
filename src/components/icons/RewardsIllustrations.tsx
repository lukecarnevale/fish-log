import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G, Ellipse, Circle, Rect } from 'react-native-svg';

export const WaveBackground: React.FC = () => (
  <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
    <Path d="M-100 120 Q-25 100 50 120 Q125 140 200 120 Q275 100 350 120 Q425 140 500 120 L500 200 L-100 200 Z" fill="white" opacity={0.05} />
    <Path d="M-50 145 Q25 125 100 145 Q175 165 250 145 Q325 125 400 145 Q475 165 550 145 L550 200 L-50 200 Z" fill="white" opacity={0.07} />
    <Path d="M-80 170 Q-5 155 70 170 Q145 185 220 170 Q295 155 370 170 Q445 185 520 170 L520 200 L-80 200 Z" fill="white" opacity={0.05} />
  </Svg>
);

export const HeroFishIllustration: React.FC = () => (
  <Svg width={90} height={70} viewBox="0 0 90 70">
    <G transform="translate(25, 35)">
      <Ellipse cx={28} cy={14} rx={26} ry={12} fill="#FFB74D" opacity={0.9} />
      <Ellipse cx={28} cy={18} rx={20} ry={6} fill="#FFE082" opacity={0.9} />
      <Path d="M52 14 Q66 5 61 14 Q66 23 52 14" fill="#FF8F00" opacity={0.9} />
      <Circle cx={10} cy={12} r={3.5} fill="white" />
      <Circle cx={11} cy={12} r={2} fill="#1A1A1A" />
    </G>
    <G transform="translate(0, 5)">
      <Ellipse cx={24} cy={12} rx={22} ry={10} fill="white" opacity={0.25} />
      <Ellipse cx={24} cy={15} rx={17} ry={5.5} fill="white" opacity={0.15} />
      <Path d="M44 12 Q56 4 52 12 Q56 20 44 12" fill="white" opacity={0.2} />
      <Circle cx={9} cy={10} r={3} fill="white" opacity={0.4} />
    </G>
  </Svg>
);

export const FishingRodIllustration: React.FC = () => (
  <Svg width={60} height={50} viewBox="0 0 70 55">
    <Path d="M10 48 L10 18 Q10 12 16 10 L55 10" stroke="#8D6E63" strokeWidth={3} strokeLinecap="round" fill="none" />
    <Circle cx={10} cy={38} r={7} fill="#5D4037" />
    <Circle cx={10} cy={38} r={4} fill="#8D6E63" />
    <Path d="M55 10 L55 24" stroke="#90A4AE" strokeWidth={1.5} />
    <G transform="translate(42, 26)">
      <Ellipse cx={13} cy={7} rx={12} ry={5.5} fill="#FFB74D" />
      <Ellipse cx={13} cy={9} rx={9} ry={3} fill="#FFE082" />
      <Path d="M24 7 Q30 3 28 7 Q30 11 24 7" fill="#FF8F00" />
      <Circle cx={5} cy={6} r={2} fill="white" />
    </G>
  </Svg>
);

export const LicenseCardIllustration: React.FC = () => (
  <Svg width={60} height={45} viewBox="0 0 70 50">
    <Rect x={5} y={8} width={60} height={38} rx={4} fill="#E3EBF6" />
    <Rect x={5} y={8} width={60} height={12} fill="#1E3A5F" />
    <G transform="translate(20, 28)">
      <Ellipse cx={15} cy={8} rx={14} ry={6} fill="#2D9596" />
      <Ellipse cx={15} cy={10} rx={10} ry={3.5} fill="#4DB6AC" />
      <Path d="M28 8 Q35 3 33 8 Q35 13 28 8" fill="#E57373" />
      <Circle cx={6} cy={7} r={2} fill="white" />
    </G>
  </Svg>
);

export const GenericPrizeIllustration: React.FC = () => (
  <Svg width={60} height={50} viewBox="0 0 60 50">
    <Rect x={10} y={20} width={40} height={28} rx={4} fill="#E3EBF6" />
    <Rect x={22} y={8} width={16} height={12} rx={2} fill="#1E3A5F" />
    <Path d="M18 20 L30 8 L42 20" fill="#2D5A87" />
    <Circle cx={30} cy={34} r={8} fill="#FFB74D" />
    <Circle cx={30} cy={34} r={4} fill="#FFE082" />
  </Svg>
);

export const SwimmingFishButton: React.FC = () => (
  <View style={{ position: 'absolute', right: -8, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
    <Svg width={50} height={32} viewBox="0 0 60 40">
      <Circle cx={8} cy={20} r={2.5} fill="white" opacity={0.5} />
      <Circle cx={15} cy={17} r={2} fill="white" opacity={0.4} />
      <Circle cx={20} cy={21} r={1.5} fill="white" opacity={0.3} />
      <G transform="translate(22, 8)">
        <Ellipse cx={18} cy={12} rx={17} ry={8} fill="#2D9596" />
        <Ellipse cx={18} cy={15} rx={13} ry={5} fill="#4DB6AC" />
        <Path d="M34 12 Q44 5 40 12 Q44 19 34 12" fill="#E57373" />
        <Circle cx={6} cy={10} r={3} fill="white" />
        <Circle cx={7} cy={10} r={1.8} fill="#1A1A1A" />
        <G stroke="#1A6B6C" strokeWidth={0.7} fill="none" opacity={0.4}>
          <Path d="M12 11 Q14 9 16 11" />
          <Path d="M18 11 Q20 9 22 11" />
          <Path d="M24 11 Q26 9 28 11" />
        </G>
      </G>
    </Svg>
  </View>
);
