// components/RewardsPromptModal.tsx
//
// Post-submission modal prompting users to join the Rewards Program.
// Uses magic link (passwordless) authentication for cross-device access.
//

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/common';
import { useRewards } from '../contexts/RewardsContext';
import { sendMagicLink, storePendingAuth, onAuthStateChange } from '../services/authService';
import { dismissRewardsPrompt, getDeviceId } from '../services/anonymousUserService';
import { savePendingSubmission } from '../services/pendingSubmissionService';

interface RewardsPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onJoinSuccess: () => void;
  // Initial values from report form (pre-fill)
  initialFirstName?: string;
  initialLastName?: string;
  initialEmail?: string;
  initialPhone?: string;
  initialZipCode?: string;
  initialWrcId?: string;
  // If true, user opted into rewards during form - hide skip options
  requiresSignup?: boolean;
  // Report ID to link with pending submission (for mid-auth recovery)
  reportId?: string;
}

type ModalStep = 'form' | 'email-sent' | 'login';

const RewardsPromptModal: React.FC<RewardsPromptModalProps> = ({
  visible,
  onClose,
  onJoinSuccess,
  initialFirstName = '',
  initialLastName = '',
  initialEmail = '',
  initialPhone = '',
  initialZipCode = '',
  initialWrcId = '',
  requiresSignup = false,
  reportId,
}) => {
  const { currentDrawing } = useRewards();

  // Animation for modal content slide-up
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step state
  const [step, setStep] = useState<ModalStep>('form');

  // Form state - pre-filled from report data
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);

  // Update form when initial values change (modal becomes visible with new data)
  useEffect(() => {
    if (visible) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
      setEmail(initialEmail);
      setPhone(initialPhone);
    }
  }, [visible, initialFirstName, initialLastName, initialEmail, initialPhone]);

  // Log step changes for debugging
  useEffect(() => {
    console.log('📋 RewardsPromptModal step changed to:', step);
  }, [step]);

  // Log visibility changes and animate modal
  useEffect(() => {
    console.log('👁️ RewardsPromptModal visible:', visible);
    if (visible) {
      // Reset and animate slide-up
      slideAnim.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible, slideAnim]);

  // Listen for auth state changes when showing "Check Your Email" step
  // This auto-dismisses the modal when the user successfully signs in via magic link
  useEffect(() => {
    // Only listen when modal is visible and showing email-sent step
    if (!visible || step !== 'email-sent') return;

    console.log('👂 RewardsPromptModal: Listening for auth state changes...');

    const unsubscribe = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        console.log('🎉 RewardsPromptModal: Auth success detected, calling onJoinSuccess');
        // Small delay to let App.tsx handle user creation first
        setTimeout(() => {
          onJoinSuccess();
        }, 500);
      }
    });

    return () => {
      console.log('👂 RewardsPromptModal: Cleaning up auth listener');
      unsubscribe();
    };
  }, [visible, step, onJoinSuccess]);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get drawing info
  const drawingName = currentDrawing?.name || 'Quarterly Rewards';
  const drawingDate = currentDrawing
    ? new Date(currentDrawing.drawingDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      })
    : '';

  // Reset modal state when closed
  const handleClose = () => {
    setStep('form');
    onClose();
  };

  // Handle send magic link
  const handleSendMagicLink = async () => {
    // Validate
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Name Required', 'Please enter your first and last name.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save pending submission for mid-auth recovery
      // This preserves the submission context if the user closes the app
      const deviceId = await getDeviceId();
      await savePendingSubmission({
        deviceId,
        email: email.trim().toLowerCase(),
        formData: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          harvestReportId: reportId,
        },
      });
      console.log('✅ Pending submission saved for recovery');

      // Store pending auth data
      await storePendingAuth({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        zipCode: initialZipCode?.trim() || undefined,
        wrcId: initialWrcId?.trim() || undefined,
        sentAt: new Date().toISOString(),
      });

      // Send magic link
      const result = await sendMagicLink(email.trim(), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        zipCode: initialZipCode?.trim() || undefined,
        wrcId: initialWrcId?.trim() || undefined,
      });

      if (result.success) {
        console.log('✅ Magic link sent successfully, showing email-sent step');
        // Show a brief alert to confirm, then display the email-sent step
        Alert.alert(
          'Email Sent!',
          `We've sent a sign-in link to ${email.trim()}. Check your inbox!`,
          [{ text: 'OK', onPress: () => setStep('email-sent') }]
        );
      } else {
        console.error('❌ Magic link failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to send verification email.');
      }
    } catch (error) {
      console.error('Error sending magic link:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle "Don't Show Again"
  const handleDontShowAgain = async () => {
    try {
      await dismissRewardsPrompt();
      handleClose();
    } catch (error) {
      console.error('Error dismissing prompt:', error);
      handleClose();
    }
  };

  // Handle "Maybe Later"
  const handleMaybeLater = () => {
    handleClose();
  };

  // Handle login magic link (for returning users)
  const handleLoginMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send magic link (no metadata needed for login)
      const result = await sendMagicLink(email.trim());

      if (result.success) {
        console.log('✅ Login magic link sent successfully');
        // Show a brief alert to confirm, then display the email-sent step
        Alert.alert(
          'Email Sent!',
          `We've sent a sign-in link to ${email.trim()}. Check your inbox!`,
          [{ text: 'OK', onPress: () => setStep('email-sent') }]
        );
      } else {
        console.error('❌ Login magic link failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to send sign-in email.');
      }
    } catch (error) {
      console.error('Error sending login magic link:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the form step
  const renderFormStep = () => {
    console.log('🎨 Rendering FORM step');
    return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Feather name={requiresSignup ? "check-circle" : "gift"} size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>
          {requiresSignup ? "Complete Your Rewards Setup" : "Join the Rewards Program"}
        </Text>
        <Text style={styles.subtitle}>
          {requiresSignup
            ? "Verify your email to create your profile and enter the quarterly drawing!"
            : "You've successfully submitted your harvest report!"}
        </Text>
      </View>

      {/* Benefits Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Feather name="star" size={16} color={colors.primary} /> Member Benefits
        </Text>
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Feather name="award" size={16} color={colors.success} />
            <Text style={styles.benefitText}>
              Enter quarterly prize drawings automatically
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Feather name="bar-chart-2" size={16} color={colors.success} />
            <Text style={styles.benefitText}>
              Appear on the community leaderboard
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Feather name="smartphone" size={16} color={colors.success} />
            <Text style={styles.benefitText}>
              Access your account from any device
            </Text>
          </View>
        </View>
        {drawingDate && (
          <Text style={styles.drawingInfo}>
            Next drawing: {drawingDate}
          </Text>
        )}
      </View>

      {/* Form Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Feather name="user" size={16} color={colors.primary} /> {requiresSignup ? "Verify Your Information" : "Create Your Profile"}
        </Text>
        <Text style={styles.sectionDesc}>
          {requiresSignup
            ? "Confirm your details and we'll send a verification link to your email."
            : "We'll send a sign-in link to your email - no password needed!"}
        </Text>

        <Text style={styles.inputLabel}>Name *</Text>
        <View style={styles.nameRow}>
          <TextInput
            style={[styles.input, styles.nameInput]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, styles.nameInput]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.inputLabel}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.inputLabel}>Phone (optional)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="(555) 555-5555"
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
        />
      </View>

      {/* Terms */}
      <View style={styles.termsSection}>
        <Text style={styles.termsText}>
          By joining, you agree to let us contact you via email if selected.
          No purchase necessary. See official rules at fishlog.app/rules.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[
            styles.joinButton,
            (!firstName.trim() || !lastName.trim() || !email.trim()) &&
              styles.joinButtonDisabled,
          ]}
          onPress={handleSendMagicLink}
          disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !email.trim()}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Feather name="mail" size={18} color={colors.white} />
              <Text style={styles.joinButtonText}>
                {requiresSignup ? "Send Verification Link" : "Send Sign-In Link"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Only show skip options if user hasn't opted into rewards */}
        {!requiresSignup && (
          <>
            <TouchableOpacity
              style={styles.laterButton}
              onPress={handleMaybeLater}
              disabled={isSubmitting}
            >
              <Text style={styles.laterButtonText}>Maybe Later</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dontShowButton}
              onPress={handleDontShowAgain}
              disabled={isSubmitting}
            >
              <Text style={styles.dontShowButtonText}>Don't show this again</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.loginLinkContainer}>
          <Text style={styles.loginLinkText}>Already a member? </Text>
          <TouchableOpacity onPress={() => setStep('login')} disabled={isSubmitting}>
            <Text style={styles.loginLinkButton}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
  };

  // Render the login step (for returning users)
  const renderLoginStep = () => {
    console.log('🎨 Rendering LOGIN step');
    return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Feather name="log-in" size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>
          Enter your email to sign in to your rewards account.
        </Text>
      </View>

      {/* Form Section */}
      <View style={styles.section}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        <Text style={styles.loginHint}>
          We'll send a sign-in link to your email - no password needed!
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.joinButton, !email.trim() && styles.joinButtonDisabled]}
          onPress={handleLoginMagicLink}
          disabled={isSubmitting || !email.trim()}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Feather name="mail" size={18} color={colors.white} />
              <Text style={styles.joinButtonText}>Send Sign-In Link</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={() => {
            setEmail('');
            setStep('form');
          }}
          disabled={isSubmitting}
        >
          <Feather name="arrow-left" size={16} color={colors.primary} />
          <Text style={styles.resendButtonText}>Back to sign up</Text>
        </TouchableOpacity>
      </View>
    </>
  );
  };

  // Render the email-sent step
  const renderEmailSentStep = () => {
    console.log('🎨 Rendering EMAIL-SENT step');
    return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, styles.iconContainerSuccess]}>
          <Feather name="mail" size={32} color={colors.white} />
        </View>
        <Text style={styles.title}>Check Your Email!</Text>
        <Text style={styles.subtitle}>
          We've sent a sign-in link to:
        </Text>
        <Text style={styles.emailHighlight}>{email}</Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsSection}>
        <View style={styles.instructionItem}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>1</Text>
          </View>
          <Text style={styles.instructionText}>
            Open the email from Fish Log
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>2</Text>
          </View>
          <Text style={styles.instructionText}>
            Tap the "Sign In" button in the email
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>3</Text>
          </View>
          <Text style={styles.instructionText}>
            You'll be signed in automatically!
          </Text>
        </View>
      </View>

      {/* Note */}
      <View style={styles.noteSection}>
        <Feather name="info" size={16} color={colors.textSecondary} />
        <Text style={styles.noteText}>
          The link expires in 1 hour. Check your spam folder if you don't see the email.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleClose}
        >
          <Text style={styles.doneButtonText}>Got it!</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={() => {
            setStep('form');
          }}
        >
          <Feather name="arrow-left" size={16} color={colors.primary} />
          <Text style={styles.resendButtonText}>Back to form</Text>
        </TouchableOpacity>
      </View>
    </>
  );
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
        style={styles.keyboardAvoid}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.container,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Close button - always visible for escape hatch */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                if (requiresSignup && step === 'form') {
                  // Warn user they won't be entered in the raffle
                  Alert.alert(
                    'Skip Rewards Setup?',
                    'You won\'t be entered in the quarterly drawing. You can always sign up later from your profile.',
                    [
                      { text: 'Continue Setup', style: 'cancel' },
                      { text: 'Skip', style: 'destructive', onPress: handleClose },
                    ]
                  );
                } else {
                  handleClose();
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {step === 'form' && renderFormStep()}
              {step === 'login' && renderLoginStep()}
              {step === 'email-sent' && renderEmailSentStep()}
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconContainerSuccess: {
    backgroundColor: colors.success,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emailHighlight: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  benefitsList: {
    marginTop: spacing.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  benefitText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  drawingInfo: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
  },
  termsSection: {
    marginBottom: spacing.lg,
  },
  termsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonsContainer: {
    gap: spacing.sm,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dontShowButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dontShowButtonText: {
    fontSize: 14,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
  // Email sent step styles
  instructionsSection: {
    marginBottom: spacing.lg,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  instructionText: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.lightGray,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  noteText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: spacing.xs,
  },
  resendButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  // Login link styles
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLinkButton: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  loginHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default RewardsPromptModal;
