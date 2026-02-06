// components/SpeciesPlaceholder.tsx
//
// SVG-based placeholder for catch entries without photos.
// Features species-specific illustrations with consistent ocean theme.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getSpeciesTheme, SpeciesTheme } from '../constants/speciesColors';
import WaveBackground from './WaveBackground';
import { FishSvg, RedDrumSvg, FlounderSvg, SeatroutSvg, WeakfishSvg, StripedBassSvg, Bubbles, SIZE_CONFIGS, PlaceholderSize } from './icons/SpeciesIcons';

interface SpeciesPlaceholderProps {
  species: string;
  size?: PlaceholderSize;
}

/**
 * Get the appropriate fish SVG based on species.
 */
function getFishComponent(
  species: string,
  width: number,
  height: number,
  theme: SpeciesTheme
): React.ReactNode {
  const normalized = species.toLowerCase();

  if (normalized.includes('red drum') || normalized.includes('redfish')) {
    return <RedDrumSvg width={width} height={height} />;
  }
  if (normalized.includes('flounder')) {
    return <FlounderSvg width={width} height={height} />;
  }
  if (normalized.includes('seatrout') || normalized.includes('trout')) {
    return <SeatroutSvg width={width} height={height} />;
  }
  if (normalized.includes('weakfish') || normalized.includes('gray trout')) {
    return <WeakfishSvg width={width} height={height} />;
  }
  if (normalized.includes('striped bass') || normalized.includes('striper')) {
    return <StripedBassSvg width={width} height={height} />;
  }

  // Default generic fish with species theme colors
  return <FishSvg width={width} height={height} theme={theme} />;
}

/**
 * Placeholder component for catch entries without photos.
 * Shows a species-specific fish illustration with themed background.
 */
const SpeciesPlaceholder: React.FC<SpeciesPlaceholderProps> = ({
  species,
  size = 'large',
}) => {
  const theme = getSpeciesTheme(species);
  const config = SIZE_CONFIGS[size];

  return (
    <View style={[styles.container, { height: config.container.height, backgroundColor: theme.light }]}>
      {/* Wave pattern overlay */}
      <View style={styles.waveContainer}>
        <WaveBackground />
      </View>

      {/* Bubble decorations */}
      <Bubbles size={size} />

      {/* Centered fish illustration */}
      <View style={styles.fishContainer}>
        {getFishComponent(species, config.fishWidth, config.fishHeight, theme)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    opacity: 0.5,
  },
  fishContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SpeciesPlaceholder;
