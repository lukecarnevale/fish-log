// components/AboutModal.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, borderRadius, shadows } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';
import { APP_VERSION } from '../config/appConfig';
import LazyModal from './LazyModal';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: AboutModalProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <LazyModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* App Icon */}
          <View style={styles.header}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.appIcon}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Fish Log Co.</Text>
            <Text style={styles.version}>Version {APP_VERSION}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            Log your catches, submit harvest reports to the NC Division of Marine Fisheries, and earn rewards for responsible angling.
          </Text>

          {/* Info Rows */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Feather name="anchor" size={16} color={theme.colors.primary} />
              <Text style={styles.infoText}>Reports are submitted to NC DMF</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={16} color={theme.colors.primary} />
              <Text style={styles.infoText}>North Carolina, USA</Text>
            </View>
          </View>

          {/* Close Action */}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LazyModal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: borderRadius.lg,
    width: '85%',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.large,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  version: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  infoSection: {
    width: '100%',
    backgroundColor: theme.colors.pearlWhite,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  doneButton: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.oceanDeep,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});

export default AboutModal;
