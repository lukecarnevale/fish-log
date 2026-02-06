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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import MaskInput from 'react-native-mask-input';
import * as ImagePicker from 'expo-image-picker';

// Instead of using GooglePlacesAutocomplete which causes UUID issues
import { UserProfile } from "../types";
import { colors, spacing, borderRadius, shadows, typography } from "../styles/common";
import { clearCatchFeedCache } from "../services/catchFeedService";
import WrcIdInfoModal from "../components/WrcIdInfoModal";
import { StoredReport } from "../types/report";
import {
  getPendingAuth,
  clearPendingAuth,
  sendMagicLink,
  storePendingAuth,
  PendingAuth,
  signOut,
  onAuthStateChange,
} from "../services/authService";
import { getCurrentUser, updateCurrentUser, getUserStats } from "../services/userProfileService";
import { isRewardsMember } from "../services/rewardsConversionService";
import { User, UserAchievement } from "../types/user";
import { useZipCodeLookup } from "../hooks/useZipCodeLookup";
import { useFishingStats } from "../hooks/useFishingStats";
import { uploadProfilePhoto, isLocalUri } from "../services/photoUploadService";
import { ProfileScreenNavigationProp, ProfileScreenProps } from "./profile/profileScreen.types";
import { profileSchema } from "../constants/validationSchemas";
import { PHONE_MASK } from "../constants/inputMasks";
import * as yup from 'yup';
import AnglerAvatarIcon from "../components/icons/AnglerAvatarIcon";
import { styles, localStyles } from "../styles/profileScreenStyles";
import ProfileStats from "./profile/ProfileStats";
import ProfileAchievements from "./profile/ProfileAchievements";

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<UserProfile>({});

  // ZIP code lookup for city/state display feedback
  const zipLookup = useZipCodeLookup(formData.zipCode);

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isPickerMounted, setIsPickerMounted] = useState<boolean>(false);
  const [datePickerKey, setDatePickerKey] = useState<number>(0);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Load fishing stats using custom hook
  const { fishingStats, statsLoading } = useFishingStats();

  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);

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
  const [signInEmailError, setSignInEmailError] = useState<string>('');
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
        console.log('🔔 ProfileScreen - Pending auth loaded:', pending ? pending.email : 'none');
        if (pending) {
          setPendingAuth(pending);
          setPendingAuthEmail(pending.email);
        } else {
          // Clear pending auth state if none exists (important for re-renders)
          setPendingAuth(null);
          setPendingAuthEmail('');
        }

        // Check if user is a rewards member
        const isMember = await isRewardsMember();
        console.log('🏆 ProfileScreen - Is rewards member:', isMember);
        setRewardsMember(isMember);
        if (isMember) {
          const user = await getCurrentUser();
          console.log('🏆 ProfileScreen - Rewards member email:', user?.email);
          setRewardsMemberUser(user);

          // Load user achievements
          try {
            const stats = await getUserStats();
            setUserAchievements(stats.achievements || []);
            console.log(`🏆 ProfileScreen - Loaded ${stats.achievements?.length || 0} achievements`);
          } catch (achievementError) {
            console.warn('Failed to load achievements:', achievementError);
            setUserAchievements([]);
          }
        } else {
          // Clear rewards member state if not a member (important for re-renders)
          setRewardsMemberUser(null);
          setUserAchievements([]);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load your profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    // Set up a focus listener to refresh data when returning to this screen
    const focusUnsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });

    // Set up an auth state listener to refresh when user signs in
    const authUnsubscribe = onAuthStateChange((event, _session) => {
      console.log('🔐 ProfileScreen - Auth state changed:', event);
      if (event === 'SIGNED_IN') {
        // Delay to allow createRewardsMemberFromAuthUser to complete
        // Then retry if still not showing as member (database operations can take time)
        const attemptReload = async (attempt: number) => {
          console.log(`🔄 ProfileScreen - Reloading after sign in (attempt ${attempt})...`);
          await loadProfile();

          // Check if still showing pending auth after reload
          const stillPending = await getPendingAuth();
          const isMember = await isRewardsMember();

          if (stillPending && !isMember && attempt < 3) {
            // Retry after another delay
            setTimeout(() => attemptReload(attempt + 1), 1000);
          }
        };

        // Initial delay to let createRewardsMemberFromAuthUser start
        setTimeout(() => attemptReload(1), 1500);
      }
    });

    return () => {
      focusUnsubscribe();
      authUnsubscribe?.();
    };
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
        const imageUri = result.assets[0].uri;
        const newFormData = { ...formData, profileImage: imageUri };
        setFormData(newFormData);

        if (!isEditing) {
          // If not in edit mode, directly save the profile picture
          try {
            // Get current user to check if signed in
            const currentUser = await getCurrentUser();
            let finalImageUrl: string | null = imageUri;

            // Upload to Supabase if user is signed in
            if (currentUser?.id && isLocalUri(imageUri)) {
              console.log('📸 Uploading profile photo to Supabase...');
              const uploadedUrl = await uploadProfilePhoto(imageUri, currentUser.id);
              if (uploadedUrl) {
                finalImageUrl = uploadedUrl;
                console.log('✅ Profile photo uploaded:', uploadedUrl);

                // Update user record in Supabase
                await updateCurrentUser({
                  profileImageUrl: uploadedUrl,
                });

                // Clear Catch Feed cache so profile image updates appear
                await clearCatchFeedCache();
                console.log('🔄 Cleared Catch Feed cache after profile update');
              }
            }

            const profileToSave = { ...formData, profileImage: finalImageUrl };
            await AsyncStorage.setItem("userProfile", JSON.stringify(profileToSave));
            setProfile(profileToSave);
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
    } catch (error: any) {
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

  // Save profile data to AsyncStorage and sync to Supabase
  const saveProfile = async () => {
    try {
      // Validate all fields
      try {
        await profileSchema.validate(formData, { abortEarly: false });
      } catch (error: any) {
        if (error instanceof yup.ValidationError) {
          // Transform validation errors into object
          const errors: {[key: string]: string} = {};
          error.inner.forEach((err: any) => {
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

      // Get current user to check if signed in and get user ID
      const currentUser = await getCurrentUser();
      let profileImageUrl: string | null = null;

      // Handle profile image upload/sync
      if (formData.profileImage && currentUser?.id) {
        if (isLocalUri(formData.profileImage)) {
          // Upload new local image to Supabase
          console.log('📸 Uploading profile photo to Supabase...');
          profileImageUrl = await uploadProfilePhoto(formData.profileImage, currentUser.id);
          if (profileImageUrl) {
            console.log('✅ Profile photo uploaded:', profileImageUrl);
          } else {
            console.log('⚠️ Profile photo upload failed, continuing with local image');
          }
        } else if (formData.profileImage.startsWith('http')) {
          // Image is already a URL, use it directly
          profileImageUrl = formData.profileImage;
          console.log('📸 Using existing profile photo URL:', profileImageUrl);
        }
      }

      // Save to AsyncStorage (with local or uploaded URL)
      const profileToSave = {
        ...formData,
        // If we uploaded successfully, update the image URL to the public URL
        profileImage: profileImageUrl || formData.profileImage,
      };
      await AsyncStorage.setItem("userProfile", JSON.stringify(profileToSave));

      // Sync profile to Supabase if user is signed in
      if (currentUser?.id) {
        try {
          await updateCurrentUser({
            firstName: formData.firstName || undefined,
            lastName: formData.lastName || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            zipCode: formData.zipCode || undefined,
            hasLicense: formData.hasLicense,
            wrcId: formData.wrcId || undefined,
            profileImageUrl: profileImageUrl || undefined,
            preferredAreaCode: formData.preferredAreaCode || undefined,
            preferredAreaLabel: formData.preferredAreaLabel || undefined,
          });
          console.log('✅ Profile synced to Supabase');
        } catch (syncError) {
          console.warn('Failed to sync profile to Supabase:', syncError);
          // Continue anyway - local save was successful
        }
      }

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

      setProfile(profileToSave);
      setValidationErrors({});

      // Clear Catch Feed cache so profile image updates appear immediately
      if (profileImageUrl) {
        await clearCatchFeedCache();
        console.log('🔄 Cleared Catch Feed cache after profile update');
      }

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

  // Validate sign-in email
  const validateSignInEmail = (email: string): boolean => {
    if (!email.trim()) {
      setSignInEmailError('');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setSignInEmailError('Please enter a valid email address');
      return false;
    }
    setSignInEmailError('');
    return true;
  };

  // Handle sign-in email change
  const handleSignInEmailChange = (text: string) => {
    setSignInEmail(text);
    // Clear error while typing, validate on blur
    if (signInEmailError) {
      setSignInEmailError('');
    }
  };

  // Handle sign-in email blur
  const handleSignInEmailBlur = () => {
    if (signInEmail.trim()) {
      validateSignInEmail(signInEmail);
    }
  };

  // Handle sign in / join rewards for returning users
  const handleSignIn = async () => {
    if (!signInEmail.trim()) {
      setSignInEmailError('Email is required');
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!validateSignInEmail(signInEmail)) {
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
  // On iOS spinner: fires on each scroll, user confirms with Done button
  // On Android native dialog: fires once when OK/Cancel is pressed
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android native picker: close modal and apply date if OK was pressed
      if (event.type === 'set' && selectedDate) {
        const formattedDate = selectedDate.toISOString().split('T')[0];
        setFormData({
          ...formData,
          dateOfBirth: formattedDate
        });
      }
      // Close the modal for both OK and Cancel
      closeDatePicker();
    } else {
      // iOS spinner: just update temp date, user confirms with Done button
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  // Confirm date selection and close picker
  const confirmDateSelection = () => {
    const formattedDate = tempDate.toISOString().split('T')[0];
    setFormData({
      ...formData,
      dateOfBirth: formattedDate
    });
    closeDatePicker();
  };

  // Close date picker with delayed unmount to prevent flash
  const closeDatePicker = () => {
    setShowDatePicker(false);
    // Delay unmounting the picker until after modal fade animation
    setTimeout(() => setIsPickerMounted(false), 300);
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
              <AnglerAvatarIcon size={105} />
            )}
            <View style={styles.cameraIconContainer}>
              <Feather name="camera" size={18} color={colors.primary} />
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
                // Initialize tempDate with current value or a sensible default (30 years ago)
                // Using 30 years ago allows scrolling both directions without hitting maximumDate
                const defaultDate = new Date();
                defaultDate.setFullYear(defaultDate.getFullYear() - 30);
                setTempDate(formData.dateOfBirth ? new Date(formData.dateOfBirth) : defaultDate);
                setDatePickerKey(prev => prev + 1);
                setIsPickerMounted(true);
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
            <View style={styles.zipInputRow}>
              <TextInput
                ref={zipCodeInputRef}
                style={[
                  styles.input,
                  styles.zipInput,
                  validationErrors.zipCode ? styles.inputError : null,
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
              {/* ZIP code lookup feedback */}
              {formData.zipCode?.length === 5 && !validationErrors.zipCode && (
                <View style={styles.zipFeedback}>
                  {zipLookup.isLoading && (
                    <Text style={styles.zipFeedbackLoading}>Checking...</Text>
                  )}
                  {zipLookup.result && !zipLookup.isLoading && (
                    <View style={styles.zipFeedbackSuccess}>
                      <Feather name="check-circle" size={14} color="#28a745" />
                      <Text style={styles.zipFeedbackSuccessText}>
                        {zipLookup.result.city}, {zipLookup.result.stateAbbr}
                      </Text>
                    </View>
                  )}
                  {zipLookup.error && !zipLookup.isLoading && (
                    <View style={styles.zipFeedbackWarning}>
                      <Feather name="alert-circle" size={14} color="#ff9800" />
                      <Text style={styles.zipFeedbackWarningText}>{zipLookup.error}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
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
          onRequestClose={closeDatePicker}
        >
          <View style={styles.dateModalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeDatePicker}
            />
            <View style={styles.dateModalContent}>
              <View style={styles.dateModalHeader}>
                <Text style={styles.dateModalTitle}>Select Date of Birth</Text>
                <TouchableOpacity onPress={closeDatePicker}>
                  <Feather name="x" size={24} color={colors.darkGray} />
                </TouchableOpacity>
              </View>
              {isPickerMounted && (
                <DateTimePicker
                  key={`profile-dob-picker-${datePickerKey}`}
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  themeVariant="light"
                  style={Platform.OS === 'ios' ? { height: 216, width: '100%' } : undefined}
                />
              )}
              <TouchableOpacity
                style={styles.dateModalConfirmButton}
                onPress={confirmDateSelection}
              >
                <Text style={styles.dateModalConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
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
              <AnglerAvatarIcon size={105} />
            )}
          </TouchableOpacity>
          {(profile.firstName || profile.lastName) && (
            <Text style={styles.profileName}>
              {profile.firstName && profile.lastName
                ? `${profile.firstName} ${profile.lastName}`
                : profile.firstName || profile.lastName}
            </Text>
          )}
        </View>

      {/* Content area with light background */}
      <View style={styles.contentArea}>
      <View style={styles.infoContainer}>
        {/* Rewards Status Section - with skeleton loading */}
        {loading ? (
          /* Skeleton loader while checking rewards status */
          <View style={[styles.infoSection, localStyles.skeletonSection]}>
            <View style={localStyles.skeletonHeader}>
              <View style={localStyles.skeletonIcon} />
              <View style={localStyles.skeletonTextContainer}>
                <View style={localStyles.skeletonTitle} />
                <View style={localStyles.skeletonSubtitle} />
              </View>
            </View>
            <View style={localStyles.skeletonDescription} />
            <View style={localStyles.skeletonButton} />
          </View>
        ) : rewardsMember && rewardsMemberUser ? (
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
        ) : pendingAuth ? (
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
        ) : (
          /* Sign In / Join Rewards Section - shown when not a member and no pending auth */
          <View style={[styles.infoSection, localStyles.signInSection]}>
            <View style={localStyles.signInHeader}>
              <View style={localStyles.signInIcon}>
                <Feather name="award" size={20} color={colors.white} />
              </View>
              <Text style={localStyles.signInTitle}>Quarterly Rewards</Text>
            </View>

            <Text style={localStyles.signInDesc}>
              Sign in with your email to be entered in the quarterly prize drawing. Report your catches to earn more entries!
            </Text>

            {showSignInForm ? (
              <View style={localStyles.signInForm}>
                <View style={localStyles.signInInputGroup}>
                  <Text style={localStyles.signInLabel}>Email *</Text>
                  <TextInput
                    style={[
                      localStyles.signInInput,
                      signInEmailError ? localStyles.signInInputError : null
                    ]}
                    value={signInEmail}
                    onChangeText={handleSignInEmailChange}
                    onBlur={handleSignInEmailBlur}
                    placeholder="your.email@example.com"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                  {signInEmailError ? (
                    <Text style={localStyles.signInInputErrorText}>{signInEmailError}</Text>
                  ) : null}
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
                onPress={() => {
                  // Pre-populate form fields with stored profile data
                  setSignInEmail(profile.email || '');
                  setSignInFirstName(profile.firstName || '');
                  setSignInLastName(profile.lastName || '');
                  setShowSignInForm(true);
                }}
                activeOpacity={0.7}
              >
                <Feather name="user-plus" size={18} color={colors.white} />
                <Text style={localStyles.joinRewardsText}>{profile.email ? 'Sign In to Rewards Program' : 'Join Rewards Program'}</Text>
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

      <ProfileStats fishingStats={fishingStats} statsLoading={statsLoading} />

      {/* Achievements Section - Only show for rewards members with achievements */}
      {rewardsMember && userAchievements.length > 0 && (
        <ProfileAchievements achievements={userAchievements} />
      )}
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

export default ProfileScreen;
