import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Navy blue for footer background (matches app's base)
export const FOOTER_BG = '#0B548B';

// Ghost fish decoration component
export const GhostFish: React.FC<{
  style?: object;
  width?: number;
  height?: number;
  flip?: boolean;
}> = ({ style, width = 80, height = 50, flip = false }) => (
  <View style={[{ transform: [{ scaleX: flip ? -1 : 1 }] }, style]}>
    <Svg width={width} height={height} viewBox="0 0 80 50">
      <Ellipse cx="35" cy="25" rx="30" ry="14" fill="white" />
      <Path d="M63 25 Q80 12 74 25 Q80 38 63 25" fill="white" />
    </Svg>
  </View>
);

// Wave SVG component
export const WaveTransition: React.FC = () => (
  <View style={{ backgroundColor: '#E5F4FF', height: 35 }}>
    <Svg
      width={SCREEN_WIDTH}
      height={35}
      viewBox={`0 0 ${SCREEN_WIDTH} 35`}
      preserveAspectRatio="none"
    >
      <Path
        d={`M0 0 Q${SCREEN_WIDTH * 0.1} 25 ${SCREEN_WIDTH * 0.2} 18 Q${SCREEN_WIDTH * 0.3} 11 ${SCREEN_WIDTH * 0.4} 20 Q${SCREEN_WIDTH * 0.5} 29 ${SCREEN_WIDTH * 0.6} 18 Q${SCREEN_WIDTH * 0.7} 7 ${SCREEN_WIDTH * 0.8} 16 Q${SCREEN_WIDTH * 0.9} 25 ${SCREEN_WIDTH} 15 L${SCREEN_WIDTH} 35 L0 35 Z`}
        fill={FOOTER_BG}
      />
    </Svg>
  </View>
);
