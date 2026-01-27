// screens/FishingLicenseScreen.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Linking,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList, FishingLicense } from "../types";
import { colors, spacing, borderRadius } from "../styles/common";
import styles from "../styles/fishingLicenseScreenStyles";
import LicenseTypePicker from "../components/LicenseTypePicker";
import ScreenLayout from "../components/ScreenLayout";
import { NCFlagIcon } from "../components/NCFlagIcon";

type FishingLicenseScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "LicenseDetails"
>;

interface FishingLicenseScreenProps {
  navigation: FishingLicenseScreenNavigationProp;
}

const FishingLicenseScreen: React.FC<FishingLicenseScreenProps> = ({ navigation }) => {
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

  // Animation for transitioning between view/edit modes
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;

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
  useEffect(() => {
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
    
    loadLicense();
  }, []);
  
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
  
  // Generate sample license
  const generateSampleLicense = async () => {
    const sampleLicense: FishingLicense = {
      id: "123456",
      firstName: "John",
      lastName: "Smith",
      licenseNumber: "NC-789012345",
      licenseType: "Annual Coastal Recreational Fishing License",
      issueDate: "2024-01-01",
      expiryDate: "2024-12-31",
    };

    setFormData(sampleLicense);
    setLicense(sampleLicense);
    setIsEditing(false);

    // Also save to AsyncStorage and update profile
    try {
      await AsyncStorage.setItem("fishingLicense", JSON.stringify(sampleLicense));

      // Update profile with name and license info
      const existingProfile = await AsyncStorage.getItem("userProfile");
      const profile = existingProfile ? JSON.parse(existingProfile) : {};
      const updatedProfile = {
        ...profile,
        firstName: sampleLicense.firstName,
        lastName: sampleLicense.lastName,
        hasLicense: true,
        wrcId: sampleLicense.licenseNumber,
      };
      await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
    } catch (error) {
      console.error("Error saving sample license:", error);
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
  
  // Handle date change from date picker (for spinner, this fires on each scroll)
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  // Confirm date selection and close picker
  const confirmDateSelection = () => {
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
  const getValidDate = (dateString: string | undefined): Date => {
    if (!dateString || dateString.trim() === '') {
      return new Date();
    }
    const parsed = new Date(dateString);
    // Check if the date is valid (not NaN)
    if (isNaN(parsed.getTime())) {
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
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Close button header - matching ProfileScreen pattern */}
      <View style={styles.formHeader}>
        <TouchableOpacity
          style={styles.formCloseButton}
          onPress={() => toggleEditMode(false)}
          activeOpacity={0.7}
        >
          <Feather name="x" size={24} color={colors.white} />
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
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  placeholder="Last"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>License Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>License Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
              placeholder="Enter license number"
              placeholderTextColor={colors.textTertiary}
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
              <Feather name="chevron-down" size={16} color={colors.textSecondary} />
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
                <Feather name="calendar" size={16} color={colors.textSecondary} />
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
                <Feather name="calendar" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Profile Information</Text>
          <Text style={styles.infoText}>
            Personal information has been moved to the Profile section. You can access your profile from the menu.
          </Text>
          <View style={profileStyles.profileLinkContainer}>
            <TouchableOpacity 
              style={profileStyles.profileLinkButton}
              onPress={() => {
                navigation.navigate("Profile");
              }}
            >
              <Feather name="user" size={16} color={colors.white} />
              <Text style={profileStyles.profileLinkText}>Go to Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.formButtonRow}>
          <TouchableOpacity
            style={[styles.formButton, styles.formCancelButton]}
            onPress={() => toggleEditMode(false)}
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
                  <Feather name="x" size={24} color={colors.darkGray} />
                </TouchableOpacity>
              </View>
              {isPickerMounted && (
                <DateTimePicker
                  key={`license-${currentDateField}-picker-${datePickerKey}`}
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
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
          colors={[colors.primary, colors.primaryDark]}
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
              <Feather name="info" size={20} color={colors.white} />
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
            
            <View style={styles.licenseFooter}>
              <Text style={styles.licenseFooterText}>
                North Carolina Wildlife Resources Commission
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleEditMode(true)}
        >
          <Feather name="edit-2" size={18} color={colors.white} />
          <Text style={styles.actionButtonText}>Edit License</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => {
            Linking.openURL("https://www.ncwildlife.org/");
          }}
        >
          <Feather name="external-link" size={18} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>NC Wildlife Website</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Fishing License Information</Text>
        <Text style={styles.infoText}>
          Most anglers in North Carolina between the ages of 16 and 70 need a
          fishing license to fish in public waters. This includes both freshwater
          and saltwater fishing.
        </Text>
        
        <Text style={styles.infoText}>
          Your license should be kept with you while fishing. Digital versions of
          fishing licenses are acceptable in North Carolina.
        </Text>
        
        <Text style={styles.infoSubtitle}>License Requirements</Text>
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Must be renewed annually (unless lifetime license)
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Separate licenses for inland and coastal waters
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Special regulations apply for trout waters
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Some public fishing areas don't require a license
            </Text>
          </View>
        </View>
      </View>
      
      {/* Info Modal */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
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
              
              <Text style={styles.modalSectionTitle}>Where to Get a License</Text>
              <Text style={styles.modalText}>
                You can purchase a North Carolina fishing license:
              </Text>
              
              <View style={styles.modalBulletList}>
                <View style={styles.modalBulletItem}>
                  <View style={styles.modalBullet} />
                  <Text style={styles.modalBulletText}>
                    Online at ncwildlife.org
                  </Text>
                </View>
                <View style={styles.modalBulletItem}>
                  <View style={styles.modalBullet} />
                  <Text style={styles.modalBulletText}>
                    By phone at 888-248-6834
                  </Text>
                </View>
                <View style={styles.modalBulletItem}>
                  <View style={styles.modalBullet} />
                  <Text style={styles.modalBulletText}>
                    From a wildlife service agent
                  </Text>
                </View>
                <View style={styles.modalBulletItem}>
                  <View style={styles.modalBullet} />
                  <Text style={styles.modalBulletText}>
                    At many sporting goods stores
                  </Text>
                </View>
              </View>
              
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
      
      {/* Info Modal - License details modal remains but license type modal is replaced by the component */}
    </ScrollView>
  );
  
  // Render empty state for no license
  const renderEmptyState = () => (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, styles.emptyStateContainer]}
      showsVerticalScrollIndicator={false}
    >
      <NCFlagIcon width={120} height={80} style={{ marginBottom: spacing.lg }} />
      
      <Text style={styles.emptyStateTitle}>No Fishing License Added</Text>
      <Text style={styles.emptyStateText}>
        Add your fishing license information for easy access when you're out on the water.
      </Text>
      
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => toggleEditMode(true)}
      >
        <Feather name="plus" size={18} color={colors.white} />
        <Text style={styles.actionButtonText}>Add My License</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, styles.secondaryButton, { marginTop: spacing.md }]}
        onPress={generateSampleLicense}
      >
        <Feather name="file-text" size={18} color={colors.primary} />
        <Text style={styles.secondaryButtonText}>Use Sample License</Text>
      </TouchableOpacity>
      
      <View style={styles.emptyStateInfoContainer}>
        <Text style={styles.infoSubtitle}>Fishing License Requirements</Text>
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Required for anglers 16-70 years old
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Different licenses for inland and coastal waters
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Available as daily, 10-day, annual or lifetime
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Can be purchased online or from a wildlife agent
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.outlineButton]}
          onPress={() => {
            Linking.openURL("https://www.ncwildlife.org/Licensing/Fishing-Licenses");
          }}
        >
          <Text style={styles.outlineButtonText}>Purchase a License Online</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
  
  if (loading) {
    return (
      <ScreenLayout
        navigation={navigation}
        title="My Fishing License"
        noScroll
        loading={loading}
        loadingComponent={<ActivityIndicator size="large" color={colors.primary} />}
      />
    );
  }

  return (
    <View style={styles.safeArea}>
      {/* Always render the license view underneath */}
      <ScreenLayout
        navigation={navigation}
        title="My Fishing License"
        subtitle="Manage your fishing license"
        noScroll
      >
        {license ? renderLicenseCard() : renderEmptyState()}
      </ScreenLayout>

      {/* Overlay the form when editing */}
      {isEditing && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: slideAnim }] }]}>
          {renderLicenseForm()}
        </Animated.View>
      )}
    </View>
  );
};

// Additional styles for profile link
const profileStyles = StyleSheet.create({
  profileLinkContainer: {
    marginTop: spacing.md,
  },
  profileLinkButton: {
    backgroundColor: colors.primary,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  profileLinkText: {
    color: colors.white,
    fontWeight: "600" as const,
    marginLeft: spacing.xs,
  },
});

export default FishingLicenseScreen;