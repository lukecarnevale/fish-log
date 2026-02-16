import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";

// Prevent the native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const TEAL = "#1B808C";
const { width } = Dimensions.get("window");
const ICON_SIZE = width * 0.38;

interface Props {
  children: React.ReactNode;
  /** Set to true once your app has finished loading (fonts, data, etc.) */
  ready: boolean;
}

export default function AnimatedSplashScreen({ children, ready }: Props) {
  const [animationDone, setAnimationDone] = useState(false);

  // Opacity values
  const iconFade = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const splashFade = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!ready) return;

    // Hide the native splash, then run our custom animation
    const run = async () => {
      await SplashScreen.hideAsync();

      // Phase 1: Icon fades in + subtle scale
      Animated.parallel([
        Animated.timing(iconFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Phase 2: Text fades in shortly after
      setTimeout(() => {
        Animated.timing(textFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 350);

      // Phase 3: Hold, then fade everything out
      setTimeout(() => {
        Animated.timing(splashFade, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setAnimationDone(true);
        });
      }, 1800);
    };

    run();
  }, [ready]);

  return (
    <View style={styles.container}>
      {/* Only render app content after splash animation completes.
         This prevents modals (bulletins, alerts) from appearing above the splash overlay,
         since React Native Modals render above all other views in the native hierarchy. */}
      {animationDone && children}

      {/* Animated splash overlay */}
      {!animationDone && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.splashContainer,
            { opacity: splashFade },
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                opacity: iconFade,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Image
              source={require("../../assets/splash-icon.png")}
              style={styles.icon}
              resizeMode="cover"
            />
          </Animated.View>

          <Animated.Text style={[styles.title, { opacity: textFade }]}>
            Fish Log Co.
          </Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  title: {
    marginTop: 24,
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
});
