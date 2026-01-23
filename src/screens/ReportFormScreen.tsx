// screens/ReportFormScreen.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, FishReportData, UserProfile, FishingLicense } from "../types";
import styles from "../styles/reportFormScreenStyles";
import { colors } from "../styles/common";

// DMF constants
import { AREA_LABELS, getAreaCodeFromLabel } from "../constants/areaOptions";
import { NON_HOOK_GEAR_LABELS, getGearCodeFromLabel } from "../constants/gearOptions";
import { isTestMode } from "../config/appConfig";

// Rewards context
import { useRewards } from "../contexts/RewardsContext";

type ReportFormScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReportForm"
>;

interface ReportFormScreenProps {
  navigation: ReportFormScreenNavigationProp;
}

// Define types for individual fish entry
interface FishEntry {
  species: string;
  count: number;
  lengths: string[]; // Array of lengths, one per fish
  tagNumber?: string;
}

// Reporting type options
type ReportingType = "myself" | "myself_and_minors" | null;

// Define types for our form fields
interface FormState {
  // Reporting type
  reportingType: ReportingType;
  totalPeopleCount: number;
  // Fish info
  species: string;
  count: number;
  lengths: string[]; // Array of lengths for each fish
  tagNumber: string;
  // Trip details
  waterbody: string;
  date: Date;
  // DMF gear/method fields
  usedHookAndLine: boolean;
  gearType: string; // Only used when usedHookAndLine is false
  // DMF confirmation preferences
  wantTextConfirmation: boolean;
  wantEmailConfirmation: boolean;
  // Identity (loaded from profile)
  hasLicense: boolean;
  wrcId: string;
  zipCode: string;
  // Angler info
  angler: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

interface PickerData {
  species: string[];
  waterbody: string[];
  gearType: string[];
  [key: string]: string[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const ReportFormScreen: React.FC<ReportFormScreenProps> = ({ navigation }) => {
  // State for multiple fish entries
  const [fishEntries, setFishEntries] = useState<FishEntry[]>([]);
  const [currentFishIndex, setCurrentFishIndex] = useState<number | null>(null);

  // State for showing optional fish details
  const [showOptionalDetails, setShowOptionalDetails] = useState<boolean>(false);

  // Animation for modal drawer
  const drawerAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Refs for scrolling
  const scrollViewRef = useRef<ScrollView>(null);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastTitle, setToastTitle] = useState<string>("");
  const [toastSubtitle, setToastSubtitle] = useState<string>("");
  const toastAnim = useRef(new Animated.Value(100)).current;

  // Show toast notification
  const showToast = (title: string, subtitle: string): void => {
    setToastTitle(title);
    setToastSubtitle(subtitle);
    setToastVisible(true);
    toastAnim.setValue(100);

    Animated.spring(toastAnim, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();

    // Hide after 5 seconds
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 5000);
  };

  // Initial form state with types
  const [formData, setFormData] = useState<FormState>({
    reportingType: null,
    totalPeopleCount: 1,
    species: "",
    count: 1,
    lengths: [""], // Start with one empty length field
    tagNumber: "",
    waterbody: "",
    date: new Date(),
    // DMF gear/method - default to hook and line
    usedHookAndLine: true,
    gearType: "",
    // DMF confirmation preferences
    wantTextConfirmation: false,
    wantEmailConfirmation: false,
    // Identity (will be loaded from profile)
    hasLicense: true,
    wrcId: "",
    zipCode: "",
    angler: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    const loadUserData = async (): Promise<void> => {
      try {
        // Load profile, license, and primary area data
        const [profileData, licenseData, primaryAreaData] = await Promise.all([
          AsyncStorage.getItem("userProfile"),
          AsyncStorage.getItem("fishingLicense"),
          AsyncStorage.getItem("primaryHarvestArea"),
        ]);

        const profile: UserProfile | null = profileData ? JSON.parse(profileData) : null;
        const license: FishingLicense | null = licenseData ? JSON.parse(licenseData) : null;
        const primaryArea = primaryAreaData || null;

        // Track if we have a saved primary area
        if (primaryArea) {
          setHasSavedPrimaryArea(true);
          setSaveAsPrimaryArea(true);
        }

        // Determine WRC ID: prefer profile, fall back to license number
        const wrcIdFromProfile = profile?.wrcId || "";
        const wrcIdFromLicense = license?.licenseNumber || "";
        const effectiveWrcId = wrcIdFromProfile || wrcIdFromLicense;

        // Track if the WRC ID came from the license (so we know it's already saved there)
        if (wrcIdFromLicense && !wrcIdFromProfile) {
          setHasSavedLicenseNumber(true);
          setSaveLicenseNumber(true);
        } else if (wrcIdFromProfile) {
          // If it's in the profile, check if it matches the license
          if (license?.licenseNumber === wrcIdFromProfile) {
            setHasSavedLicenseNumber(true);
            setSaveLicenseNumber(true);
          }
        }

        // Only update if we have data to populate
        if (profile || license || primaryArea) {
          // Track initial loaded values to distinguish from user input
          setInitialLoadedValues({
            waterbody: primaryArea || "",
            firstName: profile?.firstName || license?.firstName || "",
            lastName: profile?.lastName || license?.lastName || "",
            email: profile?.email || "",
            phone: profile?.phone || "",
            wrcId: effectiveWrcId,
            zipCode: profile?.zipCode || "",
          });

          setFormData((prevData) => {
            return {
              ...prevData,
              waterbody: primaryArea || prevData.waterbody,
              // Load DMF identity fields from profile or license
              hasLicense: profile?.hasLicense ?? true,
              wrcId: effectiveWrcId || prevData.wrcId,
              zipCode: profile?.zipCode || prevData.zipCode,
              angler: {
                ...prevData.angler,
                firstName: profile?.firstName || license?.firstName || prevData.angler.firstName,
                lastName: profile?.lastName || license?.lastName || prevData.angler.lastName,
                email: profile?.email || prevData.angler.email,
                phone: profile?.phone || prevData.angler.phone,
              },
            };
          });

          // Build info message based on what was loaded
          const loadedItems: string[] = [];
          if (profile?.firstName || profile?.lastName || license?.firstName || license?.lastName) {
            loadedItems.push("name");
          }
          if (profile?.email) loadedItems.push("email");
          if (profile?.phone) loadedItems.push("phone");
          if (effectiveWrcId) loadedItems.push("WRC ID");

          if (loadedItems.length > 0) {
            showToast(
              "Profile Loaded",
              `Your ${loadedItems.join(", ")} ${loadedItems.length === 1 ? "has" : "have"} been added to the report.`
            );
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        // Silent failure - we don't need to alert the user if data can't be loaded
      }
    };

    loadUserData();
  }, []);

  // Save or clear primary area when toggle changes
  const handlePrimaryAreaToggle = async (value: boolean): Promise<void> => {
    setSaveAsPrimaryArea(value);
    try {
      if (value && formData.waterbody) {
        await AsyncStorage.setItem("primaryHarvestArea", formData.waterbody);
        setHasSavedPrimaryArea(true);
      } else {
        await AsyncStorage.removeItem("primaryHarvestArea");
        setHasSavedPrimaryArea(false);
      }
    } catch (error) {
      console.error("Error saving primary area:", error);
    }
  };


  // Save angler info to profile when toggle changes
  const handleSaveAnglerInfo = async (value: boolean): Promise<void> => {
    setSaveAnglerInfo(value);
    if (value) {
      try {
        // Get existing profile data
        const existingData = await AsyncStorage.getItem("userProfile");
        const profile = existingData ? JSON.parse(existingData) : {};

        // Update profile with angler info
        const updatedProfile = {
          ...profile,
          firstName: formData.angler.firstName || profile.firstName,
          lastName: formData.angler.lastName || profile.lastName,
          email: formData.angler.email || profile.email,
          phone: formData.angler.phone || profile.phone,
        };

        await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
      } catch (error) {
        console.error("Error saving angler info:", error);
      }
    }
  };

  // Save WRC ID to license screen when toggle changes
  const handleSaveLicenseNumber = async (value: boolean): Promise<void> => {
    setSaveLicenseNumber(value);
    if (value && formData.wrcId) {
      try {
        // Get existing license data
        const existingData = await AsyncStorage.getItem("fishingLicense");
        const license: FishingLicense = existingData ? JSON.parse(existingData) : {};

        // Update license with WRC ID as license number
        const updatedLicense: FishingLicense = {
          ...license,
          licenseNumber: formData.wrcId,
          // Also update name if we have it and license doesn't
          firstName: license.firstName || formData.angler.firstName,
          lastName: license.lastName || formData.angler.lastName,
        };

        await AsyncStorage.setItem("fishingLicense", JSON.stringify(updatedLicense));
        setHasSavedLicenseNumber(true);

        // Also save to profile
        const profileData = await AsyncStorage.getItem("userProfile");
        const profile = profileData ? JSON.parse(profileData) : {};
        const updatedProfile = {
          ...profile,
          wrcId: formData.wrcId,
          hasLicense: true,
        };
        await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
      } catch (error) {
        console.error("Error saving license number:", error);
      }
    }
  };

  // State for primary area of harvest
  const [saveAsPrimaryArea, setSaveAsPrimaryArea] = useState<boolean>(false);
  const [hasSavedPrimaryArea, setHasSavedPrimaryArea] = useState<boolean>(false);

  // State for saving angler info to profile
  const [saveAnglerInfo, setSaveAnglerInfo] = useState<boolean>(false);

  // State for saving WRC ID to license screen
  const [saveLicenseNumber, setSaveLicenseNumber] = useState<boolean>(false);
  const [hasSavedLicenseNumber, setHasSavedLicenseNumber] = useState<boolean>(false);

  // Track initial values loaded from profile to distinguish from user input
  const [initialLoadedValues, setInitialLoadedValues] = useState<{
    waterbody: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    wrcId: string;
    zipCode: string;
  }>({
    waterbody: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    wrcId: "",
    zipCode: "",
  });

  // State for rewards entry (local UI state)
  const [enterRaffle, setEnterRaffle] = useState<boolean>(false);
  const [showRaffleModal, setShowRaffleModal] = useState<boolean>(false);

  // Get rewards data from centralized context
  const {
    currentDrawing,
    config: rewardsConfig,
    calculated: rewardsCalculated,
    hasEnteredCurrentRaffle,
    enterDrawing,
  } = useRewards();

  // State for photo capture (required for rewards entry)
  const [catchPhoto, setCatchPhoto] = useState<string | null>(null);

  // State for inline validation errors
  const [validationErrors, setValidationErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    photo?: string;
    hasLicense?: string;
    wrcId?: string;
    zipCode?: string;
  }>({});

  // State for abandonment modal
  const [showAbandonModal, setShowAbandonModal] = useState<boolean>(false);

  // Derived rewards info from context (with fallback for backward compatibility)
  const currentRewards = {
    id: currentDrawing?.id || '',
    name: currentDrawing?.name || 'Quarterly Rewards',
    endDate: currentDrawing ? new Date(currentDrawing.drawingDate) : new Date(),
    daysRemaining: rewardsCalculated.daysRemaining,
  };

  // Save rewards entry using context
  const saveRaffleEntry = async () => {
    try {
      await enterDrawing();
      setEnterRaffle(true);
      setShowRaffleModal(false);
    } catch (error) {
      console.error("Error saving rewards entry:", error);
    }
  };

  // State for modal visibility
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentPicker, setCurrentPicker] = useState<string>("");
  const [currentPickerLabel, setCurrentPickerLabel] = useState<string>("");

  // Data for pickers
  const pickerData: PickerData = {
    species: [
      "Red Drum",
      "Flounder",
      "Spotted Seatrout (speckled trout)",
      "Striped Bass",
      "Weakfish (gray trout)",
    ],
    // Use DMF area labels from constants
    waterbody: [...AREA_LABELS],
    // Use non-hook gear options from constants (for when hook & line is not used)
    gearType: [...NON_HOOK_GEAR_LABELS],
  };

  // Function to open modal with specific picker type
  const openPicker = (pickerType: keyof PickerData, label: string): void => {
    setCurrentPicker(pickerType as string);
    setCurrentPickerLabel(label);
    setModalVisible(true);
    // Animate drawer sliding up and overlay fading in
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(drawerAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Function to close modal with animation
  const closePicker = (): void => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(drawerAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
    });
  };

  // Function to handle selection in modal
  const handleSelection = (item: string): void => {
    setFormData({ ...formData, [currentPicker]: item });
    closePicker();
  };

  const handleDateChange = (event: any, selectedDate?: Date): void => {
    // Don't auto-close on iOS with inline display - user will press Done
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate });
    }
  };

  // Helper to get current fish data from form
  const getCurrentFishData = (): FishEntry => ({
    species: formData.species,
    count: formData.count,
    lengths: formData.lengths.filter(l => l.trim() !== ""), // Only include non-empty lengths
    tagNumber: formData.tagNumber || undefined,
  });

  // Helper to load fish data into form
  const loadFishIntoForm = (fish: FishEntry): void => {
    // Ensure lengths array matches count
    const lengths = [...fish.lengths];
    while (lengths.length < fish.count) {
      lengths.push("");
    }
    setFormData((prev) => ({
      ...prev,
      species: fish.species,
      count: fish.count,
      lengths: lengths,
      tagNumber: fish.tagNumber || "",
    }));
    setShowOptionalDetails(fish.lengths.some(l => l.trim() !== "") || !!fish.tagNumber);
  };

  // Helper to reset fish fields in form
  const resetFishFields = (): void => {
    setFormData((prev) => ({
      ...prev,
      species: "",
      count: 1,
      lengths: [""],
      tagNumber: "",
    }));
    setShowOptionalDetails(false);
  };

  // Helper to update a specific length in the array
  const updateLength = (index: number, value: string): void => {
    const newLengths = [...formData.lengths];
    newLengths[index] = value;
    setFormData({ ...formData, lengths: newLengths });
  };

  // Update lengths array when count changes
  const handleCountChange = (newCount: number): void => {
    const count = Math.max(1, newCount);
    const newLengths = [...formData.lengths];

    // Add empty strings if count increased
    while (newLengths.length < count) {
      newLengths.push("");
    }
    // Remove excess lengths if count decreased
    while (newLengths.length > count) {
      newLengths.pop();
    }

    setFormData({ ...formData, count, lengths: newLengths });
  };

  // Validate current fish entry
  const validateCurrentFish = (): boolean => {
    if (!formData.species) {
      Alert.alert("Missing Information", "Please select a fish species.");
      return false;
    }
    if (formData.count < 1) {
      Alert.alert("Missing Information", "Please enter the number of fish harvested.");
      return false;
    }
    return true;
  };

  // Add another fish to the list
  const handleAddAnotherFish = (): void => {
    if (!validateCurrentFish()) return;

    const currentFish = getCurrentFishData();
    let updatedEntries = [...fishEntries];
    let alertMessage = "";

    if (currentFishIndex !== null) {
      // Update existing fish entry
      updatedEntries[currentFishIndex] = currentFish;
      alertMessage = `${currentFish.count} ${currentFish.species} updated.`;
    } else {
      // Check if this species already exists in the list
      const existingIndex = updatedEntries.findIndex(
        (entry) => entry.species === currentFish.species
      );

      if (existingIndex !== -1) {
        // Merge with existing entry - combine counts and lengths
        const existing = updatedEntries[existingIndex];
        const mergedLengths = [
          ...existing.lengths,
          ...currentFish.lengths,
        ];
        // Use the most recent tag number if provided
        const mergedTag = currentFish.tagNumber || existing.tagNumber;

        updatedEntries[existingIndex] = {
          species: existing.species,
          count: existing.count + currentFish.count,
          lengths: mergedLengths,
          tagNumber: mergedTag,
        };
        alertMessage = `Added ${currentFish.count} more ${currentFish.species} (${updatedEntries[existingIndex].count} total).`;
      } else {
        // Add as new species entry
        updatedEntries.push(currentFish);
        alertMessage = `${currentFish.count} ${currentFish.species} saved.`;
      }
    }

    setFishEntries(updatedEntries);

    // Reset for new fish
    setCurrentFishIndex(null);
    resetFishFields();

    Alert.alert(
      "Fish Added",
      `${alertMessage} You can add more fish or submit your report.`,
      [{ text: "OK" }]
    );
  };

  // Helper to merge or add fish to entries
  const mergeOrAddFish = (entries: FishEntry[], fish: FishEntry): FishEntry[] => {
    const existingIndex = entries.findIndex((e) => e.species === fish.species);
    if (existingIndex !== -1) {
      // Merge with existing
      const existing = entries[existingIndex];
      const updated = [...entries];
      updated[existingIndex] = {
        species: existing.species,
        count: existing.count + fish.count,
        lengths: [...existing.lengths, ...fish.lengths],
        tagNumber: fish.tagNumber || existing.tagNumber,
      };
      return updated;
    }
    return [...entries, fish];
  };

  // Select a fish to edit
  const handleSelectFish = (index: number): void => {
    // Save current fish first if it has data
    if (formData.species && formData.count >= 1 && currentFishIndex === null) {
      // When saving unsaved form data, merge if same species exists
      setFishEntries(mergeOrAddFish(fishEntries, getCurrentFishData()));
    } else if (currentFishIndex !== null && formData.species && formData.count >= 1) {
      const updatedEntries = [...fishEntries];
      updatedEntries[currentFishIndex] = getCurrentFishData();
      setFishEntries(updatedEntries);
    }

    // Load selected fish
    loadFishIntoForm(fishEntries[index]);
    setCurrentFishIndex(index);
  };

  // Remove a fish from the list
  const handleRemoveFish = (index: number): void => {
    Alert.alert(
      "Remove Fish",
      `Are you sure you want to remove Fish #${index + 1}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updatedEntries = fishEntries.filter((_, i) => i !== index);
            setFishEntries(updatedEntries);

            // If we're editing this fish, reset form
            if (currentFishIndex === index) {
              setCurrentFishIndex(null);
              resetFishFields();
            } else if (currentFishIndex !== null && currentFishIndex > index) {
              // Adjust index if needed
              setCurrentFishIndex(currentFishIndex - 1);
            }
          },
        },
      ]
    );
  };

  // Check if user has entered any data in the form (beyond pre-loaded profile data)
  const hasFormData = (): boolean => {
    // Check reporting type - this is always user input
    if (formData.reportingType) return true;

    // Check fish entries - always user input
    if (fishEntries.length > 0) return true;

    // Check current fish data - always user input
    if (formData.species) return true;

    // Check trip details - compare against initial loaded values
    // Waterbody is considered user input only if different from what was loaded
    if (formData.waterbody && formData.waterbody !== initialLoadedValues.waterbody) return true;
    if (!formData.usedHookAndLine && formData.gearType) return true;

    // Check angler info - compare against initial loaded values
    if (formData.angler.firstName && formData.angler.firstName !== initialLoadedValues.firstName) return true;
    if (formData.angler.lastName && formData.angler.lastName !== initialLoadedValues.lastName) return true;
    if (formData.angler.email && formData.angler.email !== initialLoadedValues.email) return true;
    if (formData.angler.phone && formData.angler.phone !== initialLoadedValues.phone) return true;

    // Check identity fields - compare against initial loaded values
    if (formData.wrcId && formData.wrcId !== initialLoadedValues.wrcId) return true;
    if (formData.zipCode && formData.zipCode !== initialLoadedValues.zipCode) return true;

    // Check photo - always user input
    if (catchPhoto) return true;

    // Check raffle selection - always user input
    if (enterRaffle) return true;

    return false;
  };

  // Handle back button press with abandonment check
  const handleBackPress = (): void => {
    if (hasFormData()) {
      setShowAbandonModal(true);
    } else {
      navigation.goBack();
    }
  };

  // Handle camera capture for raffle photo
  const handleTakePhoto = async (): Promise<void> => {
    // Request camera permission
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Camera Permission Required",
        "Please allow camera access to take a photo of your catch for the raffle entry."
      );
      return;
    }

    try {
      // Launch camera (not gallery - camera only)
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCatchPhoto(result.assets[0].uri);
        clearValidationError("photo");
        showToast("Photo Captured", "Your catch photo has been saved");
      }
    } catch (error) {
      // Camera not available (likely running on simulator)
      // Offer to use photo library for testing purposes only
      Alert.alert(
        "Camera Not Available",
        "Camera is not available on this device. Would you like to select a photo from your library for testing purposes?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Select from Library",
            onPress: async () => {
              const libraryResult = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              if (!libraryResult.canceled && libraryResult.assets && libraryResult.assets.length > 0) {
                setCatchPhoto(libraryResult.assets[0].uri);
                clearValidationError("photo");
                showToast("Photo Selected", "Photo selected for testing (camera required in production)");
              }
            },
          },
        ]
      );
    }
  };

  // Remove captured photo
  const handleRemovePhoto = (): void => {
    setCatchPhoto(null);
  };

  // Format phone number as user types
  // DMF requires xxx-xxx-xxxx format (with dashes, no parentheses)
  const formatPhoneNumber = (text: string): string => {
    const digitsOnly = text.replace(/\D/g, "");
    if (digitsOnly.length <= 3) {
      return digitsOnly;
    } else if (digitsOnly.length <= 6) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    } else {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
    }
  };

  // Clear a specific validation error when field is edited
  const clearValidationError = (field: keyof typeof validationErrors) => {
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = (): void => {
    // Build final list of fish (include current form if it has data)
    let allFish = [...fishEntries];
    const hasCurrentFish = formData.species && formData.count >= 1;

    if (hasCurrentFish) {
      if (currentFishIndex !== null) {
        // Update existing fish
        allFish[currentFishIndex] = getCurrentFishData();
      } else {
        // Add current fish as new entry
        allFish.push(getCurrentFishData());
      }
    }

    // Must have at least one fish
    if (allFish.length === 0) {
      Alert.alert("Missing Information", "Please add at least one fish to your report.");
      return;
    }

    // Validate shared fields
    if (!formData.waterbody) {
      Alert.alert(
        "Missing Information",
        "Please select the area of harvest."
      );
      return;
    }

    // Validate gear type if not using hook & line
    if (!formData.usedHookAndLine && !formData.gearType) {
      Alert.alert(
        "Missing Information",
        "Please select the gear type used."
      );
      return;
    }

    // Validate DMF-required angler identity fields
    const dmfErrors: typeof validationErrors = {};

    // License status must be selected
    if (formData.hasLicense === undefined || formData.hasLicense === null) {
      dmfErrors.hasLicense = "Please indicate if you have a NC fishing license";
    }

    // If licensed, WRC ID is required
    if (formData.hasLicense === true && !formData.wrcId?.trim()) {
      dmfErrors.wrcId = "WRC ID or Customer ID is required for licensed anglers";
    }

    // If unlicensed, name and ZIP are required
    if (formData.hasLicense === false) {
      if (!formData.angler.firstName?.trim()) {
        dmfErrors.firstName = "First name is required for unlicensed anglers";
      }
      if (!formData.angler.lastName?.trim()) {
        dmfErrors.lastName = "Last name is required for unlicensed anglers";
      }
      if (!formData.zipCode?.trim()) {
        dmfErrors.zipCode = "ZIP code is required for unlicensed anglers";
      } else if (!/^\d{5}$/.test(formData.zipCode.trim())) {
        dmfErrors.zipCode = "ZIP code must be exactly 5 digits";
      }
    }

    if (Object.keys(dmfErrors).length > 0) {
      setValidationErrors(dmfErrors);
      Alert.alert(
        "Missing Information",
        "Please complete all required angler information fields."
      );
      return;
    }

    // Note: Raffle validation is now handled in the raffle modal
    // enterRaffle will only be true if user completed all raffle requirements in the modal

    // Calculate total fish count
    const totalFishCount = allFish.reduce((sum, fish) => sum + fish.count, 0);

    // Save raffle entry if user opted in and hasn't already entered
    if (enterRaffle && !hasEnteredCurrentRaffle) {
      saveRaffleEntry();
    }

    // Build report data (includes both legacy fields and DMF-specific fields)
    const reportData: FishReportData = {
      // Use first fish's data for primary fields
      species: allFish[0].species,
      length: allFish[0].lengths[0], // Use first length for backwards compatibility
      tagNumber: allFish[0].tagNumber,
      // Shared trip details
      waterbody: formData.waterbody,
      date: formData.date.toISOString(),
      fishingMethod: formData.usedHookAndLine ? "Hook & Line" : formData.gearType,
      angler: {
        ...formData.angler,
        licenseNumber: formData.wrcId, // Map WRC ID to licenseNumber for backwards compatibility
      },
      // Include all fish entries with their individual lengths
      fishEntries: allFish,
      fishCount: totalFishCount,
      // Include raffle entry status and photo
      enteredRaffle: enterRaffle && !hasEnteredCurrentRaffle ? currentRewards.id : undefined,
      photo: catchPhoto || undefined,
      // DMF-specific fields for harvest report submission
      hasLicense: formData.hasLicense,
      wrcId: formData.wrcId,
      zipCode: formData.zipCode,
      usedHookAndLine: formData.usedHookAndLine,
      gearType: formData.gearType,
      // DMF codes for submission (converted from display labels)
      areaCode: getAreaCodeFromLabel(formData.waterbody),
      areaLabel: formData.waterbody,
      gearCode: formData.usedHookAndLine ? undefined : getGearCodeFromLabel(formData.gearType),
      gearLabel: formData.usedHookAndLine ? undefined : formData.gearType,
      // Confirmation preferences
      wantTextConfirmation: formData.wantTextConfirmation,
      wantEmailConfirmation: formData.wantEmailConfirmation,
      reportingFor: formData.reportingType === "myself_and_minors" ? "family" : "self",
      familyCount: formData.reportingType === "myself_and_minors" ? formData.totalPeopleCount : undefined,
    };

    // Navigate to the confirmation page
    navigation.navigate("Confirmation", { reportData });
  };

  // Render the selection modal
  const renderSelectionModal = (): React.ReactNode => (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closePicker}
    >
      <View style={localStyles.modalWrapper}>
        {/* Animated overlay */}
        <TouchableWithoutFeedback onPress={closePicker}>
          <Animated.View
            style={[
              localStyles.modalOverlay,
              { opacity: overlayAnim },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Animated drawer */}
        <Animated.View
          style={[
            localStyles.modalDrawer,
            { transform: [{ translateY: drawerAnim }] },
          ]}
        >
          <View style={localStyles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select {currentPickerLabel}</Text>
            <TouchableOpacity onPress={closePicker}>
              <Text style={styles.closeButton}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={pickerData[currentPicker as keyof PickerData]}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => {
              const isSelected = formData[currentPicker as keyof FormState] === item;
              return (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    isSelected && localStyles.optionItemSelected
                  ]}
                  onPress={() => handleSelection(item)}
                >
                  <Text style={[
                    styles.optionText,
                    isSelected && localStyles.optionTextSelected
                  ]}>{item}</Text>
                  {isSelected && (
                    <Feather name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: 34 }}
            scrollEnabled={pickerData[currentPicker as keyof PickerData]?.length > 8}
          />
        </Animated.View>
      </View>
    </Modal>
  );

  // Render the abandonment confirmation modal
  const renderAbandonModal = (): React.ReactNode => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showAbandonModal}
      onRequestClose={() => setShowAbandonModal(false)}
    >
      <View style={localStyles.abandonModalOverlay}>
        <View style={localStyles.abandonModalContent}>
          <View style={localStyles.abandonModalIconContainer}>
            <Feather name="alert-circle" size={32} color={colors.warning} />
          </View>
          <Text style={localStyles.abandonModalTitle}>Discard Report?</Text>
          <Text style={localStyles.abandonModalText}>
            You have unsaved information. Are you sure you want to leave? Your progress will be lost.
          </Text>
          <View style={localStyles.abandonModalButtons}>
            <TouchableOpacity
              style={localStyles.abandonModalCancelButton}
              onPress={() => setShowAbandonModal(false)}
              activeOpacity={0.7}
            >
              <Text style={localStyles.abandonModalCancelText}>Keep Editing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={localStyles.abandonModalDiscardButton}
              onPress={() => {
                setShowAbandonModal(false);
                navigation.goBack();
              }}
              activeOpacity={0.7}
            >
              <Text style={localStyles.abandonModalDiscardText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render the input field for picker-style data
  const renderPickerField = (
    label: string,
    field: keyof PickerData,
    required: boolean = false
  ): React.ReactNode => (
    <View>
      <Text style={styles.label}>
        {label} {required && "*"}
      </Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => openPicker(field, label)}
      >
        <Text
          style={
            formData[field as keyof FormState]
              ? styles.selectorText
              : styles.selectorPlaceholder
          }
        >
          {String(formData[field as keyof FormState] || `Select ${label.toLowerCase()}`)}
        </Text>
        <Text style={styles.selectorArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={localStyles.screenContainer}>
      {/* Modern Header */}
      <View style={localStyles.header}>
        <TouchableOpacity
          style={localStyles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={localStyles.headerTitleContainer}>
          <Text style={localStyles.headerTitleText}>Report Catch</Text>
          {/* TEST MODE badge - shows when not submitting to real DMF */}
          {isTestMode() && (
            <View style={localStyles.testModeBadge}>
              <Text style={localStyles.testModeBadgeText}>TEST MODE</Text>
            </View>
          )}
        </View>
        <View style={localStyles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={localStyles.scrollView}
        contentContainerStyle={localStyles.scrollViewContent}
        showsVerticalScrollIndicator={false}>
      {renderSelectionModal()}
      {renderAbandonModal()}

      {/* Reporting Type Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Who Are You Reporting For?</Text>

        <TouchableOpacity
          style={[
            localStyles.reportingTypeOption,
            formData.reportingType === "myself" && localStyles.reportingTypeOptionSelected,
          ]}
          onPress={() => setFormData({ ...formData, reportingType: "myself", totalPeopleCount: 1 })}
          activeOpacity={0.7}
        >
          <View style={localStyles.radioOuter}>
            {formData.reportingType === "myself" && <View style={localStyles.radioInner} />}
          </View>
          <Text style={localStyles.reportingTypeText}>Myself Only</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            localStyles.reportingTypeOption,
            formData.reportingType === "myself_and_minors" && localStyles.reportingTypeOptionSelected,
          ]}
          onPress={() => setFormData({ ...formData, reportingType: "myself_and_minors", totalPeopleCount: 2 })}
          activeOpacity={0.7}
        >
          <View style={localStyles.radioOuter}>
            {formData.reportingType === "myself_and_minors" && <View style={localStyles.radioInner} />}
          </View>
          <Text style={localStyles.reportingTypeText}>Myself and/or minor children under the age of 18</Text>
        </TouchableOpacity>

        {/* Show people count picker when reporting for minors */}
        {formData.reportingType === "myself_and_minors" && (
          <View style={localStyles.peopleCountSection}>
            <Text style={styles.label}>How many total people are you reporting for? *</Text>
            <View style={localStyles.countContainer}>
              <TouchableOpacity
                style={localStyles.countButton}
                onPress={() => setFormData({ ...formData, totalPeopleCount: Math.max(2, formData.totalPeopleCount - 1) })}
              >
                <Feather name="minus" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={localStyles.countInput}
                keyboardType="number-pad"
                value={String(formData.totalPeopleCount)}
                onChangeText={(text) => {
                  const num = parseInt(text) || 2;
                  setFormData({ ...formData, totalPeopleCount: Math.max(2, num) });
                }}
              />
              <TouchableOpacity
                style={localStyles.countButton}
                onPress={() => setFormData({ ...formData, totalPeopleCount: formData.totalPeopleCount + 1 })}
              >
                <Feather name="plus" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={localStyles.helperText}>
              Include yourself and all minor children you are reporting for.
            </Text>
          </View>
        )}
      </View>

      {/* Only show Fish Information after reporting type is selected */}
      {formData.reportingType && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fish Information</Text>

        {renderPickerField("Species", "species", true)}

        {/* Show count field only after species is selected */}
        {formData.species && (
          <>
            <Text style={styles.label}>Number Harvested *</Text>
            <View style={localStyles.countContainer}>
              <TouchableOpacity
                style={localStyles.countButton}
                onPress={() => handleCountChange(formData.count - 1)}
              >
                <Feather name="minus" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={localStyles.countInput}
                keyboardType="number-pad"
                value={String(formData.count)}
                onChangeText={(text) => handleCountChange(parseInt(text) || 1)}
              />
              <TouchableOpacity
                style={localStyles.countButton}
                onPress={() => handleCountChange(formData.count + 1)}
              >
                <Feather name="plus" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Optional details toggle */}
            <TouchableOpacity
              style={localStyles.optionalToggle}
              onPress={() => setShowOptionalDetails(!showOptionalDetails)}
              activeOpacity={0.7}
            >
              <Text style={localStyles.optionalToggleText}>
                {showOptionalDetails ? "Hide" : "Add"} optional details (length, tag)
              </Text>
              <Feather
                name={showOptionalDetails ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>

            {/* Optional details section */}
            {showOptionalDetails && (
              <View style={localStyles.optionalSection}>
                <Text style={styles.label}>
                  Length{formData.count > 1 ? "s" : ""} (inches)
                </Text>
                {formData.count === 1 ? (
                  // Single fish - simple input
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={formData.lengths[0] || ""}
                    onChangeText={(text) => updateLength(0, text)}
                    placeholder="Enter the length"
                  />
                ) : (
                  // Multiple fish - numbered inputs
                  <View style={localStyles.lengthsContainer}>
                    {formData.lengths.map((length, index) => (
                      <View key={index} style={localStyles.lengthRow}>
                        <Text style={localStyles.lengthLabel}>#{index + 1}</Text>
                        <TextInput
                          style={localStyles.lengthInput}
                          keyboardType="decimal-pad"
                          value={length}
                          onChangeText={(text) => updateLength(index, text)}
                          placeholder={`Fish ${index + 1}`}
                        />
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.label}>Tag Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.tagNumber}
                  onChangeText={(text) => setFormData({ ...formData, tagNumber: text })}
                  placeholder="Enter tag number if fish is tagged"
                />
              </View>
            )}
          </>
        )}

        {/* Multi-fish UI */}
        {fishEntries.length > 0 && (
          <View style={localStyles.fishListContainer}>
            <Text style={localStyles.fishListTitle}>
              Saved Fish ({fishEntries.reduce((sum, f) => sum + f.count, 0)} total)
            </Text>
            {fishEntries.map((fish, index) => (
              <View
                key={index}
                style={[
                  localStyles.fishChip,
                  currentFishIndex === index && localStyles.fishChipActive,
                ]}
              >
                <TouchableOpacity
                  style={localStyles.fishChipContent}
                  onPress={() => handleSelectFish(index)}
                >
                  <Text style={localStyles.fishChipText}>
                    {fish.count}x {fish.species}
                    {fish.lengths.length > 0 && fish.lengths.some(l => l)
                      ? ` (${fish.lengths.filter(l => l).join('", ')}${fish.lengths.filter(l => l).length > 0 ? '"' : ''})`
                      : ""}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={localStyles.fishChipRemove}
                  onPress={() => handleRemoveFish(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={14} color={colors.darkGray} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add another fish button - only show if species is selected */}
        {formData.species && (
          <TouchableOpacity
            style={localStyles.addFishButton}
            onPress={handleAddAnotherFish}
            activeOpacity={0.7}
          >
            <Feather name="plus-circle" size={18} color={colors.primary} />
            <Text style={localStyles.addFishButtonText}>
              {currentFishIndex !== null ? "Save & Add Another Species" : "Add Another Species"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      )}


      {/* Only show Harvest Details after fish info is complete (species selected or fish entries exist) */}
      {formData.reportingType && (formData.species || fishEntries.length > 0) && (
      <View style={styles.section}>
        <View style={localStyles.sectionHeaderWithIcon}>
          <Text style={styles.sectionTitle}>Harvest Details</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://experience.arcgis.com/experience/dc745a4de8344e40b5855b9e9130d0c1")}
            style={localStyles.mapIconButton}
            activeOpacity={0.7}
          >
            <Feather name="map" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Area of Harvest *</Text>
        <Text style={localStyles.helperText}>
          Select the waterbody where you harvested the majority of your fish.
        </Text>
        {renderPickerField("Area of Harvest", "waterbody", false)}

        {/* Save as primary area checkbox - only show after area is selected */}
        {formData.waterbody && (
          <TouchableOpacity
            style={localStyles.checkboxRow}
            onPress={() => handlePrimaryAreaToggle(!saveAsPrimaryArea)}
            activeOpacity={0.7}
          >
            <View style={[
              localStyles.checkbox,
              saveAsPrimaryArea && localStyles.checkboxChecked
            ]}>
              {saveAsPrimaryArea && (
                <Feather name="check" size={14} color={colors.white} />
              )}
            </View>
            <Text style={localStyles.checkboxLabel}>
              {hasSavedPrimaryArea && saveAsPrimaryArea
                ? "Saved as my primary area"
                : "Save as my primary area for next time"}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Date of Harvest *</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Feather name="calendar" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.dateText}>
            {formData.date.toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </Text>
        </TouchableOpacity>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
            <View style={localStyles.dateModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={localStyles.dateModalContent}>
                  <View style={localStyles.dateModalHeader}>
                    <Text style={localStyles.dateModalTitle}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Feather name="x" size={24} color={colors.darkGray} />
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={formData.date}
                    mode="date"
                    display="inline"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    style={localStyles.datePickerInline}
                  />
                  <TouchableOpacity
                    style={localStyles.dateModalConfirmButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={localStyles.dateModalConfirmText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Hook & Line Selection */}
        <Text style={styles.label}>Did you use Hook & Line? *</Text>
        <View style={localStyles.licenseToggleContainer}>
          <TouchableOpacity
            style={[
              localStyles.licenseToggleButton,
              formData.usedHookAndLine === true && localStyles.licenseToggleButtonActive,
            ]}
            onPress={() => {
              setFormData({
                ...formData,
                usedHookAndLine: true,
                gearType: "" // Clear gear type when switching to hook & line
              });
            }}
          >
            <Text style={[
              localStyles.licenseToggleText,
              formData.usedHookAndLine === true && localStyles.licenseToggleTextActive,
            ]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              localStyles.licenseToggleButton,
              formData.usedHookAndLine === false && localStyles.licenseToggleButtonActive,
            ]}
            onPress={() => {
              setFormData({
                ...formData,
                usedHookAndLine: false,
              });
            }}
          >
            <Text style={[
              localStyles.licenseToggleText,
              formData.usedHookAndLine === false && localStyles.licenseToggleTextActive,
            ]}>No</Text>
          </TouchableOpacity>
        </View>

        {/* Gear Type Picker - only show when NOT using hook & line */}
        {!formData.usedHookAndLine && (
          renderPickerField("Gear Type", "gearType", true)
        )}
      </View>
      )}

      {/* Only show Angler Information after harvest details are complete */}
      {formData.reportingType && (formData.species || fishEntries.length > 0) && formData.waterbody && (formData.usedHookAndLine || formData.gearType) && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Angler Information</Text>

        {/* License Question - Required for DMF submission */}
        <Text style={styles.label}>Do you have a NC Fishing License? *</Text>
        <View style={localStyles.licenseToggleContainer}>
          <TouchableOpacity
            style={[
              localStyles.licenseToggleButton,
              formData.hasLicense === true && localStyles.licenseToggleButtonActive,
            ]}
            onPress={() => {
              clearValidationError("hasLicense");
              clearValidationError("wrcId");
              clearValidationError("firstName");
              clearValidationError("lastName");
              clearValidationError("zipCode");
              setFormData({ ...formData, hasLicense: true });
            }}
          >
            <Text style={[
              localStyles.licenseToggleText,
              formData.hasLicense === true && localStyles.licenseToggleTextActive,
            ]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              localStyles.licenseToggleButton,
              formData.hasLicense === false && localStyles.licenseToggleButtonActive,
            ]}
            onPress={() => {
              clearValidationError("hasLicense");
              clearValidationError("wrcId");
              clearValidationError("firstName");
              clearValidationError("lastName");
              clearValidationError("zipCode");
              setFormData({ ...formData, hasLicense: false });
            }}
          >
            <Text style={[
              localStyles.licenseToggleText,
              formData.hasLicense === false && localStyles.licenseToggleTextActive,
            ]}>No</Text>
          </TouchableOpacity>
        </View>
        {validationErrors.hasLicense && (
          <Text style={localStyles.errorText}>{validationErrors.hasLicense}</Text>
        )}

        {/* Show WRC ID if licensed (required), or Name + ZIP if unlicensed (required) */}
        {formData.hasLicense === true && (
          <>
            <Text style={styles.label}>WRC ID / Customer ID *</Text>
            <TextInput
              style={[
                styles.input,
                validationErrors.wrcId && localStyles.inputError,
              ]}
              value={formData.wrcId}
              onChangeText={(text) => {
                clearValidationError("wrcId");
                setFormData({
                  ...formData,
                  wrcId: text,
                });
                // Reset the save toggle if user changes the value
                if (hasSavedLicenseNumber && text !== initialLoadedValues.wrcId) {
                  setHasSavedLicenseNumber(false);
                  setSaveLicenseNumber(false);
                }
              }}
              placeholder="Enter your WRC ID or Customer ID"
              autoCapitalize="characters"
            />
            {validationErrors.wrcId && (
              <Text style={localStyles.errorText}>{validationErrors.wrcId}</Text>
            )}

            {/* Save to License checkbox - only show if WRC ID is NEW (different from pre-loaded) */}
            {formData.wrcId && formData.wrcId.trim() !== "" && formData.wrcId !== initialLoadedValues.wrcId && (
              <TouchableOpacity
                style={localStyles.checkboxRow}
                onPress={() => handleSaveLicenseNumber(!saveLicenseNumber)}
                activeOpacity={0.7}
              >
                <View style={[
                  localStyles.checkbox,
                  saveLicenseNumber && localStyles.checkboxChecked
                ]}>
                  {saveLicenseNumber && (
                    <Feather name="check" size={14} color={colors.white} />
                  )}
                </View>
                <Text style={localStyles.checkboxLabel}>
                  {hasSavedLicenseNumber && saveLicenseNumber
                    ? "Saved to My License"
                    : "Save to My License for next time"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {formData.hasLicense === false && (
          <>
            <Text style={styles.label}>Name *</Text>
            <View style={localStyles.nameRow}>
              <TextInput
                style={[
                  styles.input,
                  localStyles.nameInput,
                  validationErrors.firstName && localStyles.inputError,
                ]}
                value={formData.angler.firstName}
                onChangeText={(text) => {
                  clearValidationError("firstName");
                  setFormData({
                    ...formData,
                    angler: { ...formData.angler, firstName: text },
                  });
                }}
                placeholder="First"
              />
              <TextInput
                style={[
                  styles.input,
                  localStyles.nameInput,
                  validationErrors.lastName && localStyles.inputError,
                ]}
                value={formData.angler.lastName}
                onChangeText={(text) => {
                  clearValidationError("lastName");
                  setFormData({
                    ...formData,
                    angler: { ...formData.angler, lastName: text },
                  });
                }}
                placeholder="Last"
              />
            </View>
            {(validationErrors.firstName || validationErrors.lastName) && (
              <Text style={localStyles.errorText}>
                {validationErrors.firstName || validationErrors.lastName}
              </Text>
            )}

            <Text style={styles.label}>ZIP Code *</Text>
            <TextInput
              style={[
                styles.input,
                validationErrors.zipCode && localStyles.inputError,
              ]}
              value={formData.zipCode}
              onChangeText={(text) => {
                clearValidationError("zipCode");
                setFormData({
                  ...formData,
                  zipCode: text.replace(/\D/g, '').slice(0, 5),
                });
              }}
              placeholder="Enter your 5-digit ZIP code"
              keyboardType="number-pad"
              maxLength={5}
            />
            {validationErrors.zipCode && (
              <Text style={localStyles.errorText}>{validationErrors.zipCode}</Text>
            )}
          </>
        )}

        {/* Optional contact fields for DMF confirmations */}
        <Text style={[styles.label, { marginTop: 16 }]}>Email (optional)</Text>
        <TextInput
          style={[styles.input, validationErrors.email && localStyles.inputError]}
          value={formData.angler.email}
          onChangeText={(text) => {
            clearValidationError("email");
            setFormData({
              ...formData,
              angler: { ...formData.angler, email: text },
            });
          }}
          placeholder="Your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {validationErrors.email && (
          <Text style={localStyles.errorText}>{validationErrors.email}</Text>
        )}

        {/* Email confirmation checkbox - DMF will send email confirmation */}
        {formData.angler.email && (
          <TouchableOpacity
            style={localStyles.checkboxRow}
            onPress={() => setFormData({ ...formData, wantEmailConfirmation: !formData.wantEmailConfirmation })}
            activeOpacity={0.7}
          >
            <View style={[
              localStyles.checkbox,
              formData.wantEmailConfirmation && localStyles.checkboxChecked
            ]}>
              {formData.wantEmailConfirmation && (
                <Feather name="check" size={14} color={colors.white} />
              )}
            </View>
            <Text style={localStyles.checkboxLabel}>Send email confirmation from NC DMF</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          style={[styles.input, validationErrors.phone && localStyles.inputError]}
          value={formData.angler.phone}
          onChangeText={(text) => {
            clearValidationError("phone");
            setFormData({
              ...formData,
              angler: { ...formData.angler, phone: formatPhoneNumber(text) },
            });
          }}
          placeholder="555-555-5555"
          keyboardType="phone-pad"
          maxLength={12}
        />
        {validationErrors.phone && (
          <Text style={localStyles.errorText}>{validationErrors.phone}</Text>
        )}

        {/* Text confirmation checkbox - DMF will send text confirmation */}
        {formData.angler.phone && (
          <TouchableOpacity
            style={localStyles.checkboxRow}
            onPress={() => setFormData({ ...formData, wantTextConfirmation: !formData.wantTextConfirmation })}
            activeOpacity={0.7}
          >
            <View style={[
              localStyles.checkbox,
              formData.wantTextConfirmation && localStyles.checkboxChecked
            ]}>
              {formData.wantTextConfirmation && (
                <Feather name="check" size={14} color={colors.white} />
              )}
            </View>
            <Text style={localStyles.checkboxLabel}>Send text confirmation from NC DMF</Text>
          </TouchableOpacity>
        )}

        {/* Save angler info toggle - only show if user entered NEW info (different from pre-loaded) */}
        {((formData.angler.firstName && formData.angler.firstName !== initialLoadedValues.firstName) ||
          (formData.angler.lastName && formData.angler.lastName !== initialLoadedValues.lastName) ||
          (formData.angler.email && formData.angler.email !== initialLoadedValues.email) ||
          (formData.angler.phone && formData.angler.phone !== initialLoadedValues.phone)) && (
          <TouchableOpacity
            style={[
              localStyles.saveButton,
              saveAnglerInfo && localStyles.saveButtonSaved
            ]}
            onPress={() => handleSaveAnglerInfo(!saveAnglerInfo)}
            activeOpacity={0.7}
            disabled={saveAnglerInfo}
          >
            <Feather
              name={saveAnglerInfo ? "check" : "save"}
              size={14}
              color={saveAnglerInfo ? colors.success : colors.primary}
            />
            <Text style={[
              localStyles.saveButtonText,
              saveAnglerInfo && localStyles.saveButtonTextSaved
            ]}>
              {saveAnglerInfo ? "Saved to profile" : "Save to profile"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      )}

      {/* Only show Raffle and Submit after all required sections are visible */}
      {formData.reportingType && (formData.species || fishEntries.length > 0) && formData.waterbody && (formData.usedHookAndLine || formData.gearType) && (
      <>
      {/* Raffle Entry Section */}
      <View style={[
        localStyles.raffleSection,
        hasEnteredCurrentRaffle && localStyles.raffleSectionEntered,
      ]}>
        <View style={localStyles.raffleSectionHeader}>
          <View style={[
            localStyles.raffleIconContainer,
            hasEnteredCurrentRaffle && localStyles.raffleIconContainerEntered,
          ]}>
            <Feather
              name={hasEnteredCurrentRaffle ? "check-circle" : "gift"}
              size={24}
              color={hasEnteredCurrentRaffle ? colors.white : colors.primary}
            />
          </View>
          <View style={localStyles.raffleTitleContainer}>
            <Text style={localStyles.raffleTitle}>{currentRewards.name}</Text>
            <Text style={localStyles.raffleSubtitle}>
              {hasEnteredCurrentRaffle
                ? "You're entered! Good luck!"
                : "Eligible contributors entered automatically"}
            </Text>
          </View>
        </View>

        {hasEnteredCurrentRaffle ? (
          <View style={localStyles.raffleEnteredMessage}>
            <Feather name="award" size={18} color={colors.success} />
            <Text style={localStyles.raffleEnteredText}>
              You're entered in this quarter's drawing. Selected contributors will be notified at the end of {currentRewards.name.split(' ')[0]}.
            </Text>
          </View>
        ) : (
          <>
            <Text style={localStyles.raffleDescription}>
              Report your catch to be entered into our quarterly drawing.{'\n'}Or enter free at fishlog.app/enter
            </Text>

            {enterRaffle ? (
              <>
                <View style={[localStyles.raffleButton, localStyles.raffleButtonSelected]}>
                  <Feather name="check-circle" size={20} color={colors.white} />
                  <Text style={[localStyles.raffleButtonText, localStyles.raffleButtonTextSelected]}>
                    Joined Rewards Program
                  </Text>
                </View>
                <View style={localStyles.privacyAssurance}>
                  <Feather name="lock" size={14} color={colors.success} style={{ marginRight: 6 }} />
                  <Text style={localStyles.privacyAssuranceText}>
                    Your info, photos & location stay private—never shared or sold. No BS.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEnterRaffle(false);
                    showToast("Rewards Entry Removed", "You can re-join anytime before submitting.");
                  }}
                  style={localStyles.raffleRemoveButton}
                >
                  <Text style={localStyles.raffleRemoveButtonText}>Remove from rewards</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={localStyles.raffleButton}
                onPress={() => setShowRaffleModal(true)}
                activeOpacity={0.7}
              >
                <Feather name="circle" size={20} color={colors.primary} />
                <Text style={localStyles.raffleButtonText}>Learn More</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        activeOpacity={0.8}
      >
        <Feather name="send" size={20} color={colors.white} />
        <Text style={styles.submitButtonText}>Submit Report</Text>
      </TouchableOpacity>

      <Text style={styles.requiredFields}>* Required fields</Text>
      </>
      )}
    </ScrollView>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={[
            localStyles.toast,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <Feather name="check-circle" size={24} color={colors.white} />
          <View style={localStyles.toastContent}>
            <Text style={localStyles.toastTitle}>{toastTitle}</Text>
            <Text style={localStyles.toastSubtitle}>{toastSubtitle}</Text>
          </View>
        </Animated.View>
      )}

      {/* Raffle Entry Modal - Collects all raffle-specific info */}
      <Modal
        visible={showRaffleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRaffleModal(false)}
      >
        <View style={localStyles.raffleModalOverlay}>
          <View style={localStyles.raffleModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={localStyles.raffleModalHeader}>
                <TouchableOpacity
                  style={localStyles.raffleModalCloseButton}
                  onPress={() => setShowRaffleModal(false)}
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
                        onPress={handleTakePhoto}
                      >
                        <Feather name="camera" size={16} color={colors.primary} />
                        <Text style={localStyles.rafflePhotoActionText}>Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={localStyles.rafflePhotoActionButton}
                        onPress={handleRemovePhoto}
                      >
                        <Feather name="trash-2" size={16} color={colors.error} />
                        <Text style={[localStyles.rafflePhotoActionText, { color: colors.error }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={localStyles.raffleTakePhotoButton}
                    onPress={handleTakePhoto}
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

                <Text style={localStyles.raffleInputLabel}>Name *</Text>
                <View style={localStyles.nameRow}>
                  <TextInput
                    style={[localStyles.raffleInput, localStyles.nameInput]}
                    value={formData.angler.firstName}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      angler: { ...formData.angler, firstName: text },
                    })}
                    placeholder="First"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <TextInput
                    style={[localStyles.raffleInput, localStyles.nameInput]}
                    value={formData.angler.lastName}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      angler: { ...formData.angler, lastName: text },
                    })}
                    placeholder="Last"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <Text style={localStyles.raffleInputLabel}>Email *</Text>
                <TextInput
                  style={localStyles.raffleInput}
                  value={formData.angler.email}
                  onChangeText={(text) => setFormData({
                    ...formData,
                    angler: { ...formData.angler, email: text },
                  })}
                  placeholder="Email address"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={localStyles.raffleInputLabel}>Phone (optional)</Text>
                <TextInput
                  style={localStyles.raffleInput}
                  value={formData.angler.phone}
                  onChangeText={(text) => setFormData({
                    ...formData,
                    angler: { ...formData.angler, phone: formatPhoneNumber(text) },
                  })}
                  placeholder="555-555-5555"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  maxLength={12}
                />
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
                  onPress={() => setShowRaffleModal(false)}
                >
                  <Text style={localStyles.raffleModalSecondaryButtonText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    localStyles.raffleModalButton,
                    localStyles.raffleModalPrimaryButton,
                    (!catchPhoto || !formData.angler.firstName?.trim() || !formData.angler.lastName?.trim() ||
                     !formData.angler.email?.trim()) && localStyles.raffleModalButtonDisabled,
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
                    setEnterRaffle(true);
                    setShowRaffleModal(false);
                    showToast("Rewards Entry Added", "You'll be entered in this quarter's drawing.");
                  }}
                  disabled={!catchPhoto || !formData.angler.firstName?.trim() || !formData.angler.lastName?.trim() ||
                           !formData.angler.email?.trim()}
                >
                  <Feather name="check" size={18} color={colors.white} />
                  <Text style={localStyles.raffleModalPrimaryButtonText}>Submit & Enter</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Local styles for multi-fish UI and count picker
const localStyles = StyleSheet.create({
  // Toast notification styles
  toast: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#28a745",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastContent: {
    flex: 1,
    marginLeft: 12,
  },
  toastTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  toastSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "400",
  },
  // Screen container with primary background for header
  screenContainer: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  // Modern header styles
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.3,
  },
  testModeBadge: {
    backgroundColor: "#ff9800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  testModeBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  // Scroll view with rounded top corners
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollViewContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  // Modal styles
  modalWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalDrawer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  // Reporting type styles
  reportingTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  reportingTypeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  reportingTypeText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  peopleCountSection: {
    marginTop: 4,
  },
  // Count picker styles
  countContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  countButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  countInput: {
    flex: 1,
    height: 44,
    marginHorizontal: 12,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Optional details styles
  optionalToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 8,
  },
  optionalToggleText: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 4,
  },
  optionalSection: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  // Multiple lengths styles
  lengthsContainer: {
    marginBottom: 8,
  },
  lengthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  lengthLabel: {
    width: 32,
    fontSize: 14,
    fontWeight: "600",
    color: colors.darkGray,
  },
  lengthInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  // Helper text style
  helperText: {
    fontSize: 12,
    color: colors.darkGray,
    marginBottom: 8,
    fontStyle: "italic",
  },
  // License toggle styles
  licenseToggleContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  licenseToggleButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
  },
  licenseToggleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  licenseToggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.darkGray,
  },
  licenseToggleTextActive: {
    color: colors.primary,
  },
  // Name row styles
  nameRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 0,
  },
  nameInput: {
    flex: 1,
    marginBottom: 16,
  },
  // Multi-fish list styles
  fishListContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  fishListTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.darkGray,
    marginBottom: 8,
  },
  fishChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    marginBottom: 6,
    overflow: "hidden",
  },
  fishChipActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  fishChipContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  fishChipText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  fishChipRemove: {
    padding: 10,
    paddingLeft: 4,
  },
  addFishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: "rgba(11, 84, 139, 0.05)",
  },
  addFishButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 8,
  },
  // Switch toggle styles
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: colors.darkGray,
    flex: 1,
    marginRight: 12,
  },
  // Raffle section styles
  raffleSection: {
    backgroundColor: "#fff9e6",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#f0c14b",
  },
  raffleSectionEntered: {
    borderColor: colors.success,
    backgroundColor: "#e8f5e9",
  },
  raffleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  raffleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  raffleIconContainerEntered: {
    backgroundColor: colors.success,
  },
  raffleEnteredMessage: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 8,
  },
  raffleEnteredText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  raffleTitleContainer: {
    flex: 1,
  },
  raffleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  raffleSubtitle: {
    fontSize: 13,
    color: colors.darkGray,
    marginTop: 2,
  },
  raffleDescription: {
    fontSize: 14,
    color: colors.darkGray,
    lineHeight: 20,
    marginBottom: 16,
  },
  raffleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  raffleButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  raffleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 8,
  },
  raffleButtonTextSelected: {
    color: colors.white,
  },
  raffleRemoveButton: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  raffleRemoveButtonText: {
    fontSize: 14,
    color: colors.darkGray,
    textDecorationLine: "underline",
  },
  privacyAssurance: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  privacyAssuranceText: {
    flex: 1,
    fontSize: 13,
    color: "#166534",
    lineHeight: 18,
  },
  // Raffle modal styles
  raffleModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  raffleModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: "90%",
    maxHeight: "85%",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  raffleModalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  raffleModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  raffleModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  raffleModalSubtitle: {
    fontSize: 14,
    color: colors.darkGray,
    textAlign: "center",
    marginTop: 4,
  },
  raffleModalText: {
    fontSize: 15,
    color: colors.darkGray,
    marginBottom: 16,
  },
  raffleModalList: {
    marginBottom: 16,
  },
  raffleModalListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  raffleModalListText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  raffleModalNote: {
    fontSize: 13,
    color: colors.darkGray,
    fontStyle: "italic",
    marginBottom: 20,
    textAlign: "center",
  },
  raffleModalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  raffleModalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  raffleModalPrimaryButton: {
    backgroundColor: colors.primary,
  },
  raffleModalSecondaryButton: {
    backgroundColor: colors.lightGray,
  },
  raffleModalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
    marginLeft: 6,
  },
  raffleModalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  raffleModalButtonDisabled: {
    opacity: 0.5,
  },
  raffleModalCloseButton: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 8,
    zIndex: 1,
  },
  raffleModalSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  raffleModalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  raffleModalSectionDesc: {
    fontSize: 14,
    color: colors.darkGray,
    marginBottom: 12,
  },
  rafflePhotoContainer: {
    alignItems: "center",
  },
  rafflePhoto: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
  },
  rafflePhotoActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 16,
  },
  rafflePhotoActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rafflePhotoActionText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
  },
  raffleTakePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    paddingVertical: 24,
    gap: 8,
  },
  raffleTakePhotoText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  raffleInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  raffleInput: {
    backgroundColor: colors.lightGray,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Photo capture styles
  photoContainer: {
    marginTop: 12,
  },
  catchPhoto: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
  },
  photoActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 16,
  },
  photoActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  photoRemoveButton: {
    backgroundColor: "#ffebee",
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 6,
  },
  photoSuccessMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  photoSuccessText: {
    fontSize: 14,
    color: colors.success,
    marginLeft: 8,
    flex: 1,
  },
  takePhotoButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  cameraIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  takePhotoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  takePhotoSubtitle: {
    fontSize: 13,
    color: colors.darkGray,
  },
  // Required field indicator styles
  raffleRequiredNote: {
    fontSize: 13,
    color: colors.primary,
    fontStyle: "italic",
    marginBottom: 12,
  },
  requiredAsterisk: {
    color: "#e53935",
    fontWeight: "600",
  },
  // Inline validation error styles
  inputError: {
    borderColor: "#e53935",
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: "#e53935",
    marginTop: -8,
    marginBottom: 12,
  },
  // Abandonment modal styles
  abandonModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  abandonModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: "85%",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  abandonModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff3e0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  abandonModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  abandonModalText: {
    fontSize: 15,
    color: colors.darkGray,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  abandonModalButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  abandonModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.lightGray,
    alignItems: "center",
  },
  abandonModalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  abandonModalDiscardButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#e53935",
    alignItems: "center",
  },
  abandonModalDiscardText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },
  // Checkbox styles for confirmation options
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    color: colors.darkGray,
    flex: 1,
  },
  // Small save button styles
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    marginTop: 8,
  },
  saveButtonSaved: {
    borderColor: colors.success,
    backgroundColor: "#e8f5e9",
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 6,
  },
  saveButtonTextSaved: {
    color: colors.success,
  },
  // Date picker modal styles
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dateModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  datePickerInline: {
    height: 350,
    width: "100%",
  },
  dateModalConfirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  dateModalConfirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  // Selected option styles for dropdowns
  optionItemSelected: {
    backgroundColor: "#e8f4fc",
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  // Section header with icon styles
  sectionHeaderWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mapIconButton: {
    padding: 10,
    borderRadius: 22,
    backgroundColor: "#e8f4fc",
  },
});

export default ReportFormScreen;