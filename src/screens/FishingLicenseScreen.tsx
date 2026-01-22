// screens/FishingLicenseScreen.tsx

import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Linking,
  StyleSheet,
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
  const [currentDateField, setCurrentDateField] = useState<'issueDate' | 'expiryDate'>('issueDate');
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
      setIsEditing(false);
      Alert.alert("Success", "Your fishing license information has been saved.");
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
  
  // Handle date change from date picker
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (selectedDate && currentDateField) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFormData({
        ...formData,
        [currentDateField]: formattedDate
      });
    }
  };
  
  // Show date picker for a specific field
  const showDatePickerFor = (field: 'issueDate' | 'expiryDate') => {
    setCurrentDateField(field);
    setShowDatePicker(true);
  };
  
  // Render license form
  const renderLicenseForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
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
            onPress={() => {
              setFormData(license || {});
              setIsEditing(false);
            }}
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
        
        {/* Date picker for iOS */}
        {Platform.OS === 'ios' && showDatePicker && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
          >
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>
                    Select {currentDateField === 'issueDate' ? 'Issue Date' : 'Expiry Date'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={formData[currentDateField] ? new Date(formData[currentDateField] as string) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  style={styles.datePicker}
                />
              </View>
            </View>
          </Modal>
        )}
        
        {/* For Android, DateTimePicker is rendered directly */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={formData[currentDateField] ? new Date(formData[currentDateField] as string) : new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
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
            <View style={styles.licenseLogoContainer}>
              <Image
                source={require('../assets/fish-logo.png')}
                style={styles.licenseLogo}
                resizeMode="contain"
              />
            </View>
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
          onPress={() => setIsEditing(true)}
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
      <Image
        source={require("../assets/fish-logo.png")}
        style={styles.emptyStateImage}
        resizeMode="contain"
      />
      
      <Text style={styles.emptyStateTitle}>No Fishing License Added</Text>
      <Text style={styles.emptyStateText}>
        Add your fishing license information for easy access when you're out on the water.
      </Text>
      
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setIsEditing(true)}
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
    <ScreenLayout
      navigation={navigation}
      title="My Fishing License"
      subtitle="Manage your fishing license"
      noScroll
    >
      {isEditing ? (
        renderLicenseForm()
      ) : license ? (
        renderLicenseCard()
      ) : (
        renderEmptyState()
      )}
    </ScreenLayout>
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