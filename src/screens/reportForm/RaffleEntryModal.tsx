// screens/reportForm/RaffleEntryModal.tsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../styles/common';
import { localStyles } from '../../styles/reportFormScreenLocalStyles';
import { validateEmail, validatePhone, formatPhoneNumber } from '../../utils/formValidation';
import { FormState } from './reportForm.types';

interface RaffleValidationErrors {
  email?: string;
  phone?: string;
}

interface RaffleEntryModalProps {
  visible: boolean;
  onClose: () => void;
  raffleModalSlideAnim: Animated.Value;
  currentRewards: {
    id: string;
    name: string;
    endDate: Date;
  };
  catchPhoto: string | null;
  formData: FormState;
  raffleValidationErrors: RaffleValidationErrors;
  onSetFormData: (data: FormState) => void;
  onSetRaffleValidationErrors: (errors: RaffleValidationErrors) => void;
  onTakePhoto: () => Promise<void>;
  onRemovePhoto: () => void;
  onSubmitRaffle: () => void;
}

const RaffleEntryModal: React.FC<RaffleEntryModalProps> = ({
  visible,
  onClose,
  raffleModalSlideAnim,
  currentRewards,
  catchPhoto,
  formData,
  raffleValidationErrors,
  onSetFormData,
  onSetRaffleValidationErrors,
  onTakePhoto,
  onRemovePhoto,
  onSubmitRaffle,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={localStyles.raffleModalOverlay}>
        <Animated.View
          style={[
            localStyles.raffleModalContent,
            {
              transform: [
                {
                  translateY: raffleModalSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={localStyles.raffleModalScrollContent}
          >
            {/* Header */}
            <View style={localStyles.raffleModalHeader}>
              <TouchableOpacity
                style={localStyles.raffleModalCloseButton}
                onPress={onClose}
              >
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={localStyles.raffleModalIconContainer}>
                <Feather name="gift" size={32} color={colors.primary} />
              </View>
              <Text style={localStyles.raffleModalTitle}>{currentRewards.name} Program</Text>
              <Text style={localStyles.raffleModalSubtitle}>
                Drawing {currentRewards.endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </Text>
            </View>

            {/* Photo Section */}
            <View style={localStyles.raffleModalSection}>
              <Text style={localStyles.raffleModalSectionTitle}>
                <Feather name="camera" size={16} color={colors.primary} /> Photo Required
              </Text>
              <Text style={localStyles.raffleModalSectionDesc}>
                A photo of your catch required to submit a valid harvest report.
              </Text>

              {catchPhoto ? (
                <View style={localStyles.rafflePhotoContainer}>
                  <Image
                    source={{ uri: catchPhoto }}
                    style={localStyles.rafflePhoto}
                    resizeMode="cover"
                  />
                  <View style={localStyles.rafflePhotoActions}>
                    <TouchableOpacity
                      style={localStyles.rafflePhotoActionButton}
                      onPress={onTakePhoto}
                    >
                      <Feather name="camera" size={16} color={colors.primary} />
                      <Text style={localStyles.rafflePhotoActionText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={localStyles.rafflePhotoActionButton}
                      onPress={onRemovePhoto}
                    >
                      <Feather name="trash-2" size={16} color={colors.error} />
                      <Text style={[localStyles.rafflePhotoActionText, { color: colors.error }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={localStyles.raffleTakePhotoButton}
                  onPress={onTakePhoto}
                >
                  <Feather name="camera" size={24} color={colors.primary} />
                  <Text style={localStyles.raffleTakePhotoText}>Take Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Contact Info Section */}
            <View style={localStyles.raffleModalSection}>
              <Text style={localStyles.raffleModalSectionTitle}>
                <Feather name="user" size={16} color={colors.primary} /> Your Information
              </Text>
              <Text style={localStyles.raffleModalSectionDesc}>
                We'll contact you if you're selected for a reward.
              </Text>

              <Text style={localStyles.raffleInputLabel}>Name <Text style={localStyles.requiredAsterisk}>*</Text></Text>
              <View style={localStyles.nameRow}>
                <TextInput
                  style={[localStyles.raffleInput, localStyles.nameInput]}
                  value={formData.angler.firstName}
                  onChangeText={(text) => onSetFormData({
                    ...formData,
                    angler: { ...formData.angler, firstName: text },
                  })}
                  placeholder="First"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={[localStyles.raffleInput, localStyles.nameInput]}
                  value={formData.angler.lastName}
                  onChangeText={(text) => onSetFormData({
                    ...formData,
                    angler: { ...formData.angler, lastName: text },
                  })}
                  placeholder="Last"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <Text style={localStyles.raffleInputLabel}>Email <Text style={localStyles.requiredAsterisk}>*</Text></Text>
              <TextInput
                style={[
                  localStyles.raffleInput,
                  raffleValidationErrors.email && localStyles.raffleInputError,
                ]}
                value={formData.angler.email}
                onChangeText={(text) => {
                  onSetFormData({
                    ...formData,
                    angler: { ...formData.angler, email: text },
                  });
                  // Clear error when user starts typing
                  if (raffleValidationErrors.email) {
                    onSetRaffleValidationErrors({ ...raffleValidationErrors, email: undefined });
                  }
                }}
                onBlur={() => {
                  const error = validateEmail(formData.angler.email || "");
                  onSetRaffleValidationErrors({ ...raffleValidationErrors, email: error });
                }}
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {raffleValidationErrors.email && (
                <Text style={localStyles.raffleErrorText}>{raffleValidationErrors.email}</Text>
              )}

              <Text style={localStyles.raffleInputLabel}>Phone (optional)</Text>
              <TextInput
                style={[
                  localStyles.raffleInput,
                  raffleValidationErrors.phone && localStyles.raffleInputError,
                ]}
                value={formData.angler.phone}
                onChangeText={(text) => {
                  onSetFormData({
                    ...formData,
                    angler: { ...formData.angler, phone: formatPhoneNumber(text) },
                  });
                  // Clear error when user starts typing
                  if (raffleValidationErrors.phone) {
                    onSetRaffleValidationErrors({ ...raffleValidationErrors, phone: undefined });
                  }
                }}
                onBlur={() => {
                  const error = validatePhone(formData.angler.phone || "");
                  onSetRaffleValidationErrors({ ...raffleValidationErrors, phone: error });
                }}
                placeholder="555-555-5555"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                maxLength={12}
              />
              {raffleValidationErrors.phone && (
                <Text style={localStyles.raffleErrorText}>{raffleValidationErrors.phone}</Text>
              )}
            </View>

            {/* Terms */}
            <View style={localStyles.raffleModalSection}>
              <Text style={localStyles.raffleModalSectionTitle}>
                <Feather name="info" size={16} color={colors.primary} /> By Participating
              </Text>
              <View style={localStyles.raffleModalList}>
                <View style={localStyles.raffleModalListItem}>
                  <Feather name="check" size={14} color={colors.success} />
                  <Text style={localStyles.raffleModalListText}>
                    Your catch may appear on the public leaderboard
                  </Text>
                </View>
                <View style={localStyles.raffleModalListItem}>
                  <Feather name="check" size={14} color={colors.success} />
                  <Text style={localStyles.raffleModalListText}>
                    You're automatically entered in quarterly drawings
                  </Text>
                </View>
                <View style={localStyles.raffleModalListItem}>
                  <Feather name="check" size={14} color={colors.success} />
                  <Text style={localStyles.raffleModalListText}>
                    No purchase or report necessary to enter—see official rules
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={localStyles.raffleModalButtonsRow}>
              <TouchableOpacity
                style={[localStyles.raffleModalButton, localStyles.raffleModalSecondaryButton]}
                onPress={onClose}
              >
                <Text style={localStyles.raffleModalSecondaryButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  localStyles.raffleModalButton,
                  localStyles.raffleModalPrimaryButton,
                  (!catchPhoto || !formData.angler.firstName?.trim() || !formData.angler.lastName?.trim() ||
                   !formData.angler.email?.trim() || validateEmail(formData.angler.email || "") ||
                   validatePhone(formData.angler.phone || "")) && localStyles.raffleModalButtonDisabled,
                ]}
                onPress={() => {
                  // Validate rewards requirements (phone is now optional)
                  if (!catchPhoto) {
                    Alert.alert("Photo Required", "Please take a photo of your catch to submit a valid harvest report.");
                    return;
                  }
                  if (!formData.angler.firstName?.trim() || !formData.angler.lastName?.trim()) {
                    Alert.alert("Name Required", "Please enter your name to join the rewards program.");
                    return;
                  }
                  if (!formData.angler.email?.trim()) {
                    Alert.alert("Email Required", "Please enter your email address to join the rewards program.");
                    return;
                  }
                  // Validate email format
                  const emailError = validateEmail(formData.angler.email || "");
                  if (emailError) {
                    onSetRaffleValidationErrors({ ...raffleValidationErrors, email: emailError });
                    Alert.alert("Invalid Email", emailError);
                    return;
                  }
                  // Validate phone format (if provided)
                  const phoneError = validatePhone(formData.angler.phone || "");
                  if (phoneError) {
                    onSetRaffleValidationErrors({ ...raffleValidationErrors, phone: phoneError });
                    Alert.alert("Invalid Phone", phoneError);
                    return;
                  }
                  onSubmitRaffle();
                }}
                disabled={!catchPhoto || !formData.angler.firstName?.trim() || !formData.angler.lastName?.trim() ||
                         !formData.angler.email?.trim() || !!validateEmail(formData.angler.email || "") ||
                         !!validatePhone(formData.angler.phone || "")}
              >
                <Feather name="check" size={18} color={colors.white} />
                <Text style={localStyles.raffleModalPrimaryButtonText}> Enter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default RaffleEntryModal;
