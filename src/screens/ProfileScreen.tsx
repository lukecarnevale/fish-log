// screens/ProfileScreen.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { isValidPhoneNumber } from 'libphonenumber-js';
import MaskInput from 'react-native-mask-input';
import * as yup from 'yup';
import * as ImagePicker from 'expo-image-picker';

// Instead of using GooglePlacesAutocomplete which causes UUID issues
import { RootStackParamList, UserProfile } from "../types";
import { colors, spacing, borderRadius, shadows, typography } from "../styles/common";
import { getReports, getFishEntries } from "../services/reportsService";
import WrcIdInfoModal from "../components/WrcIdInfoModal";
import { StoredReport } from "../types/report";

type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Profile"
>;

// Create validation schema with Yup
// Validation is conditional based on hasLicense status
const profileSchema = yup.object().shape({
  hasLicense: yup.boolean(),
  // WRC ID required when hasLicense = true
  wrcId: yup.string().when('hasLicense', {
    is: true,
    then: (schema) => schema.required('WRC ID or Customer ID is required'),
    otherwise: (schema) => schema,
  }),
  // Name required when hasLicense = false
  firstName: yup.string().when('hasLicense', {
    is: false,
    then: (schema) => schema.required('First name is required'),
    otherwise: (schema) => schema,
  }),
  lastName: yup.string().when('hasLicense', {
    is: false,
    then: (schema) => schema.required('Last name is required'),
    otherwise: (schema) => schema,
  }),
  // ZIP code is optional but must be 5 digits if provided
  zipCode: yup.string().test('is-valid-zip', 'ZIP code must be exactly 5 digits', function(value) {
    if (!value) return true; // Optional field
    return /^\d{5}$/.test(value);
  }),
  dateOfBirth: yup.string(),
  email: yup.string().email('Please enter a valid email'),
  phone: yup.string().test('is-valid-phone', 'Please enter a valid phone number', function(value) {
    if (!value) return true; // Optional field
    try {
      return isValidPhoneNumber(value, 'US');
    } catch (e) {
      return false;
    }
  }),
  profileImage: yup.string(),
});

// Phone number mask for US numbers (123) 456-7890
const PHONE_MASK = [
  '(',
  /\d/,
  /\d/,
  /\d/,
  ')',
  ' ',
  /\d/,
  /\d/,
  /\d/,
  '-',
  /\d/,
  /\d/,
  /\d/,
  /\d/,
];

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

// Fishing statistics type
interface FishingStats {
  totalCatches: number;
  uniqueSpecies: number;
  largestFish: number | null; // in inches
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<UserProfile>({});
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
    const [fishingStats, setFishingStats] = useState<FishingStats>({
    totalCatches: 0,
    uniqueSpecies: 0,
    largestFish: null,
  });

  // State for WRC ID info modal
  const [showWrcIdInfoModal, setShowWrcIdInfoModal] = useState<boolean>(false);

  // Refs for inputs to enable keyboard navigation
  const wrcIdInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const zipCodeInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  
  // Animation for transitioning between view/edit modes
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;

  // Request permission for image picker
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to set profile pictures!');
      }
    })();
  }, []);

  // Load fishing statistics from reports
  useEffect(() => {
    const loadFishingStats = async () => {
      try {
        const reports = await getReports();

        if (reports.length === 0) {
          setFishingStats({ totalCatches: 0, uniqueSpecies: 0, largestFish: null });
          return;
        }

        // Calculate total catches (sum of all species counts)
        const totalCatches = reports.reduce((sum, report) =>
          sum +
          report.redDrumCount +
          report.flounderCount +
          report.spottedSeatroutCount +
          report.weakfishCount +
          report.stripedBassCount,
          0
        );

        // Calculate unique species (count species with at least one catch)
        const speciesCaught = new Set<string>();
        reports.forEach((report) => {
          if (report.redDrumCount > 0) speciesCaught.add('Red Drum');
          if (report.flounderCount > 0) speciesCaught.add('Southern Flounder');
          if (report.spottedSeatroutCount > 0) speciesCaught.add('Spotted Seatrout');
          if (report.weakfishCount > 0) speciesCaught.add('Weakfish');
          if (report.stripedBassCount > 0) speciesCaught.add('Striped Bass');
        });
        const uniqueSpecies = speciesCaught.size;

        // Find largest fish from fish entries
        let largestFish: number | null = null;
        for (const report of reports) {
          if (!report.id.startsWith('local_')) {
            const entries = await getFishEntries(report.id);
            for (const entry of entries) {
              if (entry.lengths && entry.lengths.length > 0) {
                for (const lengthStr of entry.lengths) {
                  const length = parseFloat(lengthStr);
                  if (!isNaN(length) && (largestFish === null || length > largestFish)) {
                    largestFish = length;
                  }
                }
              }
            }
          }
        }

        setFishingStats({ totalCatches, uniqueSpecies, largestFish });
      } catch (error) {
        console.error('Failed to load fishing stats:', error);
      }
    };

    loadFishingStats();
  }, []);

  // Load profile data from AsyncStorage (merge with fishingLicense data)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [savedProfile, savedLicense] = await Promise.all([
          AsyncStorage.getItem("userProfile"),
          AsyncStorage.getItem("fishingLicense"),
        ]);

        let profileData: UserProfile = savedProfile ? JSON.parse(savedProfile) : {};
        const licenseData = savedLicense ? JSON.parse(savedLicense) : null;

        // If we have license data but profile doesn't have hasLicense/wrcId set, sync them
        if (licenseData && licenseData.licenseNumber) {
          if (profileData.hasLicense === undefined) {
            profileData.hasLicense = true;
          }
          if (!profileData.wrcId && licenseData.licenseNumber) {
            profileData.wrcId = licenseData.licenseNumber;
          }
          // Sync names if not set in profile
          if (!profileData.firstName && licenseData.firstName) {
            profileData.firstName = licenseData.firstName;
          }
          if (!profileData.lastName && licenseData.lastName) {
            profileData.lastName = licenseData.lastName;
          }
        }

        setProfile(profileData);
        setFormData(profileData);
      } catch (error) {
        Alert.alert("Error", "Failed to load your profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Function to pick an image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newFormData = { ...formData, profileImage: result.assets[0].uri };
        setFormData(newFormData);

        if (!isEditing) {
          // If not in edit mode, directly save the profile picture
          try {
            await AsyncStorage.setItem("userProfile", JSON.stringify(newFormData));
            setProfile(newFormData);
            Alert.alert("Success", "Profile picture updated");
          } catch (error) {
            Alert.alert("Error", "Failed to save profile picture");
          }
        }
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong selecting an image");
    }
  };

  // Validate field on change
  // Uses validateAt with full form context so conditional .when() rules work correctly
  const validateField = async (field: string, value: any, currentFormData: UserProfile) => {
    try {
      // Create updated form data with the new value
      const updatedFormData = { ...currentFormData, [field]: value };
      // Validate the specific field with full form context
      await profileSchema.validateAt(field, updatedFormData);
      // If validation passes, remove any existing error for this field
      setValidationErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
      return true;
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        // Set the validation error for this field
        setValidationErrors(prev => ({
          ...prev,
          [field]: error.message
        }));
      }
      return false;
    }
  };

  // Handle form field change with validation
  const handleFieldChange = async (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // When license status changes, clear errors for conditionally-required fields
    // since their required status changes based on hasLicense
    if (field === 'hasLicense') {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        // Clear errors for fields whose required status depends on hasLicense
        delete newErrors.wrcId;
        delete newErrors.firstName;
        delete newErrors.lastName;
        delete newErrors.zipCode;
        return newErrors;
      });
    } else {
      // Validate the changed field with full form context for conditional rules
      await validateField(field, value, formData);
    }
  };

  // Save profile data to AsyncStorage
  const saveProfile = async () => {
    try {
      // Validate all fields
      try {
        await profileSchema.validate(formData, { abortEarly: false });
      } catch (error) {
        if (error instanceof yup.ValidationError) {
          // Transform validation errors into object
          const errors: {[key: string]: string} = {};
          error.inner.forEach(err => {
            if (err.path) {
              errors[err.path] = err.message;
            }
          });

          setValidationErrors(errors);

          // Show alert for the first error
          if (error.inner.length > 0 && error.inner[0].message) {
            Alert.alert("Validation Error", error.inner[0].message);
          }
          return;
        }
      }

      await AsyncStorage.setItem("userProfile", JSON.stringify(formData));

      // Also sync license info to fishingLicense storage if user has a license
      if (formData.hasLicense === true && formData.wrcId) {
        const existingLicense = await AsyncStorage.getItem("fishingLicense");
        const license = existingLicense ? JSON.parse(existingLicense) : {};
        const updatedLicense = {
          ...license,
          licenseNumber: formData.wrcId,
          firstName: formData.firstName,
          lastName: formData.lastName,
        };
        await AsyncStorage.setItem("fishingLicense", JSON.stringify(updatedLicense));
      }

      setProfile(formData);
      setValidationErrors({});
      Alert.alert("Success", "Your profile information has been saved.");
      // Animate back to profile view - slide down
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIsEditing(false);
      });
    } catch (error) {
      Alert.alert("Error", "Failed to save your profile");
    }
  };

  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Animate transition between view/edit modes
  const animateTransition = (toEditing: boolean) => {
    if (toEditing) {
      // Entering edit mode - slide up from bottom
      setFormData(profile || {});
      setIsEditing(true);
      slideAnim.setValue(screenHeight);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Exiting edit mode - slide down
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIsEditing(false);
      });
    }
  };

  // Handle date change from date picker
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFormData({
        ...formData,
        dateOfBirth: formattedDate
      });
    }
  };

  // Render profile form
  const renderProfileForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Close button header */}
      <View style={styles.formHeader}>
        <TouchableOpacity
          style={styles.formCloseButton}
          onPress={() => animateTransition(false)}
          activeOpacity={0.7}
        >
          <Feather name="x" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.formHeaderTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profilePhotoSection}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            {formData.profileImage ? (
              <Image
                source={{ uri: formData.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <Feather name="user" size={50} color={colors.primary} />
            )}
            <View style={styles.cameraIconContainer}>
              <Feather name="camera" size={18} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHelpText}>Tap to change profile photo</Text>
        </View>

        {/* License Information Section */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>License Information</Text>
          <Text style={styles.sectionDescription}>
            This information is used for NC DMF harvest reporting requirements.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Do you have a NC Fishing License? *</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.hasLicense === true && styles.toggleButtonActive,
                ]}
                onPress={() => handleFieldChange('hasLicense', true)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  formData.hasLicense === true && styles.toggleButtonTextActive,
                ]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.hasLicense === false && styles.toggleButtonActive,
                ]}
                onPress={() => handleFieldChange('hasLicense', false)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  formData.hasLicense === false && styles.toggleButtonTextActive,
                ]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* WRC ID - shown when hasLicense = true */}
          {formData.hasLicense === true && (
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>WRC ID / Customer ID *</Text>
                <TouchableOpacity
                  onPress={() => setShowWrcIdInfoModal(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="info" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <TextInput
                ref={wrcIdInputRef}
                style={[
                  styles.input,
                  validationErrors.wrcId ? styles.inputError : null
                ]}
                value={formData.wrcId}
                onChangeText={(text) => handleFieldChange('wrcId', text)}
                placeholder="Enter your WRC ID or Customer ID"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
              />
              <Text style={styles.helpText}>
                Found on your NC fishing license
              </Text>
              {validationErrors.wrcId && (
                <Text style={styles.errorText}>{validationErrors.wrcId}</Text>
              )}
            </View>
          )}
        </View>

        {/* Personal Information Section */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Personal Information</Text>

          {/* Name fields - required when hasLicense = false, optional when true */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Name {formData.hasLicense === false ? '*' : ''}
            </Text>
            <View style={styles.nameInputRow}>
              <View style={styles.nameInput}>
                <TextInput
                  style={[
                    styles.input,
                    validationErrors.firstName ? styles.inputError : null
                  ]}
                  value={formData.firstName}
                  onChangeText={(text) => handleFieldChange('firstName', text)}
                  placeholder="First name"
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
                {validationErrors.firstName && (
                  <Text style={styles.errorText}>{validationErrors.firstName}</Text>
                )}
              </View>
              <View style={styles.nameInputSpacer} />
              <View style={styles.nameInput}>
                <TextInput
                  ref={lastNameInputRef}
                  style={[
                    styles.input,
                    validationErrors.lastName ? styles.inputError : null
                  ]}
                  value={formData.lastName}
                  onChangeText={(text) => handleFieldChange('lastName', text)}
                  placeholder="Last name"
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    if (formData.hasLicense === false) {
                      zipCodeInputRef.current?.focus();
                    } else {
                      emailInputRef.current?.focus();
                    }
                  }}
                  blurOnSubmit={false}
                />
                {validationErrors.lastName && (
                  <Text style={styles.errorText}>{validationErrors.lastName}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of Birth</Text>
            <TouchableOpacity
              style={[
                styles.input,
                validationErrors.dateOfBirth ? styles.inputError : null
              ]}
              onPress={() => {
                Keyboard.dismiss();
                setShowDatePicker(true);
              }}
            >
              <Text style={formData.dateOfBirth ? styles.inputText : styles.inputPlaceholder}>
                {formData.dateOfBirth ? formatDate(formData.dateOfBirth) : "Select date"}
              </Text>
              <Feather name="calendar" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            {validationErrors.dateOfBirth && (
              <Text style={styles.errorText}>{validationErrors.dateOfBirth}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              ref={emailInputRef}
              style={[
                styles.input,
                validationErrors.email ? styles.inputError : null
              ]}
              value={formData.email}
              onChangeText={(text) => handleFieldChange('email', text)}
              placeholder="Enter your email"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => phoneInputRef.current?.focus()}
              blurOnSubmit={false}
            />
            {validationErrors.email && (
              <Text style={styles.errorText}>{validationErrors.email}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <MaskInput
              ref={phoneInputRef}
              style={[
                styles.input,
                validationErrors.phone ? styles.inputError : null
              ]}
              value={formData.phone || ''}
              onChangeText={(masked, unmasked) => {
                handleFieldChange('phone', masked);
              }}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              mask={PHONE_MASK}
              returnKeyType="next"
              onSubmitEditing={() => zipCodeInputRef.current?.focus()}
            />
            {validationErrors.phone && (
              <Text style={styles.errorText}>{validationErrors.phone}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ZIP Code</Text>
            <TextInput
              ref={zipCodeInputRef}
              style={[
                styles.input,
                validationErrors.zipCode ? styles.inputError : null,
                { maxWidth: 120 }
              ]}
              value={formData.zipCode}
              onChangeText={(text) => {
                // Only allow digits, max 5
                const digits = text.replace(/\D/g, '').slice(0, 5);
                handleFieldChange('zipCode', digits);
              }}
              placeholder="12345"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={5}
              returnKeyType="done"
            />
            {validationErrors.zipCode && (
              <Text style={styles.errorText}>{validationErrors.zipCode}</Text>
            )}
          </View>
        </View>

        <View style={styles.formButtonRow}>
          <TouchableOpacity
            style={[styles.formButton, styles.formCancelButton]}
            onPress={() => animateTransition(false)}
          >
            <Text style={styles.formCancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.formButton, styles.formSaveButton]}
            onPress={saveProfile}
          >
            <Text style={styles.formSaveButtonText}>Save Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal - matching ReportFormScreen pattern */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
            <View style={styles.dateModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.dateModalContent}>
                  <View style={styles.dateModalHeader}>
                    <Text style={styles.dateModalTitle}>Select Date of Birth</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Feather name="x" size={24} color={colors.darkGray} />
                    </TouchableOpacity>
                  </View>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()}
                      mode="date"
                      display="inline"
                      onChange={onDateChange}
                      maximumDate={new Date()}
                      style={styles.datePickerInline}
                    />
                  ) : (
                    <DateTimePicker
                      value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                  <TouchableOpacity
                    style={styles.dateModalConfirmButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.dateModalConfirmText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* WRC ID Info Modal */}
        <WrcIdInfoModal visible={showWrcIdInfoModal} onClose={() => setShowWrcIdInfoModal(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Render profile display
  const renderProfile = () => (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top spacer for pull-down bounce - shows dark blue */}
        <View style={styles.topBounceArea} />

        {/* Header content - scrolls with back button inside */}
        <View style={styles.profileHeader}>
          {/* Header row with back button */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Profile</Text>
            <View style={styles.headerSpacer} />
          </View>

          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            {profile.profileImage ? (
              <Image
                source={{ uri: profile.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <Feather name="user" size={50} color={colors.primary} />
            )}
            <View style={styles.cameraIconContainer}>
              <Feather name="camera" size={18} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>
            {profile.firstName && profile.lastName
              ? `${profile.firstName} ${profile.lastName}`
              : profile.firstName || profile.lastName || "Add Your Name"}
          </Text>
        </View>

      {/* Content area with light background */}
      <View style={styles.contentArea}>
      <View style={styles.infoContainer}>
        {/* License Status Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>License Status</Text>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Feather
                name={profile.hasLicense ? "check-circle" : "x-circle"}
                size={18}
                color={profile.hasLicense ? colors.success || colors.primary : colors.darkGray}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>NC Fishing License</Text>
              <Text style={styles.infoValue}>
                {profile.hasLicense === true ? "Yes" :
                 profile.hasLicense === false ? "No" : "Not specified"}
              </Text>
            </View>
          </View>

          {profile.hasLicense === true && profile.wrcId && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="credit-card" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>WRC ID / Customer ID</Text>
                <Text style={styles.infoValue}>{profile.wrcId}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Personal Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Personal Information</Text>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Feather name="user" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              <View style={styles.nameRow}>
                <Text style={styles.infoValue}>{profile.firstName || "Not provided"} </Text>
                <Text style={styles.infoValue}>{profile.lastName || ""}</Text>
              </View>
            </View>
          </View>

          {profile.dateOfBirth && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="calendar" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{formatDate(profile.dateOfBirth)}</Text>
              </View>
            </View>
          )}

          {profile.phone && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="phone" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phone}</Text>
              </View>
            </View>
          )}

          {profile.email && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="mail" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
              </View>
            </View>
          )}

          {profile.zipCode && (
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Feather name="map-pin" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ZIP Code</Text>
                <Text style={styles.infoValue}>{profile.zipCode}</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => animateTransition(true)}
        >
          <Feather name="edit-2" size={18} color={colors.white} />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.licenseSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fishing License</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("LicenseDetails")}
            style={styles.viewLicenseButton}
          >
            <Text style={styles.viewLicenseText}>View License</Text>
            <Feather name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.licenseDescription}>
          Manage your fishing license information in the License Details section
        </Text>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Fishing Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{fishingStats.totalCatches}</Text>
            <Text style={styles.statLabel}>Catches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{fishingStats.uniqueSpecies}</Text>
            <Text style={styles.statLabel}>Species</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {fishingStats.largestFish !== null ? `${fishingStats.largestFish}"` : '--'}
            </Text>
            <Text style={styles.statLabel}>Largest Fish</Text>
          </View>
        </View>
      </View>
      </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      {/* Always render profile underneath */}
      {renderProfile()}

      {/* Overlay the form when editing */}
      {isEditing && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: slideAnim }] }]}>
          {renderProfileForm()}
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  // Invisible spacer that shows primary color when pulling down at top
  topBounceArea: {
    backgroundColor: colors.primary,
    height: 500,
    marginTop: -500,
  },
  // Content area with light background
  contentArea: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingBottom: spacing.xl * 2,
  },
  // Header row containing back button and title
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.lg,
  },
  // Back Button inside header
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Spacer to balance the back button on the right
  headerSpacer: {
    width: 40,
    height: 40,
  },
  // Profile Header
  profileHeader: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
    fontSize: 20,
    textAlign: 'center',
    flex: 1,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    overflow: 'visible',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.medium,
  },
  profileName: {
    ...typography.h1,
    color: colors.white,
    marginBottom: spacing.xxs,
  },
  profileSubtitle: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
  },
  // Info Section
  infoContainer: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: -spacing.xl,
    ...shadows.medium,
  },
  infoSection: {
    marginBottom: spacing.lg,
  },
  infoSectionTitle: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.darkGray,
    marginBottom: spacing.xxs,
  },
  infoValue: {
    ...typography.body,
    color: colors.black,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  editButtonText: {
    ...typography.button,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  // License Section
  licenseSection: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.primary,
  },
  viewLicenseButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewLicenseText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginRight: spacing.xxs,
  },
  licenseDescription: {
    ...typography.body,
    color: colors.darkGray,
    marginTop: spacing.xs,
  },
  // Stats Section
  statsSection: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.medium,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  statCard: {
    width: '30%',
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.darkGray,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Form styles
  formContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formContentContainer: {
    padding: spacing.lg,
  },
  formSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  formSectionTitle: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  sectionDescription: {
    ...typography.body,
    color: colors.darkGray,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  toggleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  toggleButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.darkGray,
  },
  toggleButtonTextActive: {
    color: colors.primary,
  },
  helpText: {
    ...typography.bodySmall,
    color: colors.darkGray,
    marginTop: spacing.xxs,
    fontStyle: 'italic',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  formCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeaderTitle: {
    ...typography.h1,
    color: colors.white,
    fontSize: 20,
  },
  profilePhotoSection: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  photoHelpText: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameInput: {
    flex: 1,
  },
  nameInputSpacer: {
    width: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.sm,
    fontSize: 16,
    color: colors.black,
    backgroundColor: colors.white,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: {
    borderColor: colors.error || '#FF3B30',
    borderWidth: 1,
  },
  errorText: {
    color: colors.error || '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  inputText: {
    fontSize: 16,
    color: colors.black,
    flex: 1,
  },
  inputPlaceholder: {
    fontSize: 16,
    color: colors.textTertiary,
    flex: 1,
  },
  suggestionsContainer: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginTop: 4,
    height: 150,
    overflow: 'hidden',
    ...shadows.medium,
    zIndex: 999,
    position: 'absolute',
    top: 104, // Position below the text input (adjusted for your layout)
    left: 0,
    right: 0,
  },
  suggestionsScroll: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  suggestionIcon: {
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.black,
    flex: 1,
  },
  formButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  formButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelButton: {
    backgroundColor: colors.white,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formSaveButton: {
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  formCancelButtonText: {
    ...typography.button,
    color: colors.darkGray,
  },
  formSaveButtonText: {
    ...typography.button,
    color: colors.white,
  },
  // Date picker modal styles - matching ReportFormScreen
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  datePickerInline: {
    height: 350,
    width: '100%',
  },
  dateModalConfirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  dateModalConfirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
