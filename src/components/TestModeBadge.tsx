// components/TestModeBadge.tsx
//
// Reusable TEST MODE badge component that displays when app is in mock/test mode.
// Shows an orange badge to indicate submissions are not going to real DMF servers.
//

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { isTestMode, isProductionMode } from "../config/appConfig";
import { colors } from "../styles/common";

interface TestModeBadgeProps {
  /** Style variant for different placements */
  variant?: "header" | "inline" | "floating";
  /** Show info icon that shows explanation on tap */
  showInfo?: boolean;
  /** Custom style overrides */
  style?: object;
}

/**
 * TEST MODE badge component.
 *
 * Displays an orange badge when the app is in mock/test mode.
 * Automatically hides when in production mode.
 *
 * @example
 * // In header
 * <TestModeBadge variant="header" />
 *
 * // Inline in a form
 * <TestModeBadge variant="inline" showInfo />
 *
 * // Floating overlay
 * <TestModeBadge variant="floating" />
 */
const TestModeBadge: React.FC<TestModeBadgeProps> = ({
  variant = "header",
  showInfo = false,
  style,
}) => {
  // Don't render in production mode
  if (isProductionMode()) {
    return null;
  }

  const handleInfoPress = () => {
    Alert.alert(
      "Test Mode Active",
      "The app is running in TEST MODE.\n\n" +
        "Submissions are NOT being sent to NC DMF servers. " +
        "Payloads are logged to the console for debugging.\n\n" +
        "To switch to production mode, change APP_CONFIG.mode to 'production' in src/config/appConfig.ts",
      [{ text: "OK" }]
    );
  };

  const badgeStyle = [
    styles.badge,
    variant === "header" && styles.badgeHeader,
    variant === "inline" && styles.badgeInline,
    variant === "floating" && styles.badgeFloating,
    style,
  ];

  const content = (
    <View style={badgeStyle}>
      <Feather name="alert-triangle" size={10} color={colors.white} />
      <Text style={styles.badgeText}>TEST MODE</Text>
      {showInfo && (
        <Feather name="info" size={10} color={colors.white} style={styles.infoIcon} />
      )}
    </View>
  );

  if (showInfo) {
    return (
      <TouchableOpacity onPress={handleInfoPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff9800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeHeader: {
    marginLeft: 8,
  },
  badgeInline: {
    alignSelf: "flex-start",
    marginVertical: 8,
  },
  badgeFloating: {
    position: "absolute",
    top: 50,
    right: 16,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  infoIcon: {
    marginLeft: 4,
  },
});

export default TestModeBadge;
