import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, G, Ellipse, Circle } from 'react-native-svg';

// Types (duplicated locally to avoid circular imports)
export interface SpeciesTheme {
  id: string;
  name: string;
  primary: string;
  light: string;
  icon: string;
  gradient: [string, string];
}

export type PlaceholderSize = 'small' | 'medium' | 'large';

interface SizeConfig {
  container: { height: number };
  fishScale: number;
  fishWidth: number;
  fishHeight: number;
}

export const SIZE_CONFIGS: Record<PlaceholderSize, SizeConfig> = {
  small: {
    container: { height: 110 },
    fishScale: 0.6,
    fishWidth: 72,
    fishHeight: 48,
  },
  medium: {
    container: { height: 160 },
    fishScale: 0.8,
    fishWidth: 96,
    fishHeight: 64,
  },
  large: {
    container: { height: 220 },
    fishScale: 1.4,
    fishWidth: 168,
    fishHeight: 112,
  },
};

/**
 * Generic fish SVG that can be colored with species theme.
 */
export const FishSvg: React.FC<{
  width: number;
  height: number;
  theme: SpeciesTheme;
}> = ({ width, height, theme }) => (
  <Svg width={width} height={height} viewBox="0 0 120 80">
    {/* Main body */}
    <Ellipse cx={55} cy={40} rx={45} ry={22} fill={theme.primary} opacity={0.9} />
    {/* Belly highlight */}
    <Ellipse cx={55} cy={48} rx={35} ry={12} fill={theme.light} opacity={0.7} />
    {/* Tail fin */}
    <Path
      d="M98 40 Q120 25 115 40 Q120 55 98 40"
      fill={theme.icon}
      opacity={0.9}
    />
    {/* Dorsal fin */}
    <Path
      d="M40 18 Q55 5 70 18"
      fill={theme.icon}
      opacity={0.7}
    />
    {/* Pectoral fin */}
    <Ellipse cx={45} cy={52} rx={12} ry={6} fill={theme.icon} opacity={0.6} />
    {/* Eye */}
    <Circle cx={25} cy={36} r={8} fill="white" />
    <Circle cx={27} cy={36} r={5} fill="#1A1A1A" />
    <Circle cx={29} cy={34} r={2} fill="white" opacity={0.8} />
  </Svg>
);

/**
 * Red Drum specific illustration (copper/bronze body with spot).
 */
export const RedDrumSvg: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Svg width={width} height={height} viewBox="0 0 120 80">
    {/* Main body - copper/bronze */}
    <Ellipse cx={55} cy={40} rx={45} ry={20} fill="#E57373" opacity={0.9} />
    {/* Belly */}
    <Ellipse cx={55} cy={48} rx={38} ry={10} fill="#FFCDD2" opacity={0.8} />
    {/* Tail fin */}
    <Path d="M98 40 Q118 26 113 40 Q118 54 98 40" fill="#C62828" opacity={0.9} />
    {/* Dorsal fin */}
    <Path d="M35 20 Q52 6 75 20" fill="#C62828" opacity={0.7} />
    {/* Characteristic tail spot */}
    <Circle cx={92} cy={40} r={6} fill="#1A1A1A" opacity={0.7} />
    {/* Eye */}
    <Circle cx={22} cy={38} r={7} fill="white" />
    <Circle cx={24} cy={38} r={4} fill="#1A1A1A" />
    <Circle cx={26} cy={36} r={1.5} fill="white" opacity={0.8} />
  </Svg>
);

/**
 * Flounder specific illustration (flat, bottom-dweller).
 */
export const FlounderSvg: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Svg width={width} height={height} viewBox="0 0 120 80">
    {/* Main body - flat oval */}
    <Ellipse cx={55} cy={45} rx={48} ry={18} fill="#8D6E63" opacity={0.9} />
    {/* Belly/underside */}
    <Ellipse cx={55} cy={52} rx={40} ry={8} fill="#D7CCC8" opacity={0.7} />
    {/* Tail fin */}
    <Path d="M100 45 Q115 35 112 45 Q115 55 100 45" fill="#5D4037" opacity={0.9} />
    {/* Dorsal fin (runs along top) */}
    <Path d="M20 28 Q55 18 90 28" fill="#5D4037" opacity={0.6} />
    {/* Spots pattern */}
    <Circle cx={35} cy={42} r={4} fill="#5D4037" opacity={0.4} />
    <Circle cx={50} cy={38} r={3} fill="#5D4037" opacity={0.3} />
    <Circle cx={68} cy={40} r={4} fill="#5D4037" opacity={0.4} />
    <Circle cx={80} cy={44} r={3} fill="#5D4037" opacity={0.3} />
    {/* Both eyes on top side */}
    <Circle cx={20} cy={40} r={6} fill="white" />
    <Circle cx={21} cy={40} r={4} fill="#1A1A1A" />
    <Circle cx={30} cy={38} r={5} fill="white" />
    <Circle cx={31} cy={38} r={3} fill="#1A1A1A" />
  </Svg>
);

/**
 * Spotted Seatrout illustration (silver-green with spots).
 */
export const SeatroutSvg: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Svg width={width} height={height} viewBox="0 0 120 80">
    {/* Main body */}
    <Ellipse cx={55} cy={40} rx={45} ry={18} fill="#4DB6AC" opacity={0.9} />
    {/* Belly */}
    <Ellipse cx={55} cy={48} rx={38} ry={10} fill="#B2DFDB" opacity={0.8} />
    {/* Tail fin */}
    <Path d="M98 40 Q116 28 112 40 Q116 52 98 40" fill="#00897B" opacity={0.9} />
    {/* Dorsal fin */}
    <Path d="M38 22 Q55 10 72 22" fill="#00897B" opacity={0.7} />
    {/* Characteristic spots */}
    <Circle cx={30} cy={38} r={3} fill="#004D40" opacity={0.5} />
    <Circle cx={42} cy={35} r={2.5} fill="#004D40" opacity={0.4} />
    <Circle cx={55} cy={36} r={3} fill="#004D40" opacity={0.5} />
    <Circle cx={68} cy={38} r={2.5} fill="#004D40" opacity={0.4} />
    <Circle cx={80} cy={36} r={2} fill="#004D40" opacity={0.3} />
    {/* Eye */}
    <Circle cx={20} cy={38} r={6} fill="white" />
    <Circle cx={22} cy={38} r={4} fill="#1A1A1A" />
    <Circle cx={24} cy={36} r={1.5} fill="white" opacity={0.8} />
  </Svg>
);

/**
 * Weakfish illustration (silver/gray).
 */
export const WeakfishSvg: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Svg width={width} height={height} viewBox="0 0 120 80">
    {/* Main body - silvery */}
    <Ellipse cx={55} cy={40} rx={44} ry={17} fill="#90A4AE" opacity={0.9} />
    {/* Belly */}
    <Ellipse cx={55} cy={47} rx={36} ry={9} fill="#ECEFF1" opacity={0.85} />
    {/* Tail fin */}
    <Path d="M97 40 Q114 30 110 40 Q114 50 97 40" fill="#546E7A" opacity={0.9} />
    {/* Dorsal fin */}
    <Path d="M40 23 Q55 12 70 23" fill="#546E7A" opacity={0.7} />
    {/* Subtle markings */}
    <Path d="M30 42 Q55 38 80 42" stroke="#78909C" strokeWidth={1} fill="none" opacity={0.4} />
    {/* Eye */}
    <Circle cx={22} cy={38} r={6} fill="white" />
    <Circle cx={24} cy={38} r={4} fill="#1A1A1A" />
    <Circle cx={26} cy={36} r={1.5} fill="white" opacity={0.8} />
  </Svg>
);

/**
 * Striped Bass illustration (silver with dark stripes).
 */
export const StripedBassSvg: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Svg width={width} height={height} viewBox="0 0 120 80">
    {/* Main body - silver */}
    <Ellipse cx={55} cy={40} rx={46} ry={20} fill="#B0BEC5" opacity={0.9} />
    {/* Belly */}
    <Ellipse cx={55} cy={50} rx={38} ry={10} fill="#ECEFF1" opacity={0.85} />
    {/* Horizontal stripes */}
    <Path d="M18 32 Q55 28 92 32" stroke="#1E3A5F" strokeWidth={2.5} fill="none" opacity={0.7} />
    <Path d="M15 40 Q55 36 95 40" stroke="#1E3A5F" strokeWidth={2.5} fill="none" opacity={0.7} />
    <Path d="M18 48 Q55 44 92 48" stroke="#1E3A5F" strokeWidth={2.5} fill="none" opacity={0.7} />
    {/* Tail fin */}
    <Path d="M99 40 Q118 28 114 40 Q118 52 99 40" fill="#1E3A5F" opacity={0.9} />
    {/* Dorsal fins */}
    <Path d="M30 20 Q40 10 50 20" fill="#37474F" opacity={0.7} />
    <Path d="M55 20 Q65 12 75 20" fill="#37474F" opacity={0.7} />
    {/* Eye */}
    <Circle cx={20} cy={38} r={7} fill="white" />
    <Circle cx={22} cy={38} r={4.5} fill="#1A1A1A" />
    <Circle cx={24} cy={36} r={1.5} fill="white" opacity={0.8} />
  </Svg>
);

/**
 * Bubble decoration around the fish.
 */
export const Bubbles: React.FC<{ size: PlaceholderSize }> = ({ size }) => {
  const scale = SIZE_CONFIGS[size].fishScale;
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox="0 0 200 150"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Bubbles */}
      <Circle cx={40 * scale + 20} cy={30 * scale + 20} r={4 * scale} fill="white" opacity={0.3} />
      <Circle cx={35 * scale + 20} cy={50 * scale + 20} r={3 * scale} fill="white" opacity={0.25} />
      <Circle cx={45 * scale + 20} cy={70 * scale + 20} r={2.5 * scale} fill="white" opacity={0.2} />
      <Circle cx={160 * scale + 20} cy={40 * scale + 20} r={3.5 * scale} fill="white" opacity={0.25} />
      <Circle cx={155 * scale + 20} cy={60 * scale + 20} r={2.5 * scale} fill="white" opacity={0.2} />
    </Svg>
  );
};
