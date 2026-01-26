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
import {
  getPendingAuth,
  clearPendingAuth,
  sendMagicLink,
  storePendingAuth,
  PendingAuth,
  signOut,
} from "../services/authService";
import { isRewardsMember, getCurrentUser } from "../services/userService";
import { User } from "../types/user";

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

  // State for pending magic link auth
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
  const [pendingAuthEmail, setPendingAuthEmail] = useState<string>('');
  const [isResendingLink, setIsResendingLink] = useState<boolean>(false);
  const [isEditingPendingEmail, setIsEditingPendingEmail] = useState<boolean>(false);

  // State for rewards member status
  const [rewardsMember, setRewardsMember] = useState<boolean>(false);
  const [rewardsMemberUser, setRewardsMemberUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  // State for sign-in flow (for non-members)
  const [showSignInForm, setShowSignInForm] = useState<boolean>(false);
  const [signInEmail, setSignInEmail] = useState<string>('');
  const [signInFirstName, setSignInFirstName] = useState<string>('');
  const [signInLastName, setSignInLastName] = useState<string>('');
  const [isSendingSignInLink, setIsSendingSignInLink] = useState<boolean>(false);

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

        // Check for pending magic link auth
        const pending = await getPendingAuth();
        if (pending) {
          setPendingAuth(pending);
          setPendingAuthEmail(pending.email);
        }

        // Check if user is a rewards member
        const isMember = await isRewardsMember();
        setRewardsMember(isMember);
        if (isMember) {
          const user = await getCurrentUser();
          setRewardsMemberUser(user);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load your profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    // Set up a focus listener to refresh data when returning to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });

    return unsubscribe;
  }, [navigation]);

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

  // Handle resending magic link
  const handleResendMagicLink = async () => {
    if (!pendingAuthEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(pendingAuthEmail.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsResendingLink(true);

    try {
      // Update pending auth with new email if changed
      const updatedPendingAuth: PendingAuth = {
        email: pendingAuthEmail.trim().toLowerCase(),
        firstName: pendingAuth?.firstName || '',
        lastName: pendingAuth?.lastName || '',
        phone: pendingAuth?.phone,
        sentAt: new Date().toISOString(),
      };

      await storePendingAuth(updatedPendingAuth);

      // Send magic link
      const result = await sendMagicLink(pendingAuthEmail.trim(), {
        firstName: pendingAuth?.firstName,
        lastName: pendingAuth?.lastName,
        phone: pendingAuth?.phone,
      });

      if (result.success) {
        setPendingAuth(updatedPendingAuth);
        setIsEditingPendingEmail(false);
        Alert.alert(
          'Email Sent!',
          `We've sent a new sign-in link to ${pendingAuthEmail.trim()}. Check your inbox!`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification email.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsResendingLink(false);
    }
  };

  // Handle canceling pending auth
  const handleCancelPendingAuth = () => {
    Alert.alert(
      'Cancel Sign Up?',
      'Are you sure you want to cancel the Rewards sign up? You can always sign up again later.',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        {
          text: 'Cancel Sign Up',
          style: 'destructive',
          onPress: async () => {
            await clearPendingAuth();
            setPendingAuth(null);
            setPendingAuthEmail('');
            setIsEditingPendingEmail(false);
          },
        },
      ]
    );
  };

  // Handle sign in / join rewards for returning users
  const handleSignIn = async () => {
    if (!signInEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signInEmail.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // For new sign-ups, require first and last name
    if (showSignInForm && (!signInFirstName.trim() || !signInLastName.trim())) {
      Alert.alert('Name Required', 'Please enter your first and last name to join rewards.');
      return;
    }

    setIsSendingSignInLink(true);

    try {
      // Store pending auth data
      const newPendingAuth: PendingAuth = {
        email: signInEmail.trim().toLowerCase(),
        firstName: signInFirstName.trim(),
        lastName: signInLastName.trim(),
        sentAt: new Date().toISOString(),
      };

      await storePendingAuth(newPendingAuth);

      // Send magic link
      const result = await sendMagicLink(signInEmail.trim(), {
        firstName: signInFirstName.trim(),
        lastName: signInLastName.trim(),
      });

      if (result.success) {
        setPendingAuth(newPendingAuth);
        setPendingAuthEmail(signInEmail.trim());
        setShowSignInForm(false);
        setSignInEmail('');
        setSignInFirstName('');
        setSignInLastName('');
        Alert.alert(
          'Check Your Email!',
          `We've sent a sign-in link to ${newPendingAuth.email}. Click the link to complete sign-in.`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send sign-in link. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSendingSignInLink(false);
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out?',
      'Are you sure you want to sign out of Rewards? You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              const result = await signOut();
              if (result.success) {
                setRewardsMember(false);
                setRewardsMemberUser(null);
                Alert.alert('Signed Out', 'You have been signed out of Rewards.');
              } else {
                Alert.alert('Error', result.error || 'Failed to sign out.');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred.');
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
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
        {/* Rewards Member Banner - shown when signed in */}
        {rewardsMember && rewardsMemberUser && (
          <View style={[styles.infoSection, localStyles.rewardsMemberSection]}>
            <View style={localStyles.rewardsMemberHeader}>
              <View style={localStyles.rewardsMemberIcon}>
                <Feather name="award" size={20} color={colors.white} />
              </View>
              <View style={localStyles.rewardsMemberInfo}>
                <Text style={localStyles.rewardsMemberTitle}>Rewards Member</Text>
                <Text style={localStyles.rewardsMemberEmail}>{rewardsMemberUser.email}</Text>
              </View>
              <Feather name="check-circle" size={20} color="#4CAF50" />
            </View>

            <Text style={localStyles.rewardsMemberDesc}>
              You're entered in the quarterly drawing! Keep reporting your catches to earn more entries.
            </Text>

            <TouchableOpacity
              style={localStyles.signOutButton}
              onPress={handleSignOut}
              disabled={isSigningOut}
              activeOpacity={0.7}
            >
              {isSigningOut ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <>
                  <Feather name="log-out" size={16} color={colors.textSecondary} />
                  <Text style={localStyles.signOutButtonText}>Sign Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Magic Link Auth Section */}
        {pendingAuth && !rewardsMember && (
          <View style={[styles.infoSection, localStyles.pendingAuthSection]}>
            <View style={localStyles.pendingAuthHeader}>
              <View style={localStyles.pendingAuthIcon}>
                <Feather name="mail" size={20} color={colors.white} />
              </View>
              <Text style={localStyles.pendingAuthTitle}>Rewards Sign Up Pending</Text>
            </View>

            <Text style={localStyles.pendingAuthDesc}>
              Check your email for the sign-in link. If you didn't receive it, you can resend below.
            </Text>

            <View style={localStyles.pendingAuthEmailContainer}>
              <Text style={localStyles.pendingAuthLabel}>Email</Text>
              {isEditingPendingEmail ? (
                <TextInput
                  style={localStyles.pendingAuthInput}
                  value={pendingAuthEmail}
                  onChangeText={setPendingAuthEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              ) : (
                <View style={localStyles.pendingAuthEmailRow}>
                  <Text style={localStyles.pendingAuthEmail}>{pendingAuthEmail}</Text>
                  <TouchableOpacity
                    onPress={() => setIsEditingPendingEmail(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="edit-2" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {pendingAuth.sentAt && (
              <Text style={localStyles.pendingAuthSentAt}>
                Last sent: {new Date(pendingAuth.sentAt).toLocaleString()}
              </Text>
            )}

            <View style={localStyles.pendingAuthActions}>
              <TouchableOpacity
                style={[localStyles.pendingAuthButton, localStyles.pendingAuthResendButton]}
                onPress={handleResendMagicLink}
                disabled={isResendingLink}
                activeOpacity={0.7}
              >
                {isResendingLink ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Feather name="send" size={16} color={colors.white} />
                    <Text style={localStyles.pendingAuthButtonText}>
                      {isEditingPendingEmail ? 'Send Link' : 'Resend Link'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[localStyles.pendingAuthButton, localStyles.pendingAuthCancelButton]}
                onPress={handleCancelPendingAuth}
                activeOpacity={0.7}
              >
                <Feather name="x" size={16} color={colors.textSecondary} />
                <Text style={localStyles.pendingAuthCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sign In / Join Rewards Section - shown when not a member and no pending auth */}
        {!rewardsMember && !pendingAuth && (
          <View style={[styles.infoSection, localStyles.signInSection]}>
            <View style={localStyles.signInHeader}>
              <View style={localStyles.signInIcon}>
                <Feather name="award" size={20} color={colors.white} />
              </View>
              <Text style={localStyles.signInTitle}>Join Quarterly Rewards</Text>
            </View>

            <Text style={localStyles.signInDesc}>
              Sign in with your email to be entered in the quarterly prize drawing. Report your catches to earn more entries!
            </Text>

            {showSignInForm ? (
              <View style={localStyles.signInForm}>
                <View style={localStyles.signInInputGroup}>
                  <Text style={localStyles.signInLabel}>Email *</Text>
                  <TextInput
                    style={localStyles.signInInput}
                    value={signInEmail}
                    onChangeText={setSignInEmail}
                    placeholder="your.email@example.com"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>

                <View style={localStyles.signInNameRow}>
                  <View style={[localStyles.signInInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={localStyles.signInLabel}>First Name *</Text>
                    <TextInput
                      style={localStyles.signInInput}
                      value={signInFirstName}
                      onChangeText={setSignInFirstName}
                      placeholder="First"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={[localStyles.signInInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={localStyles.signInLabel}>Last Name *</Text>
                    <TextInput
                      style={localStyles.signInInput}
                      value={signInLastName}
                      onChangeText={setSignInLastName}
                      placeholder="Last"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={localStyles.signInActions}>
                  <TouchableOpacity
                    style={localStyles.signInSubmitButton}
                    onPress={handleSignIn}
                    disabled={isSendingSignInLink}
                    activeOpacity={0.7}
                  >
                    {isSendingSignInLink ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Feather name="send" size={16} color={colors.white} />
                        <Text style={localStyles.signInSubmitText}>Send Sign-In Link</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={localStyles.signInCancelButton}
                    onPress={() => {
                      setShowSignInForm(false);
                      setSignInEmail('');
                      setSignInFirstName('');
                      setSignInLastName('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={localStyles.signInCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={localStyles.joinRewardsButton}
                onPress={() => setShowSignInForm(true)}
                activeOpacity={0.7}
              >
                <Feather name="user-plus" size={18} color={colors.white} />
                <Text style={localStyles.joinRewardsText}>Sign In or Join Rewards</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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

// Local styles for pending auth section
const localStyles = StyleSheet.create({
  pendingAuthSection: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingAuthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pendingAuthIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  pendingAuthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pendingAuthDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  pendingAuthEmailContainer: {
    marginBottom: spacing.sm,
  },
  pendingAuthLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pendingAuthEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingAuthEmail: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  pendingAuthInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    fontSize: 15,
    color: colors.textPrimary,
  },
  pendingAuthSentAt: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  pendingAuthActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pendingAuthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  pendingAuthResendButton: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  pendingAuthCancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingAuthButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  pendingAuthCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Rewards member section styles
  rewardsMemberSection: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rewardsMemberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rewardsMemberIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rewardsMemberInfo: {
    flex: 1,
  },
  rewardsMemberTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rewardsMemberEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rewardsMemberDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  signOutButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Sign in section styles
  signInSection: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  signInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  signInIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  signInTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  signInDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  signInForm: {
    marginTop: spacing.sm,
  },
  signInInputGroup: {
    marginBottom: spacing.sm,
  },
  signInLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  signInInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.textPrimary,
  },
  signInNameRow: {
    flexDirection: 'row',
  },
  signInActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  signInSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    gap: 8,
  },
  signInSubmitText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  signInCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  signInCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  joinRewardsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    gap: 8,
  },
  joinRewardsText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ProfileScreen;
