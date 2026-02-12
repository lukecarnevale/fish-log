// components/WrcIdInfoModal.tsx
//
// Reusable modal component for WRC ID lookup information.
//

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../styles/common";
import AnimatedModal from "./AnimatedModal";

interface WrcIdInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const WrcIdInfoModal: React.FC<WrcIdInfoModalProps> = ({ visible, onClose }) => {
  const handleLookup = () => {
    onClose();
    Linking.openURL("https://license.gooutdoorsnorthcarolina.com/Licensing/CustomerLookup.aspx");
  };

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      scrollable={false}
      containerStyle={styles.container}
    >
      <View style={styles.header}>
        <Feather name="info" size={24} color={colors.primary} />
        <Text style={styles.title}>WRC ID Lookup</Text>
      </View>
      <Text style={styles.text}>
        Don't know your WRC ID or Customer ID? You can look it up online. Once entered, it will be saved for future reports.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleLookup}
        activeOpacity={0.7}
      >
        <Feather name="external-link" size={18} color={colors.white} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Look Up My ID</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: 340,
    borderRadius: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginLeft: 12,
  },
  text: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
});

export default WrcIdInfoModal;
