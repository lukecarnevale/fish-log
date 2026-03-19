// screens/PartnerInquiryScreen.tsx
//
// Business partner inquiry form for the Promotions Hub.
// Clean, professional form for businesses to reach out about
// advertising/partnerships with NC Fish Log.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';

import ScreenLayout from '../components/ScreenLayout';
import { SCREEN_LABELS } from '../constants/screenLabels';
import { REGION_OPTIONS } from '../constants/regionOptions';
import { colors, spacing, borderRadius, shadows } from '../styles/common';
import { useSubmitPartnerInquiry } from '../api/promotionsApi';
import {
  type BusinessType,
  BUSINESS_TYPE_OPTIONS,
} from '../types/partnerInquiry';
import type { RootStackParamList } from '../types';

type Props = StackScreenProps<RootStackParamList, 'PartnerInquiry'>;

const PartnerInquiryScreen: React.FC<Props> = ({ navigation }) => {
  // Partner inquiry mutation
  const submitMutation = useSubmitPartnerInquiry();
  const submitting = submitMutation.isPending;

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!contactName.trim()) newErrors.contactName = 'Contact name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!businessType) newErrors.businessType = 'Please select a business type';
    if (!message.trim()) newErrors.message = 'Please describe what you\'d like to promote';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    try {
      const result = await submitMutation.mutateAsync({
        inquiry: {
          businessName: businessName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          businessType: businessType!,
          areaCodes: selectedAreas,
          message: message.trim(),
        },
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        Alert.alert('Submission Failed', result.error || 'Please try again later.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  }, [businessName, contactName, email, phone, website, businessType, selectedAreas, message, submitMutation]);

  const toggleArea = (code: string) => {
    setSelectedAreas((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Success state
  if (submitted) {
    return (
      <ScreenLayout
        navigation={navigation}
        title={SCREEN_LABELS.partnerInquiry.title}
        showBackButton
      >
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather name="check-circle" size={56} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Inquiry Submitted!</Text>
          <Text style={styles.successMessage}>
            Thanks for your interest in partnering with NC Fish Log. We'll review
            your inquiry and get back to you within a few business days.
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.successButtonText}>Back to the Locker</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      navigation={navigation}
      title={SCREEN_LABELS.partnerInquiry.title}
      subtitle={SCREEN_LABELS.partnerInquiry.subtitle}
      showBackButton
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.formContainer}>
          {/* Intro text */}
          <View style={styles.introCard}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={styles.introText}>
              Interested in reaching thousands of NC anglers? Fill out the form
              below and our team will reach out to discuss partnership opportunities.
            </Text>
          </View>

          {/* Business Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={[styles.input, errors.businessName && styles.inputError]}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Captain Bob's Charters"
              placeholderTextColor={colors.mediumGray}
            />
            {errors.businessName && (
              <Text style={styles.errorText}>{errors.businessName}</Text>
            )}
          </View>

          {/* Contact Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contact Name *</Text>
            <TextInput
              style={[styles.input, errors.contactName && styles.inputError]}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Your full name"
              placeholderTextColor={colors.mediumGray}
            />
            {errors.contactName && (
              <Text style={styles.errorText}>{errors.contactName}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@business.com"
              placeholderTextColor={colors.mediumGray}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Phone (optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(optional)"
              placeholderTextColor={colors.mediumGray}
              keyboardType="phone-pad"
            />
          </View>

          {/* Website (optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://www.yourbusiness.com"
              placeholderTextColor={colors.mediumGray}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Business Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Business Type *</Text>
            <View style={styles.chipGrid}>
              {BUSINESS_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.typeChip,
                    businessType === option.value && styles.typeChipSelected,
                  ]}
                  onPress={() => setBusinessType(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      businessType === option.value && styles.typeChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.businessType && (
              <Text style={styles.errorText}>{errors.businessType}</Text>
            )}
          </View>

          {/* Areas Served */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Areas Served</Text>
            <Text style={styles.labelHint}>Select all that apply (optional)</Text>
            <View style={styles.chipGrid}>
              {REGION_OPTIONS.map((region) => (
                <TouchableOpacity
                  key={region.value}
                  style={[
                    styles.areaChip,
                    selectedAreas.includes(region.value) && styles.areaChipSelected,
                  ]}
                  onPress={() => toggleArea(region.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.areaChipText,
                      selectedAreas.includes(region.value) && styles.areaChipTextSelected,
                    ]}
                  >
                    {region.shortLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Message */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>What would you like to promote? *</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.message && styles.inputError]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us about your business and what you'd like to promote to NC anglers..."
              placeholderTextColor={colors.mediumGray}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.message && (
              <Text style={styles.errorText}>{errors.message}</Text>
            )}
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Feather name="send" size={18} color={colors.white} />
                <Text style={styles.submitButtonText}>Submit Inquiry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(11, 84, 139, 0.06)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  introText: {
    flex: 1,
    fontSize: 13,
    color: colors.darkGray,
    lineHeight: 19,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 6,
  },
  labelHint: {
    fontSize: 11,
    color: colors.mediumGray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.pearlWhite,
    borderWidth: 1.5,
    borderColor: 'rgba(11, 84, 139, 0.12)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.black,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: 4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.pearlWhite,
    borderWidth: 1.5,
    borderColor: 'rgba(11, 84, 139, 0.12)',
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.darkGray,
  },
  typeChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  areaChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(6, 116, 127, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(6, 116, 127, 0.15)',
  },
  areaChipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  areaChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  areaChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    marginTop: spacing.lg,
    gap: spacing.xs,
    ...shadows.small,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  successMessage: {
    fontSize: 15,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  successButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    ...shadows.small,
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});

export default PartnerInquiryScreen;
