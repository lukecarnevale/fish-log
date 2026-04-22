// components/StatusBarScrollBlur.tsx
//
// Slack-style frosted-blur bar that sits over the OS toolbar zone and fades
// in as the user scrolls content underneath it. The blur's bottom edge is
// feathered via a MaskedView + LinearGradient alpha mask so it tapers into
// the content instead of ending on a hard line.
//
// Usage:
//
//   const { scrollY } = useFloatingHeaderAnimation();
//   ...
//   <StatusBarScrollBlur scrollY={scrollY} />
//   <Animated.ScrollView onScroll={Animated.event(
//     [{ nativeEvent: { contentOffset: { y: scrollY } } }],
//     { useNativeDriver: true }
//   )}> ... </Animated.ScrollView>
//
// The component positions itself absolutely at the top of the parent and
// is pointerEvents="none", so it doesn't need to be inserted anywhere
// specific in the layout tree — just render it once on the screen.

import React from 'react';
import { Animated, Platform, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StatusBarScrollBlurProps {
  /** The Animated.Value tracking scroll offset. Usually from
   *  useFloatingHeaderAnimation(). */
  scrollY: Animated.Value;
  /** Blur tint. Defaults to 'light' — matches apps with a light content area
   *  under the toolbar. Use 'dark' on screens with a dark body. */
  tint?: 'light' | 'dark' | 'default';
  /** Blur strength (0–100). Higher = more obvious frosted effect.
   *  Android typically needs a noticeably higher value than iOS to read
   *  the same — on iOS the BlurView uses UIVisualEffectView (perceptually
   *  strong), on Android even the real-blur path (experimentalBlurMethod
   *  "dimezisBlurView") produces a lighter blur at equivalent intensity.
   *  Defaults are Platform.select'd accordingly. */
  intensity?: number;
  /** Scroll distance (in pt) over which the blur fades from 0 → full
   *  opacity. Default 60pt. */
  fadeInDistance?: number;
  /** Extra height beneath the safe-area inset, for the feathered zone
   *  below the OS toolbar. Default 28pt — roughly ~11pt solid blur plus
   *  ~17pt feather via the mask stops (locations: 0, 0.6, 1). */
  overshoot?: number;
  /** zIndex for the blur layer. Default 20 — sits above scroll content
   *  (zIndex 2) and below most overlays/drawers (zIndex 50+). */
  zIndex?: number;
  /** Optional style overrides for the positioned container. */
  style?: ViewStyle;
}

// Platform-tuned defaults. Android's real blur (dimezisBlurView) reads
// weaker than iOS's UIVisualEffectView at the same intensity, so we boost
// it to perceptually match.
const DEFAULT_INTENSITY = Platform.select({ ios: 40, android: 90, default: 40 });

const StatusBarScrollBlur: React.FC<StatusBarScrollBlurProps> = ({
  scrollY,
  tint = 'light',
  intensity = DEFAULT_INTENSITY,
  fadeInDistance = 60,
  overshoot = 28,
  zIndex = 20,
  style,
}) => {
  const insets = useSafeAreaInsets();

  const opacity = scrollY.interpolate({
    inputRange: [0, fadeInDistance],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          height: insets.top + overshoot,
          opacity,
          zIndex,
        },
        style,
      ]}
    >
      <MaskedView
        style={styles.fill}
        maskElement={
          <LinearGradient
            // Fully opaque through ~60% of the height (blur fully applied
            // over the toolbar), then a softer non-linear falloff to
            // transparent so the bottom edge feathers into the content.
            colors={[
              'rgba(0, 0, 0, 1)',
              'rgba(0, 0, 0, 1)',
              'rgba(0, 0, 0, 0)',
            ]}
            locations={[0, 0.6, 1]}
            style={styles.fill}
          />
        }
      >
        <BlurView
          tint={tint}
          intensity={intensity}
          // Android-only: opt into the real native blur implementation
          // (Dimezis BlurView) bundled with expo-blur. Without this,
          // Android falls back to a semi-transparent tinted overlay — no
          // actual blur — which is why the effect reads "very transparent".
          // Ignored on iOS.
          experimentalBlurMethod="dimezisBlurView"
          style={styles.fill}
        />
      </MaskedView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default React.memo(StatusBarScrollBlur);
