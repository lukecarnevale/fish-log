// components/UnsavedChangesModal.tsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, borderRadius, modals, shadows } from '../styles/common';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';

interface UnsavedChangesModalProps {
  visible: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
  /** Title shown in the modal. Defaults to "Discard Changes?" */
  title?: string;
  /** Body text shown in the modal. Defaults to a generic unsaved-changes message. */
  message?: string;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  visible,
  onKeepEditing,
  onDiscard,
  title = 'Discard Changes?',
  message = 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.',
}) => {
  const { theme } = useTheme();
  const modalStyles = useThemedStyles(createStyles);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onKeepEditing}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <View style={modalStyles.iconContainer}>
            <Feather name="alert-circle" size={32} color={theme.colors.warning} />
          </View>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.message}>{message}</Text>
          <View style={modalStyles.buttons}>
            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={onKeepEditing}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.cancelText}>Keep Editing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.discardButton}
              onPress={onDiscard}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.discardText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    ...modals.overlay,
  },
  content: {
    ...modals.content,
    width: '85%',
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: theme.colors.darkGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  discardButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
  },
  discardText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});

export default UnsavedChangesModal;
