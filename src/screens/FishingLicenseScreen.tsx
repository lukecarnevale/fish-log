// screens/FishingLicenseScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";

import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList, FishingLicense } from "../types";
import { spacing, borderRadius } from "../styles/common";
import { useTheme } from "../contexts/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { Theme } from "../styles/theme";
import { createFishingLicenseScreenStyles } from "../styles/fishingLicenseScreenStyles";
import LicenseTypePicker from "../components/LicenseTypePicker";
import { NCFlagIcon } from "../components/NCFlagIcon";
import ExpandableSection from "../components/ExpandableSection";
import WrcIdInfoModal from "../components/WrcIdInfoModal";
import FloatingBackButton from "../components/FloatingBackButton";
import StatusBarScrollBlur from "../components/StatusBarScrollBlur";
import { useFloatingHeaderAnimation } from "../hooks/useFloatingHeaderAnimation";
import { SCREEN_LABELS } from "../constants/screenLabels";
import { getCurrentUser, updateCurrentUser } from "../services/userProfileService";
import { onAuthStateChange } from "../services/authService";
import UnsavedChangesModal from "../components/UnsavedChangesModal";
import { safeOpenURL } from "../utils/openURL";

type FishingLicenseScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "LicenseDetails"
>;

interface FishingLicenseScreenProps {
  navigation: FishingLicenseScreenNavigationProp;
}

const FishingLicenseScreen: React.FC<FishingLicenseScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createFishingLicenseScreenStyles);
  const profileStyles = useThemedStyles(createProfileStyles);
  const flStyles = useThemedStyles(createFlStyles);

  const [license, setLicense] = useState<FishingLicense | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<FishingLicense>({});
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isPickerMounted, setIsPickerMounted] = useState<boolean>(false);
  const [datePickerKey, setDatePickerKey] = useState<number>(0);
  const [currentDateField, setCurrentDateField] = useState<'issueDate' | 'expiryDate'>('issueDate');
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [licenseTypes] = useState<string[]>([
    "Annual Coastal Recreational Fishing License",
    "10-Day Coastal Recreational Fishing License",
    "Lifetime Unified Inland/Coastal Recreational Fishing License",
    "Annual Inland Fishing License",
    "10-Day Inland Fishing License",
    "Lifetime Unified Hunting/Inland Fishing License",
    "Resident Comprehensive Inland Fishing License",
    "Resident Sportsman License",
    "Non-Resident Sportsman License",
  ]);
  const [showLicenseTypeModal, setShowLicenseTypeModal] = useState<boolean>(false);
  const [infoModalVisible, setInfoModalVisible] = useState<boolean>(false);
  const [showLicenseNumberInfoModal, setShowLicenseNumberInfoModal] = useState<boolean>(false);

  // Keyboard tracking for floating Done toolbar on numeric fields
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [numericFieldFocused, setNumericFieldFocused] = useState(false);

  // Unsaved changes modal state
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const pendingNavigationAction = useRef<(() => void) | null>(null);
  const hasConfirmedDiscard = useRef(false);

  // Floating header animation
  const { scrollY, floatingOpacity, floatingTranslateXLeft } = useFloatingHeaderAnimation();

  // Animation for transitioning between view/edit modes
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;

  // Check if form data differs from saved license
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!isEditing) return false;
    const fieldsToCheck: (keyof FishingLicense)[] = [
      'firstName', 'lastName', 'licenseNumber', 'licenseType', 'issueDate', 'expiryDate',
    ];
    return fieldsToCheck.some(
      (key) => (formData[key] ?? '') !== ((license?.[key]) ?? ''),
    );
  }, [isEditing, formData, license]);

  // Intercept back navigation when in edit mode with unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isEditing || hasConfirmedDiscard.current) {
        hasConfirmedDiscard.current = false;
        return;
      }

      if (!hasUnsavedChanges()) {
        setIsEditing(false);
        return;
      }

      e.preventDefault();
      pendingNavigationAction.current = () => navigation.dispatch(e.data.action);
      setShowUnsavedModal(true);
    });

    return unsubscribe;
  }, [navigation, isEditing, hasUnsavedChanges]);

  // Handle the close button on edit form with dirty check
  const handleCloseEditForm = () => {
    if (hasUnsavedChanges()) {
      pendingNavigationAction.current = null;
      setShowUnsavedModal(true);
    } else {
      toggleEditMode(false);
    }
  };

  // Toggle edit mode with animation
  const toggleEditMode = (editing: boolean) => {
    if (editing) {
      // Entering edit mode - slide up from bottom
      setFormData(license || {});
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

  // Load license data from AsyncStorage
  const loadLicense = async () => {
    try {
      const savedLicense = await AsyncStorage.getItem("fishingLicense");
      if (savedLicense) {
        const parsedLicense = JSON.parse(savedLicense);
        setLicense(parsedLicense);
        setFormData(parsedLicense);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load your fishing license");
    } finally {
      setLoading(false);
    }
  };

  // Track keyboard height for floating Done toolbar
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    loadLicense();

    // Refresh data when screen comes into focus (e.g. after editing profile)
    const focusUnsubscribe = navigation.addListener('focus', () => {
      loadLicense();
    });

    // Refresh after auth sign-in so Supabase-synced license data appears
    const authUnsubscribe = onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        // Delay to allow syncToUserProfile to complete writing fishingLicense
        setTimeout(() => loadLicense(), 1500);
      }
    });

    return () => {
      focusUnsubscribe();
      authUnsubscribe?.();
    };
  }, [navigation]);
  
  // Save license data to AsyncStorage
  const saveLicense = async () => {
    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName) {
        Alert.alert("Missing Information", "Please enter your first and last name.");
        return;
      }
      if (!formData.licenseNumber || !formData.licenseType) {
        Alert.alert("Missing Information", "Please fill out all required fields.");
        return;
      }

      await AsyncStorage.setItem("fishingLicense", JSON.stringify(formData));

      // Also update the user profile with the name and license info
      const existingProfile = await AsyncStorage.getItem("userProfile");
      const profile = existingProfile ? JSON.parse(existingProfile) : {};
      const updatedProfile = {
        ...profile,
        firstName: formData.firstName,
        lastName: formData.lastName,
        hasLicense: true,
        wrcId: formData.licenseNumber,
      };
      await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));

      // Sync license data to Supabase if user is signed in
      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        try {
          await updateCurrentUser({
            firstName: formData.firstName || undefined,
            lastName: formData.lastName || undefined,
            hasLicense: true,
            licenseNumber: formData.licenseNumber || undefined,
            licenseType: formData.licenseType || undefined,
            licenseIssueDate: formData.issueDate || undefined,
            licenseExpiryDate: formData.expiryDate || undefined,
          });
          console.log('✅ License data synced to Supabase');
        } catch (syncError) {
          console.warn('Failed to sync license data to Supabase:', syncError);
          // Continue anyway - local save was successful
        }
      }

      setLicense(formData);
      // Animate back to license view - slide down
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIsEditing(false);
        Alert.alert("Success", "Your fishing license information has been saved.");
      });
    } catch (error) {
      Alert.alert("Error", "Failed to save your fishing license");
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
  
  // Handle date change from date picker
  // On iOS spinner: fires on each scroll, user confirms with Done button
  // On Android native dialog: fires once when OK/Cancel is pressed
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android native picker: close modal and apply date if OK was pressed
      if (event.type === 'set' && selectedDate) {
        // Validate issue date is not in the future
        if (currentDateField === 'issueDate') {
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          if (selectedDate > today) {
            Alert.alert('Invalid Date', 'Issue date cannot be in the future.');
            closeDatePicker();
            return;
          }
        }
        const formattedDate = selectedDate.toISOString().split('T')[0];
        setFormData({
          ...formData,
          [currentDateField]: formattedDate
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

  // Confirm date selection and close picker (validates issue date is not in the future)
  const confirmDateSelection = () => {
    if (currentDateField === 'issueDate') {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (tempDate > today) {
        Alert.alert('Invalid Date', 'Issue date cannot be in the future.');
        return;
      }
    }
    const formattedDate = tempDate.toISOString().split('T')[0];
    setFormData({
      ...formData,
      [currentDateField]: formattedDate
    });
    closeDatePicker();
  };

  // Close date picker with delayed unmount to prevent flash
  const closeDatePicker = () => {
    setShowDatePicker(false);
    // Delay unmounting the picker until after modal fade animation
    setTimeout(() => setIsPickerMounted(false), 300);
  };

  // Helper to safely get a valid Date object from a date string
  // Returns today's date for any invalid, empty, or epoch-era values
  const getValidDate = (dateString: string | undefined): Date => {
    if (!dateString || (typeof dateString === 'string' && dateString.trim() === '')) {
      return new Date();
    }
    const parsed = new Date(dateString);
    // Check if the date is valid (not NaN) and not before year 2000
    // (prevents epoch-era dates like Dec 31 1969 from appearing)
    if (isNaN(parsed.getTime()) || parsed.getFullYear() < 2000) {
      return new Date();
    }
    return parsed;
  };
  
  // Show date picker for a specific field
  const showDatePickerFor = (field: 'issueDate' | 'expiryDate') => {
    setCurrentDateField(field);
    // Initialize tempDate with the current field value or today's date
    setTempDate(getValidDate(formData[field]));
    setDatePickerKey(prev => prev + 1);
    setIsPickerMounted(true);
    setShowDatePicker(true);
  };
  
  // Render license form
  const renderLicenseForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      {/* Close button header - matching ProfileScreen pattern */}
      <View style={styles.formHeader}>
        <TouchableOpacity
          style={styles.formCloseButton}
          onPress={handleCloseEditForm}
          activeOpacity={0.7}
        >
          <Feather name="x" size={24} color={theme.colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.formHeaderTitle}>Edit License</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>License Holder</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name *</Text>
            <View style={styles.dateInputRow}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  placeholder="First"
                  placeholderTextColor={theme.colors.textTertiary}
                  textContentType="givenName"
                  autoComplete="given-name"
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  placeholder="Last"
                  placeholderTextColor={theme.colors.textTertiary}
                  textContentType="familyName"
                  autoComplete="family-name"
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>License Information</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabel, { marginBottom: 0 }]}>License Number *</Text>
              <TouchableOpacity
                onPress={() => setShowLicenseNumberInfoModal(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="info" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
              placeholder="Enter license number"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="characters"
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>License Type *</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between' }]}
              onPress={() => setShowLicenseTypeModal(true)}
            >
              <Text style={formData.licenseType ? styles.inputText : styles.inputPlaceholder}>
                {formData.licenseType || "Select license type"}
              </Text>
              <Feather name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <LicenseTypePicker
              visible={showLicenseTypeModal}
              onClose={() => setShowLicenseTypeModal(false)}
              onSelect={(type) => setFormData({ ...formData, licenseType: type })}
              selectedValue={formData.licenseType}
              options={licenseTypes}
            />
          </View>
          
          <View style={styles.dateInputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.inputLabel}>Issue Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => showDatePickerFor('issueDate')}
              >
                <Text style={formData.issueDate ? styles.inputText : styles.inputPlaceholder}>
                  {formData.issueDate ? formatDate(formData.issueDate) : "Select date"}
                </Text>
                <Feather name="calendar" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Expiry Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => showDatePickerFor('expiryDate')}
              >
                <Text style={formData.expiryDate ? styles.inputText : styles.inputPlaceholder}>
                  {formData.expiryDate ? formatDate(formData.expiryDate) : "Select date"}
                </Text>
                <Feather name="calendar" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <View style={styles.formButtonRow}>
          <TouchableOpacity
            style={[styles.formButton, styles.formCancelButton]}
            onPress={handleCloseEditForm}
          >
            <Text style={styles.formCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.formButton, styles.formSaveButton]}
            onPress={saveLicense}
          >
            <Text style={styles.formSaveButtonText}>Save License</Text>
          </TouchableOpacity>
        </View>
        
        {/* License Number info modal */}
        <WrcIdInfoModal
          visible={showLicenseNumberInfoModal}
          onClose={() => setShowLicenseNumberInfoModal(false)}
        />

        {/* Date Picker Modal - matching ReportFormScreen and ProfileScreen pattern */}
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
                <Text style={styles.dateModalTitle}>
                  Select {currentDateField === 'issueDate' ? 'Issue Date' : 'Expiry Date'}
                </Text>
                <TouchableOpacity onPress={closeDatePicker}>
                  <Feather name="x" size={24} color={theme.colors.darkGray} />
                </TouchableOpacity>
              </View>
              {isPickerMounted && (
                <DateTimePicker
                  key={`license-${currentDateField}-picker-${datePickerKey}`}
                  value={tempDate instanceof Date && !isNaN(tempDate.getTime()) && tempDate.getFullYear() >= 2000 ? tempDate : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date(2000, 0, 1)}
                  maximumDate={new Date(2099, 11, 31)}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
  
  // Render license display card
  const renderLicenseCard = () => (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Removed standalone header actions */}
      
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.licenseCard}
        >
          <View style={styles.licenseCardHeader}>
            <NCFlagIcon width={60} height={40} style={{ marginRight: spacing.md }} />
            <View style={styles.licenseHeaderText}>
              <Text style={styles.licenseState}>North Carolina</Text>
              <Text style={styles.licenseTitle}>Fishing License</Text>
            </View>
            <TouchableOpacity
              style={styles.licenseInfoButton}
              onPress={() => setInfoModalVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="info" size={20} color={theme.colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.licenseContent}>
            <View style={styles.licenseSection}>
              <Text style={styles.licenseSectionTitle}>License Holder</Text>
              <View style={styles.licenseRow}>
                <Text style={styles.licenseLabel}>Name:</Text>
                <Text style={styles.licenseValue}>
                  {[license?.firstName, license?.lastName].filter(Boolean).join(" ") || "Not specified"}
                </Text>
              </View>
            </View>

            <View style={styles.licenseSection}>
              <Text style={styles.licenseSectionTitle}>License Information</Text>
              <View style={styles.licenseRow}>
                <Text style={styles.licenseLabel}>License #:</Text>
                <Text style={styles.licenseValue}>{license?.licenseNumber}</Text>
              </View>
              <View style={styles.licenseRow}>
                <Text style={styles.licenseLabel}>Type:</Text>
                <Text style={styles.licenseValue} numberOfLines={2}>{license?.licenseType}</Text>
              </View>
              <View style={styles.licenseRow}>
                <Text style={styles.licenseLabel}>Issue Date:</Text>
                <Text style={styles.licenseValue}>{license?.issueDate ? formatDate(license.issueDate) : "Not specified"}</Text>
              </View>
              <View style={styles.licenseRow}>
                <Text style={styles.licenseLabel}>Expiry Date:</Text>
                <Text style={styles.licenseValue}>{license?.expiryDate ? formatDate(license.expiryDate) : "Not specified"}</Text>
              </View>
            </View>

            {/* Footer: disclaimer left, edit pencil right */}
            <View style={styles.licenseFooter}>
              <Text style={styles.licenseFooterText}>
                This does not replace licensing from NC WRC
              </Text>
              <TouchableOpacity
                style={styles.licenseEditButton}
                onPress={() => toggleEditMode(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Edit license"
                testID="license-edit-button"
              >
                <Feather name="edit-2" size={20} color={theme.colors.textOnPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* License Information section — matches zero-state layout */}
      <Text style={styles.infoSectionHeader}>License Information</Text>

      <ExpandableSection title="License Requirements">
        <View style={styles.expandableBulletList}>
          {[
            'Required for anglers 16–70 years old',
            'Anglers 70 and older are exempt from the fishing license requirement in North Carolina.',
            'Different licenses for inland and coastal waters',
            'Available as daily, 10-day, annual, or lifetime',
            'Saltwater recreational fishing requires a Coastal Recreational Fishing License (CRFL)',
          ].map((item, i) => (
            <View key={i} style={styles.expandableBulletRow}>
              <Text style={styles.expandableBullet}>•</Text>
              <Text style={styles.expandableBulletText}>{item}</Text>
            </View>
          ))}
        </View>
      </ExpandableSection>

      <ExpandableSection title="Where to Get a License">
        <View style={styles.expandableBulletList}>
          <View style={styles.expandableBulletRow}>
            <Text style={styles.expandableBullet}>•</Text>
            <Text style={styles.expandableBulletText}>
              {'Online at '}
              <Text
                style={styles.expandableLinkText}
                onPress={() => safeOpenURL('https://www.ncwildlife.gov/fishing')}
              >
                ncwildlife.gov
              </Text>
            </Text>
          </View>
          <View style={styles.expandableBulletRow}>
            <Text style={styles.expandableBullet}>•</Text>
            <Text style={styles.expandableBulletText}>
              {'By phone at '}
              <Text
                style={styles.expandableLinkText}
                onPress={() => safeOpenURL('tel:8882486834')}
              >
                888-248-6834
              </Text>
            </Text>
          </View>
          <View style={styles.expandableBulletRow}>
            <Text style={styles.expandableBullet}>•</Text>
            <Text style={styles.expandableBulletText}>From licensed agents — sporting goods stores, bait shops, and wildlife service offices</Text>
          </View>
          <View style={styles.expandableBulletRow}>
            <Text style={styles.expandableBullet}>•</Text>
            <Text style={styles.expandableBulletText}>License is valid from date of purchase through the stated expiration date</Text>
          </View>
        </View>
      </ExpandableSection>

      <ExpandableSection title="Don't Know Your License Number?">
        <View style={{ paddingTop: spacing.sm }}>
          <Text style={[styles.expandableBulletText, { marginBottom: spacing.md }]}>
            You can look up your WRC ID or Customer ID online if you've previously purchased a license.
          </Text>
          <TouchableOpacity
            style={styles.lookupButton}
            onPress={() => safeOpenURL('https://license.gooutdoorsnorthcarolina.com/Licensing/CustomerLookup.aspx')}
            activeOpacity={0.8}
          >
            <Feather name="external-link" size={16} color={theme.colors.textOnPrimary} />
            <Text style={styles.lookupButtonText}>Look Up My License</Text>
          </TouchableOpacity>
        </View>
      </ExpandableSection>

      <TouchableOpacity
        style={styles.externalLinkRow}
        onPress={() => safeOpenURL('https://www.ncwildlife.gov/fishing')}
        activeOpacity={0.7}
      >
        <Text style={styles.externalLinkText}>NC Wildlife License Information</Text>
        <Feather name="external-link" size={16} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />

      {/* Info Modal */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
              <Text style={styles.modalTitle}>About Your Fishing License</Text>
              
              <Text style={styles.modalText}>
                This screen allows you to store your North Carolina fishing license information
                for easy reference. 
              </Text>
              
              <Text style={styles.modalText}>
                The license information stored here is for your convenience only and
                doesn't replace your official fishing license. Please ensure you have your
                official license when fishing.
              </Text>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setInfoModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
  
  // Render empty state for no license
  const renderEmptyState = () => (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Zero-state license card — grayed out to signal "not added yet" */}
      <View style={styles.emptyLicenseCard}>
        {/* Header: flag + license type title */}
        <View style={styles.emptyCardHeader}>
          <View style={styles.emptyFlagWrapper}>
            <NCFlagIcon width={60} height={40} />
            <View style={styles.emptyFlagOverlay} />
          </View>
          <View style={styles.emptyCardTitleBlock}>
            <Text style={styles.emptyCardTitleLabel}>NC COASTAL RECREATIONAL</Text>
            <Text style={styles.emptyCardTitleMain}>FISHING LICENSE</Text>
          </View>
        </View>

        {/* Placeholder lines for name / license number */}
        <View style={styles.emptyPlaceholders}>
          <View style={[styles.placeholderLine, { width: '60%', opacity: 0.3 }]} />
          <View style={[styles.placeholderLine, { width: '40%', opacity: 0.2, marginTop: 6 }]} />
        </View>

        {/* Footer: field labels + Add License pill */}
        <View style={styles.emptyCardFooter}>
          <View>
            <Text style={styles.emptyCardFieldLabel}>EXPIRES</Text>
            <View style={[styles.placeholderLine, { width: 60, opacity: 0.2 }]} />
          </View>
          <View>
            <Text style={styles.emptyCardFieldLabel}>ISSUED</Text>
            <View style={[styles.placeholderLine, { width: 60, opacity: 0.2 }]} />
          </View>
          <TouchableOpacity
            style={styles.addLicensePill}
            onPress={() => toggleEditMode(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={16} color={theme.colors.textOnPrimary} />
            <Text style={styles.addLicensePillText}>Add License</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section header */}
      <Text style={styles.infoSectionHeader}>License Information</Text>

      {/* Expandable: Requirements */}
      <ExpandableSection title="License Requirements">
        <View style={styles.expandableBulletList}>
          {[
            'Required for anglers 16–70 years old',
            'Anglers 70 and older are exempt from the fishing license requirement in North Carolina.',
            'Different licenses for inland and coastal waters',
            'Available as daily, 10-day, annual, or lifetime',
            'Saltwater recreational fishing requires a Coastal Recreational Fishing License (CRFL)',
          ].map((item, i) => (
            <View key={i} style={styles.expandableBulletRow}>
              <Text style={styles.expandableBullet}>•</Text>
              <Text style={styles.expandableBulletText}>{item}</Text>
            </View>
          ))}
        </View>
      </ExpandableSection>

      {/* Expandable: Where to Get a License */}
      <ExpandableSection title="Where to Get a License">
        <View style={styles.expandableBulletList}>
          <View style={styles.expandableBulletRow}>
            <Text style={styles.expandableBullet}>•</Text>
            <Text style={styles.expandableBulletText}>
              {'Online at '}
              <Text
                style={styles.expandableLinkText}
                onPress={() => safeOpenURL('https://www.ncwildlife.gov/fishing')}
              >
                ncwildlife.gov
              </Text>
            </Text>
          </View>
          <View style={styles.expandableBulletRow}>
            <Text style={styles.expandableBullet}>•</Text>
            <Text style={styles.expandableBulletText}>
              {'By phone at '}
              <Text
                style={styles.expandableLinkText}
                onPress={() => safeOpenURL('tel:8882486834')}
              >
                888-248-6834
              </Text>
            </Text>
          </View>
          <View style={styles.expandableBulletRow}>
            <Text style={styles.expandableBullet}>•</Text>
            <Text style={styles.expandableBulletText}>From licensed agents — sporting goods stores, bait shops, and wildlife service offices</Text>
          </View>
          <View style={styles.expandableBulletRow}>
            <Text style={styles.expandableBullet}>•</Text>
            <Text style={styles.expandableBulletText}>License is valid from date of purchase through the stated expiration date</Text>
          </View>
        </View>
      </ExpandableSection>

      {/* Expandable: Don't Know Your License Number? */}
      <ExpandableSection title="Don't Know Your License Number?">
        <View style={{ paddingTop: spacing.sm }}>
          <Text style={[styles.expandableBulletText, { marginBottom: spacing.md }]}>
            You can look up your WRC ID or Customer ID online if you've previously purchased a license.
          </Text>
          <TouchableOpacity
            style={styles.lookupButton}
            onPress={() => safeOpenURL('https://license.gooutdoorsnorthcarolina.com/Licensing/CustomerLookup.aspx')}
            activeOpacity={0.8}
          >
            <Feather name="external-link" size={16} color={theme.colors.textOnPrimary} />
            <Text style={styles.lookupButtonText}>Look Up My License</Text>
          </TouchableOpacity>
        </View>
      </ExpandableSection>

      {/* External link — NC Wildlife */}
      <TouchableOpacity
        style={styles.externalLinkRow}
        onPress={() => safeOpenURL('https://www.ncwildlife.gov/fishing')}
        activeOpacity={0.7}
      >
        <Text style={styles.externalLinkText}>NC Wildlife License Information</Text>
        <Feather name="external-link" size={16} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
  
  if (loading) {
    return (
      <View style={flStyles.screenContainer}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primaryDark} translucent />
        <View style={flStyles.fixedHeader}>
          <View style={flStyles.headerRow}>
            <TouchableOpacity
              style={flStyles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={24} color={theme.colors.textOnPrimary} />
            </TouchableOpacity>
            <View style={flStyles.headerTextContainer}>
              <Text style={flStyles.headerTitle}>{SCREEN_LABELS.fishingLicense.title}</Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={flStyles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primaryDark} translucent />

      {/* Slack-style frosted blur over the OS toolbar that fades in on scroll. */}
      <StatusBarScrollBlur scrollY={scrollY} />

      {/* Fixed Header — sits behind scrolling content */}
      <View style={flStyles.fixedHeader}>
        <View style={flStyles.headerRow}>
          <TouchableOpacity
            testID="back-button"
            style={flStyles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={24} color={theme.colors.textOnPrimary} />
          </TouchableOpacity>
          <View style={flStyles.headerTextContainer}>
            <Text style={flStyles.headerTitle}>{SCREEN_LABELS.fishingLicense.title}</Text>
            <Text style={flStyles.headerSubtitle}>Manage your fishing license</Text>
          </View>
        </View>
      </View>

      {/* Floating back button — slides in from left on scroll */}
      <FloatingBackButton
        opacity={floatingOpacity}
        translateX={floatingTranslateXLeft}
        onPress={() => navigation.goBack()}
      />

      {/* Scrollable content — slides over the header */}
      <Animated.ScrollView
        style={flStyles.scrollView}
        contentContainerStyle={flStyles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Transparent spacer — lets fixed header show through */}
        <View style={flStyles.headerSpacer}>
          <View style={flStyles.spacerButtonsRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ width: 40, height: 40 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={{ width: 40, height: 40 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content card — the light card that slides over */}
        <View style={flStyles.contentCard}>
          {license ? renderLicenseCard() : renderEmptyState()}
        </View>
      </Animated.ScrollView>

      {/* Overlay the form when editing */}
      {isEditing && (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, transform: [{ translateY: slideAnim }], zIndex: 10 }]}>
          {renderLicenseForm()}
        </Animated.View>
      )}

      {/* Unsaved changes confirmation modal */}
      <UnsavedChangesModal
        visible={showUnsavedModal}
        onKeepEditing={() => setShowUnsavedModal(false)}
        onDiscard={() => {
          setShowUnsavedModal(false);
          toggleEditMode(false);
          if (pendingNavigationAction.current) {
            hasConfirmedDiscard.current = true;
            pendingNavigationAction.current();
            pendingNavigationAction.current = null;
          }
        }}
      />
    </View>
  );
};

// Additional styles for profile link
const createProfileStyles = (theme: Theme) => StyleSheet.create({
  profileLinkContainer: {
    marginTop: spacing.md,
  },
  profileLinkButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  profileLinkText: {
    color: theme.colors.textOnPrimary,
    fontWeight: "600" as const,
    marginLeft: spacing.xs,
  },
});

// Styles for the floating header / scroll-over pattern
const windowHeight = Dimensions.get('window').height;

const createFlStyles = (theme: Theme) => StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.primaryDark,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.primaryDark,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textOnPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textOnPrimary,
    opacity: 0.85,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  headerSpacer: {
    height: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 100 : 130,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingHorizontal: 20,
  },
  spacerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 24,
    marginBottom: spacing.lg,
    minHeight: windowHeight - 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default FishingLicenseScreen;