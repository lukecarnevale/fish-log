// components/FeedbackModal.tsx
//
// Modal component for submitting feedback, bug reports, or feature requests.
// Styled to match the app's ocean-themed aesthetic.
//

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../styles/common';
import { FeedbackType } from '../types/feedback';
import { submitFeedback } from '../services/feedbackService';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  type: FeedbackType;
  title?: string;
  placeholder?: string;
}

const TYPE_CONFIG: Record<FeedbackType, { title: string; placeholder: string; icon: keyof typeof Feather.glyphMap }> = {
  feedback: {
    title: 'Help & Feedback',
    placeholder: 'Ask a question, share feedback, or let us know how we can help...',
    icon: 'help-circle',
  },
  bug_report: {
    title: 'Report a Problem',
    placeholder: 'Describe the issue you encountered. Include what you were doing when it happened.',
    icon: 'alert-triangle',
  },
  feature_request: {
    title: 'Request a Feature',
    placeholder: 'What feature would you like to see?',
    icon: 'zap',
  },
};

export function FeedbackModal({
  visible,
  onClose,
  type,
  title,
  placeholder,
}: FeedbackModalProps): React.ReactElement {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = TYPE_CONFIG[type];
  const displayTitle = title || config.title;
  const displayPlaceholder = placeholder || config.placeholder;

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Required', 'Please enter your message.');
      return;
    }

    setIsSubmitting(true);

    const result = await submitFeedback({
      type,
      message: message.trim(),
      email: email.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted. We appreciate you taking the time to help improve the app.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to submit feedback. Please try again.');
    }
  };

  const handleClose = () => {
    setMessage('');
    setEmail('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContent}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Feather name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Feather name={config.icon} size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>{displayTitle}</Text>
            <Text style={styles.subtitle}>
              We're here to help and value your input
            </Text>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Message Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Message *</Text>
              <TextInput
                style={styles.messageInput}
                placeholder={displayPlaceholder}
                placeholderTextColor={colors.textTertiary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.charCount}>{message.length}/2000</Text>
            </View>

            {/* Email Input (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (optional)</Text>
              <Text style={styles.hint}>
                Add your email if you'd like us to follow up
              </Text>
              <TextInput
                style={styles.emailInput}
                placeholder="your@email.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Privacy Note */}
            <View style={styles.privacyNote}>
              <Feather name="lock" size={14} color={colors.seaweedGreen} style={styles.privacyIcon} />
              <Text style={styles.privacyText}>
                Your feedback is private and only used to improve the app.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Feather name="send" size={18} color={colors.white} style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '90%',
    maxHeight: '85%',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 0,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  messageInput: {
    backgroundColor: colors.pearlWhite,
    borderWidth: 1.5,
    borderColor: colors.oceanSurface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 120,
    maxHeight: 180,
  },
  charCount: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.xxs,
  },
  emailInput: {
    backgroundColor: colors.pearlWhite,
    borderWidth: 1.5,
    borderColor: colors.oceanSurface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    height: 48,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 75, 0.1)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  privacyIcon: {
    marginRight: spacing.xs,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: colors.seaweedGreen,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderBottomWidth: 3,
    borderBottomColor: colors.oceanDeep,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitIcon: {
    marginRight: spacing.xs,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default FeedbackModal;
