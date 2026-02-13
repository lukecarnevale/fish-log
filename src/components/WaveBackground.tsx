// components/WaveBackground.tsx
//
// Subtle offset stacked wave pattern for header backgrounds.

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

export const WaveBackground: React.FC = () => (
  <View style={styles.container}>
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 400 80"
      preserveAspectRatio="xMidYMax slice"
    >
      <Path
        d="M-100 20 Q-25 5 50 20 Q125 35 200 20 Q275 5 350 20 Q425 35 500 20 L500 80 L-100 80 Z"
        fill="white"
        opacity={0.05}
      />
      <Path
        d="M-50 40 Q25 25 100 40 Q175 55 250 40 Q325 25 400 40 Q475 55 550 40 L550 80 L-50 80 Z"
        fill="white"
        opacity={0.07}
      />
      <Path
        d="M-80 60 Q-5 50 70 60 Q145 70 220 60 Q295 50 370 60 Q445 70 520 60 L520 80 L-80 80 Z"
        fill="white"
        opacity={0.05}
      />
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
});

export default WaveBackground;
