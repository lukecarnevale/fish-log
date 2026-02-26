// components/ForceUpdateModal.tsx
//
// Non-dismissible modal shown when the running app version is below the
// minimum required version. Directs the user to the appropriate app store.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import { colors, spacing, borderRadius, typography } from '../styles/common';
import type { AppVersionConfig } from '../services/forceUpdateService';

// =============================================================================
// Props
// =============================================================================

interface ForceUpdateModalProps {
  visible: boolean;
  config: AppVersionConfig | null;
}

// =============================================================================
// Component
// =============================================================================

const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  visible,
  config,
}) => {
  if (!config) return null;

  const storeUrl =
    Platform.OS === 'ios' ? config.iosStoreUrl : config.androidStoreUrl;

  const handleUpdatePress = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl);
    }
  };

  return (
    <AnimatedModal
      visible={visible}
      onClose={() => {}}
      scrollable={false}
      avoidKeyboard={false}
      closeOnOverlayPress={false}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Feather name="download" size={32} color={colors.primary} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>Update Required</Text>

      {/* Message */}
      <Text style={styles.message}>{config.forceUpdateMessage}</Text>

      {/* Update Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdatePress}
          activeOpacity={0.8}
        >
          <Feather
            name="external-link"
            size={18}
            color={colors.white}
            style={styles.buttonIcon}
          />
          <Text style={styles.updateButtonText}>Update Now</Text>
        </TouchableOpacity>
      </View>
    </AnimatedModal>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 200,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  updateButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default ForceUpdateModal;
