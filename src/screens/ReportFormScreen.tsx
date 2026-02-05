// screens/ReportFormScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Pressable,
  Image,
  Linking,
  Keyboard,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HEADER_HEIGHT } from "../constants/ui";
import { useFloatingHeaderAnimation } from '../hooks/useFloatingHeaderAnimation';
import { useToast } from '../hooks/useToast';
import { RootStackParamList, FishReportData, UserProfile, FishingLicense } from "../types";
import styles from "../styles/reportFormScreenStyles";
import { colors } from "../styles/common";
import WrcIdInfoModal from "../components/WrcIdInfoModal";
import BottomDrawer from "../components/BottomDrawer";

// DMF constants
import { AREA_LABELS, getAreaCodeFromLabel } from "../constants/areaOptions";
import { NON_HOOK_GEAR_LABELS, getGearCodeFromLabel } from "../constants/gearOptions";
import { isTestMode } from "../config/appConfig";

// Rewards context
import { useRewards } from "../contexts/RewardsContext";

// ZIP code lookup
import { useZipCodeLookup } from "../hooks/useZipCodeLookup";

// Extracted types
import { FishEntry, ReportingType, FormState, PickerData, ReportFormScreenProps } from './reportForm/reportForm.types';

// Extracted validation utilities
import { validateEmail, validatePhone, formatPhoneNumber } from '../utils/formValidation';

// Extracted local styles
import { localStyles } from '../styles/reportFormScreenLocalStyles';

// Extracted modal components
import AbandonConfirmModal from './reportForm/AbandonConfirmModal';
import FaqModal from './reportForm/FaqModal';
import AreaInfoModal from './reportForm/AreaInfoModal';
import RaffleEntryModal from './reportForm/RaffleEntryModal';


const ReportFormScreen: React.FC<ReportFormScreenProps> = ({ navigation }) => {
  // Safe area insets for bottom sheet padding on Android
  const insets = useSafeAreaInsets();

  // State for multiple fish entries
  const [fishEntries, setFishEntries] = useState<FishEntry[]>([]);
  const [currentFishIndex, setCurrentFishIndex] = useState<number | null>(null);

  // State for showing optional fish details
  const [showOptionalDetails, setShowOptionalDetails] = useState<boolean>(false);


  // Refs for scrolling
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll animation for floating back button
  const { scrollY, floatingOpacity: floatingBackOpacity, floatingTranslateXLeft: floatingBackTranslateX } = useFloatingHeaderAnimation();

  // Track scroll position for dynamic status bar style
  const [statusBarStyle, setStatusBarStyle] = useState<'light-content' | 'dark-content'>('light-content');
  const statusBarStyleRef = useRef(statusBarStyle);
  statusBarStyleRef.current = statusBarStyle;

  // Keyboard height tracking for scroll-to-center behavior
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const currentScrollY = useRef(0);

  // Track keyboard show/hide for scroll-to-center
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Scroll to center the focused input in the visible area
  const scrollToCenter = useCallback((event: { target: unknown }) => {
    const target = event.target;
    if (!scrollViewRef.current || !target) return;

    // Small delay to ensure keyboard is shown and layout is stable
    setTimeout(() => {
      // Use measureInWindow to get absolute position on screen
      (target as any).measureInWindow(
        (_x: number, y: number, _width: number, height: number) => {
          if (y === undefined) return; // measureInWindow failed

          const windowHeight = Dimensions.get('window').height;
          const headerHeight = 120; // Approximate header height
          const estimatedKeyboardHeight = keyboardHeight || 300;

          // Calculate visible area between header and keyboard
          const visibleTop = headerHeight;
          const visibleBottom = windowHeight - estimatedKeyboardHeight;
          const visibleCenter = (visibleTop + visibleBottom) / 2;

          // Current position of input center on screen
          const inputCenterOnScreen = y + height / 2;

          // How much we need to scroll to center the input
          const scrollAdjustment = inputCenterOnScreen - visibleCenter;
          const targetScrollY = currentScrollY.current + scrollAdjustment;

          scrollViewRef.current?.scrollTo({
            y: Math.max(0, targetScrollY),
            animated: true,
          });
        }
      );
    }, 100);
  }, [keyboardHeight]);

  // Toast notification
  const toast = useToast();

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

  // ZIP code lookup for city/state display feedback
  const zipLookup = useZipCodeLookup(formData.zipCode);

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
        // Use primaryHarvestArea if set, otherwise fall back to preferredAreaLabel from profile
        const primaryArea = primaryAreaData || profile?.preferredAreaLabel || null;

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
              // Load DMF notification preferences from profile
              wantTextConfirmation: profile?.wantTextConfirmation ?? prevData.wantTextConfirmation,
              wantEmailConfirmation: profile?.wantEmailConfirmation ?? prevData.wantEmailConfirmation,
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
            toast.show(
              "Profile Loaded",
              `Your ${loadedItems.join(", ")} ${loadedItems.length === 1 ? "has" : "have"} been added to the report.`
            );
          }

          // Auto-expand contact section if email or phone is pre-filled
          if (profile?.email || profile?.phone) {
            setShowContactSection(true);
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

        // Update profile with angler info and DMF preferences
        const updatedProfile = {
          ...profile,
          firstName: formData.angler.firstName || profile.firstName,
          lastName: formData.angler.lastName || profile.lastName,
          email: formData.angler.email || profile.email,
          phone: formData.angler.phone || profile.phone,
          zipCode: formData.zipCode || profile.zipCode,
          wantTextConfirmation: formData.wantTextConfirmation,
          wantEmailConfirmation: formData.wantEmailConfirmation,
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

  // Auto-save DMF notification preferences to profile
  const saveDMFPreferences = async (
    textPref: boolean,
    emailPref: boolean
  ): Promise<void> => {
    try {
      const existingData = await AsyncStorage.getItem("userProfile");
      const profile = existingData ? JSON.parse(existingData) : {};

      const updatedProfile = {
        ...profile,
        wantTextConfirmation: textPref,
        wantEmailConfirmation: emailPref,
      };

      await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
    } catch (error) {
      console.error("Error saving DMF preferences:", error);
    }
  };

  // Auto-save a single profile field (for fields like zip code)
  const saveProfileField = async (
    fieldName: string,
    value: string
  ): Promise<void> => {
    try {
      const existingData = await AsyncStorage.getItem("userProfile");
      const profile = existingData ? JSON.parse(existingData) : {};

      const updatedProfile = {
        ...profile,
        [fieldName]: value,
      };

      await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
    } catch (error) {
      console.error(`Error saving ${fieldName}:`, error);
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

  // Animation for raffle modal content slide-up
  const raffleModalSlideAnim = useRef(new Animated.Value(0)).current;

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

  // Ref to track if user has confirmed they want to abandon (allows navigation)
  const hasConfirmedAbandon = useRef<boolean>(false);

  // State for WRC ID info modal
  const [showWrcIdInfoModal, setShowWrcIdInfoModal] = useState<boolean>(false);

  // State for Area of Harvest info modal
  const [showAreaInfoModal, setShowAreaInfoModal] = useState<boolean>(false);

  // State for FAQ modal
  const [showFaqModal, setShowFaqModal] = useState<boolean>(false);

  // State for collapsible contact section in Angler Information
  const [showContactSection, setShowContactSection] = useState<boolean>(false);
  const contactSectionAnim = useRef(new Animated.Value(0)).current;

  // Toggle contact section with animation
  const toggleContactSection = () => {
    const toValue = showContactSection ? 0 : 1;
    setShowContactSection(!showContactSection);
    Animated.timing(contactSectionAnim, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Animate raffle modal content slide-up when modal opens
  useEffect(() => {
    if (showRaffleModal) {
      // Reset to starting position (off-screen below)
      raffleModalSlideAnim.setValue(0);
      // Animate to final position
      Animated.spring(raffleModalSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [showRaffleModal, raffleModalSlideAnim]);

  // State for raffle modal inline validation
  const [raffleValidationErrors, setRaffleValidationErrors] = useState<{
    email?: string;
    phone?: string;
  }>({});

  // Animation refs for auto-toggle checkboxes
  const emailCheckboxAnim = useRef(new Animated.Value(1)).current;
  const phoneCheckboxAnim = useRef(new Animated.Value(1)).current;
  const licenseCheckboxAnim = useRef(new Animated.Value(1)).current;
  const profileSaveAnim = useRef(new Animated.Value(1)).current;
  const primaryAreaCheckboxAnim = useRef(new Animated.Value(1)).current;

  // Track if email/phone checkboxes were just auto-toggled to prevent re-animating
  const emailAutoToggled = useRef(false);
  const phoneAutoToggled = useRef(false);

  // Pulse animation for auto-toggled checkboxes
  const pulseCheckbox = (animValue: Animated.Value) => {
    // Brief delay so user sees the toggle happen
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);
  };

  // Email validation helper

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
  const [isPickerMounted, setIsPickerMounted] = useState<boolean>(false);
  const [datePickerKey, setDatePickerKey] = useState<number>(0);
  const [tempDate, setTempDate] = useState<Date>(new Date());
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
  };

  // Function to close modal - BottomDrawer handles animations
  const closePicker = (): void => {
    setModalVisible(false);
  };

  // Function to handle selection in modal
  const handleSelection = (item: string): void => {
    setFormData({ ...formData, [currentPicker]: item });
    closePicker();

    // Auto-toggle "Save as primary area" when selecting a new waterbody
    if (currentPicker === "waterbody" && item !== initialLoadedValues.waterbody && !saveAsPrimaryArea && !hasSavedPrimaryArea) {
      setSaveAsPrimaryArea(true);
      pulseCheckbox(primaryAreaCheckboxAnim);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date): void => {
    if (Platform.OS === 'android') {
      // Android native picker: close modal and apply date if OK was pressed
      if (event.type === 'set' && selectedDate) {
        setFormData({ ...formData, date: selectedDate });
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
  const confirmDateSelection = (): void => {
    setFormData({ ...formData, date: tempDate });
    closeDatePicker();
  };

  // Close date picker with delayed unmount to prevent flash
  const closeDatePicker = (): void => {
    setShowDatePicker(false);
    // Delay unmounting the picker until after modal fade animation
    setTimeout(() => setIsPickerMounted(false), 300);
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
  // Sanitizes input to only allow numbers and one decimal point
  const updateLength = (index: number, value: string): void => {
    // Remove any character that's not a digit or decimal point
    let sanitized = value.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const decimalCount = (sanitized.match(/\./g) || []).length;
    if (decimalCount > 1) {
      // Keep only the first decimal point
      const firstDecimalIndex = sanitized.indexOf('.');
      sanitized = sanitized.slice(0, firstDecimalIndex + 1) +
                  sanitized.slice(firstDecimalIndex + 1).replace(/\./g, '');
    }

    const newLengths = [...formData.lengths];
    newLengths[index] = sanitized;
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

  // Ref to hold the latest hasFormData check (for beforeRemove listener)
  const hasFormDataRef = useRef<() => boolean>(() => false);

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

  // Keep the ref updated with the latest hasFormData function
  hasFormDataRef.current = hasFormData;

  // Intercept back navigation (including swipe gesture) to show abandonment modal
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If user has confirmed abandon, allow navigation
      if (hasConfirmedAbandon.current) {
        hasConfirmedAbandon.current = false; // Reset for next time
        return;
      }

      // Check if there's form data to protect
      if (!hasFormDataRef.current()) {
        // No form data, allow navigation
        return;
      }

      // Prevent default behavior (leaving the screen)
      e.preventDefault();

      // Show the abandonment modal
      setShowAbandonModal(true);
    });

    return unsubscribe;
  }, [navigation]);

  // Disable swipe gesture when there's form data to protect
  // This prevents the visual "swipe out" animation from starting before we can show the modal
  useEffect(() => {
    const hasData = hasFormDataRef.current();
    navigation.setOptions({
      gestureEnabled: !hasData,
    });
  }, [
    navigation,
    formData.reportingType,
    formData.species,
    formData.waterbody,
    formData.usedHookAndLine,
    formData.gearType,
    formData.angler.firstName,
    formData.angler.lastName,
    formData.angler.email,
    formData.angler.phone,
    formData.wrcId,
    formData.zipCode,
    fishEntries.length,
    catchPhoto,
    enterRaffle,
    initialLoadedValues,
  ]);

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
        toast.show("Photo Captured", "Your catch photo has been saved");
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
                toast.show("Photo Selected", "Photo selected for testing (camera required in production)");
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

    // Auto-save user preferences if toggles are enabled
    // This ensures data persists even if user didn't explicitly tap save buttons
    const saveUserPreferences = async () => {
      try {
        // Save primary area of harvest
        if (saveAsPrimaryArea && formData.waterbody) {
          await AsyncStorage.setItem("primaryHarvestArea", formData.waterbody);
        }

        // Save angler info to profile
        if (saveAnglerInfo) {
          const existingData = await AsyncStorage.getItem("userProfile");
          const profile = existingData ? JSON.parse(existingData) : {};
          const updatedProfile = {
            ...profile,
            firstName: formData.angler.firstName || profile.firstName,
            lastName: formData.angler.lastName || profile.lastName,
            email: formData.angler.email || profile.email,
            phone: formData.angler.phone || profile.phone,
            zipCode: formData.zipCode || profile.zipCode,
          };
          await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
        }

        // Save WRC ID to license and profile
        if (saveLicenseNumber && formData.wrcId) {
          // Save to license
          const licenseData = await AsyncStorage.getItem("fishingLicense");
          const license: FishingLicense = licenseData ? JSON.parse(licenseData) : {};
          const updatedLicense: FishingLicense = {
            ...license,
            licenseNumber: formData.wrcId,
            firstName: license.firstName || formData.angler.firstName,
            lastName: license.lastName || formData.angler.lastName,
          };
          await AsyncStorage.setItem("fishingLicense", JSON.stringify(updatedLicense));

          // Also save WRC ID to profile
          const profileData = await AsyncStorage.getItem("userProfile");
          const profile = profileData ? JSON.parse(profileData) : {};
          const updatedProfile = {
            ...profile,
            wrcId: formData.wrcId,
            hasLicense: true,
          };
          await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
        }
      } catch (error) {
        console.error("Error saving user preferences:", error);
        // Don't block form submission on save failure
      }
    };

    // Save preferences before navigating (fire and forget)
    saveUserPreferences();

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
    <BottomDrawer
      visible={modalVisible}
      onClose={closePicker}
      maxHeight="80%"
    >
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
            <Pressable
              style={({ pressed }) => [
                styles.optionItem,
                isSelected && localStyles.optionItemSelected,
                pressed && { opacity: 0.7 }
              ]}
              onPress={() => handleSelection(item)}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            >
              <Text style={[
                styles.optionText,
                isSelected && localStyles.optionTextSelected
              ]}>{item}</Text>
              {isSelected && (
                <Feather name="check" size={20} color={colors.primary} />
              )}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 34 }}
        scrollEnabled={pickerData[currentPicker as keyof PickerData]?.length > 8}
        removeClippedSubviews={false}
      />
    </BottomDrawer>
  );

  // Render the abandonment confirmation modal


  // Render the input field for picker-style data
  const renderPickerField = (
    label: string,
    field: keyof PickerData,
    required: boolean = false
  ): React.ReactNode => (
    <View>
      <Text style={styles.label}>
        {label} {required && <Text style={localStyles.requiredAsterisk}>*</Text>}
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
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarStyle === 'light-content' ? colors.primary : colors.background} translucent animated />

      {/* Fixed Header - sits behind the scrolling content */}
      <View style={localStyles.fixedHeader}>
        <View style={localStyles.headerContent}>
          <TouchableOpacity
            style={localStyles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>

          <View style={localStyles.headerTextContainer}>
            <Text style={localStyles.headerTitle}>Report Catch</Text>
            <Text style={localStyles.headerSubtitle}>NC Mandatory Harvest Report</Text>
          </View>

          {/* TEST MODE badge - shows when not submitting to real DMF */}
          {isTestMode() && (
            <View style={localStyles.testModeBadge}>
              <Text style={localStyles.testModeBadgeText}>TEST</Text>
            </View>
          )}

          {/* FAQ Button */}
          <TouchableOpacity
            style={localStyles.faqButton}
            onPress={() => setShowFaqModal(true)}
            activeOpacity={0.7}
          >
            <Feather name="help-circle" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating back button - appears when scrolling */}
      <Animated.View
        style={[
          localStyles.floatingBackButton,
          {
            opacity: floatingBackOpacity,
            transform: [{
              translateX: floatingBackTranslateX,
            }]
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBackPress}
          style={localStyles.floatingBackTouchable}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.white} />
        </TouchableOpacity>
      </Animated.View>

      {/* Scrollable content - slides over the header */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={localStyles.scrollView}
        contentContainerStyle={localStyles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (e: any) => {
              currentScrollY.current = e.nativeEvent.contentOffset.y;

              // Calculate threshold where light content covers the status bar area
              const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 50;
              const headerSpacerHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 100 : 130;
              const threshold = headerSpacerHeight - statusBarHeight - 24; // 24px buffer for rounded corners

              const scrollPosition = e.nativeEvent.contentOffset.y;
              const newStyle = scrollPosition > threshold ? 'dark-content' : 'light-content';
              if (newStyle !== statusBarStyleRef.current) {
                setStatusBarStyle(newStyle);
              }
            }
          }
        )}
        scrollEventThrottle={16}
      >
        {/* Header spacer - transparent area that lets header show through */}
        <View style={localStyles.headerSpacerArea}>
          <View style={localStyles.spacerButtonsRow}>
            <TouchableOpacity
              onPress={handleBackPress}
              style={localStyles.spacerBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={{ width: 40, height: 40 }} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Spacer for TEST badge if visible */}
            {isTestMode() && <View style={{ width: 50 }} />}

            {/* FAQ button touchable area in spacer */}
            <TouchableOpacity
              onPress={() => setShowFaqModal(true)}
              style={localStyles.spacerFaqButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={{ width: 40, height: 40 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content container - the light blue card that slides over */}
        <View style={localStyles.contentContainer}>
      {renderSelectionModal()}
      <AbandonConfirmModal
        visible={showAbandonModal}
        onKeepEditing={() => setShowAbandonModal(false)}
        onDiscard={() => {
          setShowAbandonModal(false);
          hasConfirmedAbandon.current = true;
          navigation.goBack();
        }}
      />
      <WrcIdInfoModal visible={showWrcIdInfoModal} onClose={() => setShowWrcIdInfoModal(false)} />

      <FaqModal visible={showFaqModal} onClose={() => setShowFaqModal(false)} />

      <AreaInfoModal visible={showAreaInfoModal} onClose={() => setShowAreaInfoModal(false)} />

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
            <Text style={styles.label}>How many total people are you reporting for? <Text style={localStyles.requiredAsterisk}>*</Text></Text>
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
                onFocus={scrollToCenter}
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
            <Text style={styles.label}>Number Harvested <Text style={localStyles.requiredAsterisk}>*</Text></Text>
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
                onFocus={scrollToCenter}
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
                    onFocus={scrollToCenter}
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
                          onFocus={scrollToCenter}
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
                  onFocus={scrollToCenter}
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
            {fishEntries.map((fish, index) => {
              const isSelected = currentFishIndex === index;
              return (
                <View
                  key={`fish-${index}-${isSelected ? 'active' : 'inactive'}`}
                  style={[
                    localStyles.fishChip,
                    isSelected && localStyles.fishChipActive,
                  ]}
                >
                  <TouchableOpacity
                    style={localStyles.fishChipContent}
                    onPress={() => handleSelectFish(index)}
                  >
                    <Text
                      style={isSelected ? localStyles.fishChipTextActive : localStyles.fishChipText}
                    >
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
              );
            })}
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

        {/* CatchFeed photo option - only show for signed-in rewards members */}
        {hasEnteredCurrentRaffle && (formData.species || fishEntries.length > 0) && (
          <View style={localStyles.catchFeedPhotoSection}>
            <Text style={localStyles.catchFeedPhotoLabel}>
              <Feather name="camera" size={14} color={colors.primary} /> Add Photo for Catch Feed
            </Text>
            <Text style={localStyles.catchFeedPhotoDesc}>
              Share your catch with the community (optional)
            </Text>

            {catchPhoto ? (
              <View style={localStyles.catchFeedPhotoContainer}>
                <Image
                  source={{ uri: catchPhoto }}
                  style={localStyles.catchFeedPhoto}
                  resizeMode="cover"
                />
                <View style={localStyles.catchFeedPhotoActions}>
                  <TouchableOpacity
                    style={localStyles.catchFeedPhotoActionButton}
                    onPress={handleTakePhoto}
                  >
                    <Feather name="camera" size={16} color={colors.primary} />
                    <Text style={localStyles.catchFeedPhotoActionText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={localStyles.catchFeedPhotoActionButton}
                    onPress={handleRemovePhoto}
                  >
                    <Feather name="trash-2" size={16} color={colors.error} />
                    <Text style={[localStyles.catchFeedPhotoActionText, { color: colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={localStyles.catchFeedAddPhotoButton}
                onPress={handleTakePhoto}
              >
                <Feather name="camera" size={20} color={colors.primary} />
                <Text style={localStyles.catchFeedAddPhotoText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      )}


      {/* Only show Harvest Details after fish info is complete (species selected or fish entries exist) */}
      {formData.reportingType && (formData.species || fishEntries.length > 0) && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Harvest Details</Text>

        <View style={localStyles.labelRow}>
          <Text style={styles.label}>Area of Harvest <Text style={localStyles.requiredAsterisk}>*</Text></Text>
          <TouchableOpacity
            onPress={() => setShowAreaInfoModal(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="info" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => openPicker("waterbody", "Area of Harvest")}
        >
          <Text
            style={
              formData.waterbody
                ? styles.selectorText
                : styles.selectorPlaceholder
            }
          >
            {String(formData.waterbody || "Select area of harvest")}
          </Text>
          <Text style={styles.selectorArrow}>▼</Text>
        </TouchableOpacity>

        {/* Save as primary area checkbox - only show after area is selected */}
        {formData.waterbody && (
          <TouchableOpacity
            style={localStyles.checkboxRow}
            onPress={() => handlePrimaryAreaToggle(!saveAsPrimaryArea)}
            activeOpacity={0.7}
          >
            <Animated.View style={[
              localStyles.checkbox,
              saveAsPrimaryArea && localStyles.checkboxChecked,
              { transform: [{ scale: primaryAreaCheckboxAnim }] }
            ]}>
              {saveAsPrimaryArea && (
                <Feather name="check" size={14} color={colors.white} />
              )}
            </Animated.View>
            <Text style={localStyles.checkboxLabel}>
              {hasSavedPrimaryArea && saveAsPrimaryArea
                ? "Saved as my primary area"
                : "Save as my primary area for next time"}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Date of Harvest <Text style={localStyles.requiredAsterisk}>*</Text></Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => {
            // Initialize tempDate with current formData.date
            setTempDate(formData.date);
            setDatePickerKey(prev => prev + 1);
            setIsPickerMounted(true);
            setShowDatePicker(true);
          }}
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
          onRequestClose={closeDatePicker}
        >
          <View style={localStyles.dateModalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeDatePicker}
            />
            <View style={localStyles.dateModalContent}>
              <View style={localStyles.dateModalHeader}>
                <Text style={localStyles.dateModalTitle}>Select Date</Text>
                <TouchableOpacity onPress={closeDatePicker}>
                  <Feather name="x" size={24} color={colors.darkGray} />
                </TouchableOpacity>
              </View>
              {isPickerMounted && (
                <DateTimePicker
                  key={`report-date-picker-${datePickerKey}`}
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  themeVariant="light"
                  style={Platform.OS === 'ios' ? { height: 216, width: '100%' } : undefined}
                />
              )}
              <TouchableOpacity
                style={localStyles.dateModalConfirmButton}
                onPress={confirmDateSelection}
              >
                <Text style={localStyles.dateModalConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Hook & Line Selection */}
        <Text style={styles.label}>Did you use Hook & Line? <Text style={localStyles.requiredAsterisk}>*</Text></Text>
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
        <Text style={styles.label}>Do you have a NC Fishing License? <Text style={localStyles.requiredAsterisk}>*</Text></Text>
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
            <View style={localStyles.labelRow}>
              <Text style={styles.label}>WRC ID / Customer ID <Text style={localStyles.requiredAsterisk}>*</Text></Text>
              <TouchableOpacity
                onPress={() => setShowWrcIdInfoModal(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="info" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.input,
                validationErrors.wrcId && localStyles.inputError,
              ]}
              value={formData.wrcId}
              onChangeText={(text) => {
                clearValidationError("wrcId");
                const wasEmpty = !formData.wrcId?.trim();
                const isNew = text.trim() !== "" && text !== initialLoadedValues.wrcId;
                const shouldAutoToggle = isNew && wasEmpty && !saveLicenseNumber && !hasSavedLicenseNumber;

                setFormData({
                  ...formData,
                  wrcId: text,
                });

                // Auto-toggle save checkbox when entering new WRC ID
                if (shouldAutoToggle) {
                  setSaveLicenseNumber(true);
                  pulseCheckbox(licenseCheckboxAnim);
                }

                // Reset the save toggle if user changes the value after saving
                if (hasSavedLicenseNumber && text !== initialLoadedValues.wrcId) {
                  setHasSavedLicenseNumber(false);
                  setSaveLicenseNumber(false);
                }

                // Auto-expand contact section when required field (WRC ID) is filled
                if (text.trim() && !showContactSection) {
                  setShowContactSection(true);
                }
              }}
              placeholder="Enter your WRC ID or Customer ID"
              autoCapitalize="characters"
              onFocus={scrollToCenter}
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
                <Animated.View style={[
                  localStyles.checkbox,
                  saveLicenseNumber && localStyles.checkboxChecked,
                  { transform: [{ scale: licenseCheckboxAnim }] }
                ]}>
                  {saveLicenseNumber && (
                    <Feather name="check" size={14} color={colors.white} />
                  )}
                </Animated.View>
                <Text style={localStyles.checkboxLabel}>
                  {hasSavedLicenseNumber && saveLicenseNumber
                    ? "Saved to My License"
                    : "Save to My License for next time"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Name and ZIP for licensed anglers (same as DMF form) */}
            <Text style={[styles.label, { marginTop: 16 }]}>Name</Text>
            <View style={localStyles.nameRow}>
              <TextInput
                style={[styles.input, localStyles.nameInput]}
                value={formData.angler.firstName}
                onChangeText={(text) => {
                  const wasEmpty = !formData.angler.firstName?.trim();
                  const isNew = text.trim() !== "" && text !== initialLoadedValues.firstName;
                  const shouldAutoToggleSave = isNew && wasEmpty && !saveAnglerInfo;

                  setFormData({
                    ...formData,
                    angler: { ...formData.angler, firstName: text },
                  });

                  if (shouldAutoToggleSave) {
                    setSaveAnglerInfo(true);
                    pulseCheckbox(profileSaveAnim);
                  }
                }}
                placeholder="First"
                onFocus={scrollToCenter}
              />
              <TextInput
                style={[styles.input, localStyles.nameInput]}
                value={formData.angler.lastName}
                onChangeText={(text) => {
                  const wasEmpty = !formData.angler.lastName?.trim();
                  const isNew = text.trim() !== "" && text !== initialLoadedValues.lastName;
                  const shouldAutoToggleSave = isNew && wasEmpty && !saveAnglerInfo;

                  setFormData({
                    ...formData,
                    angler: { ...formData.angler, lastName: text },
                  });

                  if (shouldAutoToggleSave) {
                    setSaveAnglerInfo(true);
                    pulseCheckbox(profileSaveAnim);
                  }
                }}
                placeholder="Last"
                onFocus={scrollToCenter}
              />
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>ZIP Code</Text>
            <View style={localStyles.zipInputRow}>
              <TextInput
                style={[styles.input, localStyles.zipInput]}
                value={formData.zipCode}
                onChangeText={(text) => {
                  const cleanedZip = text.replace(/\D/g, '').slice(0, 5);
                  setFormData({
                    ...formData,
                    zipCode: cleanedZip,
                  });
                  // Auto-save when complete 5-digit zip is entered
                  if (cleanedZip.length === 5 && cleanedZip !== initialLoadedValues.zipCode) {
                    saveProfileField('zipCode', cleanedZip);
                  }
                }}
                placeholder="12345"
                keyboardType="number-pad"
                maxLength={5}
                onFocus={scrollToCenter}
              />
              {/* ZIP code lookup feedback */}
              {formData.zipCode?.length === 5 && (
                <View style={localStyles.zipFeedback}>
                  {zipLookup.isLoading && (
                    <Text style={localStyles.zipFeedbackLoading}>Checking...</Text>
                  )}
                  {zipLookup.result && !zipLookup.isLoading && (
                    <View style={localStyles.zipFeedbackSuccess}>
                      <Feather name="check-circle" size={14} color="#28a745" />
                      <Text style={localStyles.zipFeedbackSuccessText}>
                        {zipLookup.result.city}, {zipLookup.result.stateAbbr}
                      </Text>
                    </View>
                  )}
                  {zipLookup.error && !zipLookup.isLoading && (
                    <View style={localStyles.zipFeedbackWarning}>
                      <Feather name="alert-circle" size={14} color="#ff9800" />
                      <Text style={localStyles.zipFeedbackWarningText}>{zipLookup.error}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {formData.hasLicense === false && (
          <>
            <Text style={styles.label}>Name <Text style={localStyles.requiredAsterisk}>*</Text></Text>
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
                  const wasEmpty = !formData.angler.firstName?.trim();
                  const isNew = text.trim() !== "" && text !== initialLoadedValues.firstName;
                  const shouldAutoToggleSave = isNew && wasEmpty && !saveAnglerInfo;

                  setFormData({
                    ...formData,
                    angler: { ...formData.angler, firstName: text },
                  });

                  if (shouldAutoToggleSave) {
                    setSaveAnglerInfo(true);
                    pulseCheckbox(profileSaveAnim);
                  }

                  // Auto-expand contact section when all required fields are filled (unlicensed)
                  const hasRequiredFields = text.trim() &&
                                            formData.angler.lastName?.trim() &&
                                            formData.zipCode?.length === 5;
                  if (hasRequiredFields && !showContactSection) {
                    setShowContactSection(true);
                  }
                }}
                placeholder="First"
                onFocus={scrollToCenter}
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
                  const wasEmpty = !formData.angler.lastName?.trim();
                  const isNew = text.trim() !== "" && text !== initialLoadedValues.lastName;
                  const shouldAutoToggleSave = isNew && wasEmpty && !saveAnglerInfo;

                  setFormData({
                    ...formData,
                    angler: { ...formData.angler, lastName: text },
                  });

                  if (shouldAutoToggleSave) {
                    setSaveAnglerInfo(true);
                    pulseCheckbox(profileSaveAnim);
                  }

                  // Auto-expand contact section when all required fields are filled (unlicensed)
                  const hasRequiredFields = formData.angler.firstName?.trim() &&
                                            text.trim() &&
                                            formData.zipCode?.length === 5;
                  if (hasRequiredFields && !showContactSection) {
                    setShowContactSection(true);
                  }
                }}
                placeholder="Last"
                onFocus={scrollToCenter}
              />
            </View>
            {(validationErrors.firstName || validationErrors.lastName) && (
              <Text style={localStyles.errorText}>
                {validationErrors.firstName || validationErrors.lastName}
              </Text>
            )}

            <Text style={styles.label}>ZIP Code <Text style={localStyles.requiredAsterisk}>*</Text></Text>
            <View style={localStyles.zipInputRow}>
              <TextInput
                style={[
                  styles.input,
                  localStyles.zipInput,
                  validationErrors.zipCode && localStyles.inputError,
                ]}
                value={formData.zipCode}
                onChangeText={(text) => {
                  clearValidationError("zipCode");
                  const cleanedZip = text.replace(/\D/g, '').slice(0, 5);
                  setFormData({
                    ...formData,
                    zipCode: cleanedZip,
                  });

                  // Auto-save when complete 5-digit zip is entered
                  if (cleanedZip.length === 5 && cleanedZip !== initialLoadedValues.zipCode) {
                    saveProfileField('zipCode', cleanedZip);
                  }

                  // Auto-expand contact section when all required fields are filled (unlicensed)
                  const hasRequiredFields = formData.angler.firstName?.trim() &&
                                            formData.angler.lastName?.trim() &&
                                            cleanedZip.length === 5;
                  if (hasRequiredFields && !showContactSection) {
                    setShowContactSection(true);
                  }
                }}
                placeholder="12345"
                keyboardType="number-pad"
                maxLength={5}
                onFocus={scrollToCenter}
              />
              {/* ZIP code lookup feedback */}
              {formData.zipCode?.length === 5 && !validationErrors.zipCode && (
                <View style={localStyles.zipFeedback}>
                  {zipLookup.isLoading && (
                    <Text style={localStyles.zipFeedbackLoading}>Checking...</Text>
                  )}
                  {zipLookup.result && !zipLookup.isLoading && (
                    <View style={localStyles.zipFeedbackSuccess}>
                      <Feather name="check-circle" size={14} color="#28a745" />
                      <Text style={localStyles.zipFeedbackSuccessText}>
                        {zipLookup.result.city}, {zipLookup.result.stateAbbr}
                      </Text>
                    </View>
                  )}
                  {zipLookup.error && !zipLookup.isLoading && (
                    <View style={localStyles.zipFeedbackWarning}>
                      <Feather name="alert-circle" size={14} color="#ff9800" />
                      <Text style={localStyles.zipFeedbackWarningText}>{zipLookup.error}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            {validationErrors.zipCode && (
              <Text style={localStyles.errorText}>{validationErrors.zipCode}</Text>
            )}
          </>
        )}

        {/* Collapsible contact section for DMF confirmations */}
        <TouchableOpacity
          style={localStyles.contactSectionToggle}
          onPress={toggleContactSection}
          activeOpacity={0.7}
        >
          <View style={localStyles.contactSectionToggleLeft}>
            <Feather name="mail" size={18} color={colors.primary} />
            <Text style={localStyles.contactSectionToggleText}>
              Get Confirmation
            </Text>
          </View>
          <Feather
            name={showContactSection ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Expandable contact fields */}
        {showContactSection && (
          <View style={localStyles.contactSectionContent}>
            <Text style={localStyles.contactSectionHint}>
              Receive confirmation from NC DMF via email or text (optional)
            </Text>

            <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
            <TextInput
              style={[styles.input, validationErrors.email && localStyles.inputError]}
              value={formData.angler.email}
              onChangeText={(text) => {
                clearValidationError("email");
                // Auto-select email confirmation when user enters email
                const hasEmail = text.trim().length > 0;
                const wasEmpty = !formData.angler.email?.trim();
                const shouldAutoToggleEmail = hasEmail && wasEmpty && !formData.wantEmailConfirmation;
                const isNewEmail = text.trim() !== "" && text !== initialLoadedValues.email;
                const shouldAutoToggleSave = isNewEmail && !saveAnglerInfo;

                const newEmailPref = hasEmail ? true : formData.wantEmailConfirmation;
                setFormData({
                  ...formData,
                  angler: { ...formData.angler, email: text },
                  wantEmailConfirmation: newEmailPref,
                });

                // Trigger animation and auto-save when auto-toggling email confirmation
                if (shouldAutoToggleEmail) {
                  pulseCheckbox(emailCheckboxAnim);
                  saveDMFPreferences(formData.wantTextConfirmation, true);
                }

                // Auto-toggle Save to Profile when entering new email
                if (shouldAutoToggleSave) {
                  setSaveAnglerInfo(true);
                  pulseCheckbox(profileSaveAnim);
                }
              }}
              placeholder="Your email"
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={scrollToCenter}
              onBlur={() => {
                const error = validateEmail(formData.angler.email || "");
                setValidationErrors(prev => ({ ...prev, email: error }));
              }}
            />
            {validationErrors.email && (
              <Text style={localStyles.errorText}>{validationErrors.email}</Text>
            )}

            {/* Email confirmation checkbox - DMF will send email confirmation */}
            {formData.angler.email && (
              <TouchableOpacity
                style={localStyles.checkboxRow}
                onPress={() => {
                  const newEmailPref = !formData.wantEmailConfirmation;
                  setFormData({ ...formData, wantEmailConfirmation: newEmailPref });
                  saveDMFPreferences(formData.wantTextConfirmation, newEmailPref);
                }}
                activeOpacity={0.7}
              >
                <Animated.View style={[
                  localStyles.checkbox,
                  formData.wantEmailConfirmation && localStyles.checkboxChecked,
                  { transform: [{ scale: emailCheckboxAnim }] }
                ]}>
                  {formData.wantEmailConfirmation && (
                    <Feather name="check" size={14} color={colors.white} />
                  )}
                </Animated.View>
                <Text style={localStyles.checkboxLabel}>Send email confirmation from NC DMF</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>Mobile Phone</Text>
            <Text style={localStyles.phoneDisclaimer}>
              Entering your number indicates that you agree to receiving a confirmation SMS text from NC Department of Environmental Quality. Data rates may apply.
            </Text>
            <TextInput
              style={[styles.input, validationErrors.phone && localStyles.inputError]}
              value={formData.angler.phone}
              onChangeText={(text) => {
                clearValidationError("phone");
                const formattedPhone = formatPhoneNumber(text);
                // Auto-select text confirmation when user enters phone
                const hasPhone = formattedPhone.trim().length > 0;
                const wasEmpty = !formData.angler.phone?.trim();
                const shouldAutoTogglePhone = hasPhone && wasEmpty && !formData.wantTextConfirmation;
                const isNewPhone = formattedPhone.trim() !== "" && formattedPhone !== initialLoadedValues.phone;
                const shouldAutoToggleSave = isNewPhone && !saveAnglerInfo;

                const newTextPref = hasPhone ? true : formData.wantTextConfirmation;
                setFormData({
                  ...formData,
                  angler: { ...formData.angler, phone: formattedPhone },
                  wantTextConfirmation: newTextPref,
                });

                // Trigger animation and auto-save when auto-toggling phone confirmation
                if (shouldAutoTogglePhone) {
                  pulseCheckbox(phoneCheckboxAnim);
                  saveDMFPreferences(true, formData.wantEmailConfirmation);
                }

                // Auto-toggle Save to Profile when entering new phone
                if (shouldAutoToggleSave) {
                  setSaveAnglerInfo(true);
                  pulseCheckbox(profileSaveAnim);
                }
              }}
              placeholder="555-555-5555"
              keyboardType="phone-pad"
              maxLength={12}
              onFocus={scrollToCenter}
              onBlur={() => {
                const error = validatePhone(formData.angler.phone || "");
                setValidationErrors(prev => ({ ...prev, phone: error }));
              }}
            />
            {validationErrors.phone && (
              <Text style={localStyles.errorText}>{validationErrors.phone}</Text>
            )}

            {/* Text confirmation checkbox - DMF will send text confirmation */}
            {formData.angler.phone && (
              <TouchableOpacity
                style={localStyles.checkboxRow}
                onPress={() => {
                  const newTextPref = !formData.wantTextConfirmation;
                  setFormData({ ...formData, wantTextConfirmation: newTextPref });
                  saveDMFPreferences(newTextPref, formData.wantEmailConfirmation);
                }}
                activeOpacity={0.7}
              >
                <Animated.View style={[
                  localStyles.checkbox,
                  formData.wantTextConfirmation && localStyles.checkboxChecked,
                  { transform: [{ scale: phoneCheckboxAnim }] }
                ]}>
                  {formData.wantTextConfirmation && (
                    <Feather name="check" size={14} color={colors.white} />
                  )}
                </Animated.View>
                <Text style={localStyles.checkboxLabel}>Send text confirmation from NC DMF</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Save angler info toggle - only show if user entered NEW info (different from pre-loaded) */}
        {((formData.angler.firstName && formData.angler.firstName !== initialLoadedValues.firstName) ||
          (formData.angler.lastName && formData.angler.lastName !== initialLoadedValues.lastName) ||
          (formData.angler.email && formData.angler.email !== initialLoadedValues.email) ||
          (formData.angler.phone && formData.angler.phone !== initialLoadedValues.phone)) && (
          <Animated.View style={{ transform: [{ scale: profileSaveAnim }] }}>
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
          </Animated.View>
        )}
      </View>
      )}

      {/* Only show Raffle and Submit after all required sections are visible */}
      {formData.reportingType && (formData.species || fishEntries.length > 0) && formData.waterbody && (formData.usedHookAndLine || formData.gearType) && (
      <>
      {/* Raffle Entry Section */}
      <View style={[
        localStyles.raffleSection,
        (hasEnteredCurrentRaffle || enterRaffle) && localStyles.raffleSectionEntered,
      ]}>
        <View style={localStyles.raffleSectionHeader}>
          <View style={[
            localStyles.raffleIconContainer,
            (hasEnteredCurrentRaffle || enterRaffle) && localStyles.raffleIconContainerEntered,
          ]}>
            <Feather
              name={(hasEnteredCurrentRaffle || enterRaffle) ? "check-circle" : "gift"}
              size={24}
              color={(hasEnteredCurrentRaffle || enterRaffle) ? colors.white : colors.primary}
            />
          </View>
          <View style={localStyles.raffleTitleContainer}>
            <Text style={localStyles.raffleTitle}>{currentRewards.name}</Text>
            <Text style={localStyles.raffleSubtitle}>
              {(hasEnteredCurrentRaffle || enterRaffle)
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
                    toast.show("Rewards Entry Removed", "You can re-join anytime before submitting.");
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

      <Text style={styles.requiredFields}><Text style={localStyles.requiredAsterisk}>*</Text> Required fields</Text>
      </>
      )}
        </View>
      </Animated.ScrollView>

      {/* Toast Notification */}
      {toast.visible && (
        <Animated.View
          style={[
            localStyles.toast,
            { transform: [{ translateY: toast.animValue }] },
          ]}
        >
          <Feather name="check-circle" size={24} color={colors.white} />
          <View style={localStyles.toastContent}>
            <Text style={localStyles.toastTitle}>{toast.title}</Text>
            <Text style={localStyles.toastSubtitle}>{toast.subtitle}</Text>
          </View>
        </Animated.View>
      )}

      <RaffleEntryModal
        visible={showRaffleModal}
        onClose={() => setShowRaffleModal(false)}
        raffleModalSlideAnim={raffleModalSlideAnim}
        currentRewards={currentRewards}
        catchPhoto={catchPhoto}
        formData={formData}
        raffleValidationErrors={raffleValidationErrors}
        onSetFormData={setFormData}
        onSetRaffleValidationErrors={setRaffleValidationErrors}
        onTakePhoto={handleTakePhoto}
        onRemovePhoto={handleRemovePhoto}
        onSubmitRaffle={() => {
          setEnterRaffle(true);
          setShowRaffleModal(false);
          toast.show("Rewards Entry Added", "You'll be entered in this quarter's drawing.");
        }}
      />
    </View>
  );
};

export default ReportFormScreen;