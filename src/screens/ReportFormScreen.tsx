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
  Easing,
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
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList, FishReportData, UserProfile, FishingLicense } from "../types";
import styles from "../styles/reportFormScreenStyles";
import { colors } from "../styles/common";
import WrcIdInfoModal from "../components/WrcIdInfoModal";

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
  // Safe area insets for bottom sheet padding on Android
  const insets = useSafeAreaInsets();

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

  // Scroll animation for floating back button
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_HEIGHT = 100;

  // Floating back button animation - appears as user scrolls
  const floatingBackOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.5, HEADER_HEIGHT],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

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

        // Update profile with angler info
        const updatedProfile = {
          ...profile,
          firstName: formData.angler.firstName || profile.firstName,
          lastName: formData.angler.lastName || profile.lastName,
          email: formData.angler.email || profile.email,
          phone: formData.angler.phone || profile.phone,
          zipCode: formData.zipCode || profile.zipCode,
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
  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return undefined; // Don't show error for empty (will be caught on submit)

    const trimmedEmail = email.trim().toLowerCase();

    // More robust email regex:
    // - Local part: letters, numbers, dots, hyphens, underscores, plus signs
    // - Domain: letters, numbers, hyphens, dots
    // - TLD: 2-6 letters only (covers .com, .org, .io, .museum, etc.)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return "Please enter a valid email address";
    }

    // Check for common TLD typos (catches .clm, .con, .cpm, .ocm, .vom, etc.)
    const commonTldTypos = ['.clm', '.con', '.cpm', '.ocm', '.vom', '.gmai', '.gmial', '.gmil', '.comn', '.comm'];
    for (const typo of commonTldTypos) {
      if (trimmedEmail.endsWith(typo)) {
        return "Please check your email address for typos";
      }
    }

    // Check common email providers have correct TLD
    const commonProviders: Record<string, string[]> = {
      'gmail': ['.com'],
      'yahoo': ['.com', '.co.uk', '.ca'],
      'hotmail': ['.com', '.co.uk'],
      'outlook': ['.com'],
      'icloud': ['.com'],
      'aol': ['.com'],
    };

    for (const [provider, validTlds] of Object.entries(commonProviders)) {
      if (trimmedEmail.includes(`@${provider}.`) || trimmedEmail.includes(`@${provider}`)) {
        const hasValidTld = validTlds.some(tld => trimmedEmail.endsWith(`${provider}${tld}`));
        if (!hasValidTld && trimmedEmail.includes(`@${provider}.`)) {
          return `Did you mean @${provider}.com?`;
        }
      }
    }

    return undefined;
  };

  // Phone validation helper (validates xxx-xxx-xxxx format)
  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) return undefined; // Phone is optional
    // Remove formatting to check digit count
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length > 0 && digitsOnly.length < 10) {
      return "Please enter a complete 10-digit phone number";
    }
    return undefined;
  };

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
    // Animate drawer sliding up and overlay fading in
    // Using timing with easing for smooth, predictable animation on Android
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Function to close modal with animation
  const closePicker = (): void => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(drawerAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        easing: Easing.in(Easing.cubic),
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

    // Auto-toggle "Save as primary area" when selecting a new waterbody
    if (currentPicker === "waterbody" && item !== initialLoadedValues.waterbody && !saveAsPrimaryArea && !hasSavedPrimaryArea) {
      setSaveAsPrimaryArea(true);
      pulseCheckbox(primaryAreaCheckboxAnim);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date): void => {
    // Update tempDate on each scroll (for spinner mode)
    if (selectedDate) {
      setTempDate(selectedDate);
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
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closePicker}
    >
      <View style={localStyles.modalWrapper} pointerEvents="box-none">
        {/* Animated overlay - sits behind drawer */}
        <TouchableWithoutFeedback onPress={closePicker}>
          <Animated.View
            style={[
              localStyles.modalOverlay,
              { opacity: overlayAnim },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Animated drawer - pointerEvents auto ensures it receives touches */}
        <Animated.View
          style={[
            localStyles.modalDrawer,
            { transform: [{ translateY: drawerAnim }], paddingBottom: insets.bottom },
          ]}
          pointerEvents="auto"
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
                hasConfirmedAbandon.current = true; // Allow navigation to proceed
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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />

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
              translateX: floatingBackOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-60, 0],
              })
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
      {renderAbandonModal()}
      <WrcIdInfoModal visible={showWrcIdInfoModal} onClose={() => setShowWrcIdInfoModal(false)} />

      {/* FAQ Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showFaqModal}
        onRequestClose={() => setShowFaqModal(false)}
      >
        <View style={localStyles.faqModalOverlay}>
          <View style={localStyles.faqModalContent}>
            <View style={localStyles.faqModalHeader}>
              <View style={localStyles.faqModalHeaderLeft}>
                <Feather name="help-circle" size={24} color={colors.primary} />
                <Text style={localStyles.faqModalTitle}>FAQs</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFaqModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={localStyles.faqScrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* FAQ 1 */}
              <View style={localStyles.faqItem}>
                <Text style={localStyles.faqQuestion}>What is Mandatory Harvest Reporting?</Text>
                <Text style={localStyles.faqAnswer}>
                  Beginning December 1, 2025, recreational anglers must report catches of red drum, flounder, spotted seatrout, striped bass, and weakfish. Commercial fishermen must also report all harvested fish regardless of sale status.
                </Text>
              </View>

              {/* FAQ 2 */}
              <View style={localStyles.faqItem}>
                <Text style={localStyles.faqQuestion}>Why is Mandatory Harvest Reporting happening?</Text>
                <Text style={localStyles.faqAnswer}>
                  The program aims to enhance fisheries management by collecting comprehensive harvest data to supplement existing commercial trip ticket reporting and recreational survey programs.
                </Text>
              </View>

              {/* FAQ 3 */}
              <View style={localStyles.faqItem}>
                <Text style={localStyles.faqQuestion}>Who has to participate?</Text>
                <Text style={localStyles.faqAnswer}>
                  Both recreational and commercial fishermen are impacted. Recreational anglers must report the five specified species, while commercial fishermen report personal consumption harvests through seafood dealers.
                </Text>
              </View>

              {/* FAQ 4 */}
              <View style={localStyles.faqItem}>
                <Text style={localStyles.faqQuestion}>Which waters does this apply to?</Text>
                <Text style={localStyles.faqAnswer}>
                  Requirements apply to coastal, joint, and adjacent inland fishing waters under Marine Fisheries Commission and Wildlife Resources Commission authority.
                </Text>
              </View>

              {/* FAQ 5 */}
              <View style={localStyles.faqItem}>
                <Text style={localStyles.faqQuestion}>What information must I report?</Text>
                <Text style={localStyles.faqAnswer}>
                  Recreational fishers report: license number (or name and zip code), harvest date, number of each species kept, harvest area, and gear type.
                </Text>
              </View>

              {/* FAQ 6 */}
              <View style={localStyles.faqItem}>
                <Text style={localStyles.faqQuestion}>When must I report my harvest?</Text>
                <Text style={localStyles.faqAnswer}>
                  Recreational fishers should report when harvest is complete (shore/dock arrival for boats). If you lack internet connection, record information and submit electronically by midnight the following day.
                </Text>
              </View>

              {/* FAQ 7 */}
              <View style={localStyles.faqItem}>
                <Text style={localStyles.faqQuestion}>Why these five fish species?</Text>
                <Text style={localStyles.faqAnswer}>
                  Red drum, flounder, spotted seatrout, striped bass, and weakfish are among the most targeted species in North Carolina's coastal and joint fishing waters.
                </Text>
              </View>

              {/* FAQ 8 */}
              <View style={localStyles.faqItem}>
                <Text style={localStyles.faqQuestion}>How will the law be enforced?</Text>
                <Text style={localStyles.faqAnswer}>
                  Enforcement phases over three years:{'\n'}• Dec 1, 2025 — Verbal warnings{'\n'}• Dec 1, 2026 — Warning tickets{'\n'}• Dec 1, 2027 — $35 infractions plus court fees
                </Text>
              </View>

              {/* FAQ 9 */}
              <View style={localStyles.faqItem}>
                <Text style={localStyles.faqQuestion}>Do charter captains report for customers?</Text>
                <Text style={localStyles.faqAnswer}>
                  No. The law specifies individual anglers bear reporting responsibility at trip completion. Captains can obtain QR code stickers by contacting the Mandatory Harvest Reporting Team.
                </Text>
              </View>

              {/* Link to full FAQs */}
              <TouchableOpacity
                style={localStyles.faqLinkButton}
                onPress={() => {
                  setShowFaqModal(false);
                  Linking.openURL("https://www.deq.nc.gov/about/divisions/marine-fisheries/science-and-statistics/mandatory-harvest-reporting/mandatory-harvest-reporting-faqs");
                }}
                activeOpacity={0.7}
              >
                <Feather name="external-link" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={localStyles.faqLinkText}>View Full FAQs on NC DEQ Website</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={localStyles.faqCloseButton}
              onPress={() => setShowFaqModal(false)}
              activeOpacity={0.7}
            >
              <Text style={localStyles.faqCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Area of Harvest Info Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showAreaInfoModal}
        onRequestClose={() => setShowAreaInfoModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAreaInfoModal(false)}>
          <View style={localStyles.areaInfoModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={localStyles.areaInfoModalContent}>
                <View style={localStyles.areaInfoModalHeader}>
                  <Feather name="info" size={24} color={colors.primary} />
                  <Text style={localStyles.areaInfoModalTitle}>Area of Harvest</Text>
                </View>
                <Text style={localStyles.areaInfoModalText}>
                  Select the waterbody where you harvested the majority of your fish.
                </Text>
                <Text style={localStyles.areaInfoModalText}>
                  Use the interactive map to help identify your harvest area.
                </Text>
                <View style={localStyles.areaInfoModalTip}>
                  <Feather name="info" size={16} color={colors.primary} />
                  <Text style={localStyles.areaInfoModalTipText}>
                    Once the map opens, tap the blue icon at the bottom to view the color legend for Harvest Areas.
                  </Text>
                </View>
                <TouchableOpacity
                  style={localStyles.areaInfoModalButton}
                  onPress={() => {
                    setShowAreaInfoModal(false);
                    Linking.openURL("https://experience.arcgis.com/experience/dc745a4de8344e40b5855b9e9130d0c1");
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="map" size={18} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={localStyles.areaInfoModalButtonText}>View Interactive Map</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={localStyles.areaInfoModalCloseButton}
                  onPress={() => setShowAreaInfoModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={localStyles.areaInfoModalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
            <TextInput
              style={styles.input}
              value={formData.zipCode}
              onChangeText={(text) => {
                setFormData({
                  ...formData,
                  zipCode: text.replace(/\D/g, '').slice(0, 5),
                });
              }}
              placeholder="Enter your 5-digit ZIP code"
              keyboardType="number-pad"
              maxLength={5}
              onFocus={scrollToCenter}
            />
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
            <TextInput
              style={[
                styles.input,
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

                // Auto-expand contact section when all required fields are filled (unlicensed)
                const hasRequiredFields = formData.angler.firstName?.trim() &&
                                          formData.angler.lastName?.trim() &&
                                          cleanedZip.length === 5;
                if (hasRequiredFields && !showContactSection) {
                  setShowContactSection(true);
                }
              }}
              placeholder="Enter your 5-digit ZIP code"
              keyboardType="number-pad"
              maxLength={5}
              onFocus={scrollToCenter}
            />
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

                setFormData({
                  ...formData,
                  angler: { ...formData.angler, email: text },
                  wantEmailConfirmation: hasEmail ? true : formData.wantEmailConfirmation,
                });

                // Trigger animation when auto-toggling email confirmation
                if (shouldAutoToggleEmail) {
                  pulseCheckbox(emailCheckboxAnim);
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
                onPress={() => setFormData({ ...formData, wantEmailConfirmation: !formData.wantEmailConfirmation })}
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

                setFormData({
                  ...formData,
                  angler: { ...formData.angler, phone: formattedPhone },
                  wantTextConfirmation: hasPhone ? true : formData.wantTextConfirmation,
                });

                // Trigger animation when auto-toggling phone confirmation
                if (shouldAutoTogglePhone) {
                  pulseCheckbox(phoneCheckboxAnim);
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
                onPress={() => setFormData({ ...formData, wantTextConfirmation: !formData.wantTextConfirmation })}
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

      <Text style={styles.requiredFields}><Text style={localStyles.requiredAsterisk}>*</Text> Required fields</Text>
      </>
      )}
        </View>
      </Animated.ScrollView>

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
        animationType="fade"
        onRequestClose={() => setShowRaffleModal(false)}
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

                <Text style={localStyles.raffleInputLabel}>Name <Text style={localStyles.requiredAsterisk}>*</Text></Text>
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

                <Text style={localStyles.raffleInputLabel}>Email <Text style={localStyles.requiredAsterisk}>*</Text></Text>
                <TextInput
                  style={[
                    localStyles.raffleInput,
                    raffleValidationErrors.email && localStyles.raffleInputError,
                  ]}
                  value={formData.angler.email}
                  onChangeText={(text) => {
                    setFormData({
                      ...formData,
                      angler: { ...formData.angler, email: text },
                    });
                    // Clear error when user starts typing
                    if (raffleValidationErrors.email) {
                      setRaffleValidationErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  onBlur={() => {
                    const error = validateEmail(formData.angler.email || "");
                    setRaffleValidationErrors(prev => ({ ...prev, email: error }));
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
                    setFormData({
                      ...formData,
                      angler: { ...formData.angler, phone: formatPhoneNumber(text) },
                    });
                    // Clear error when user starts typing
                    if (raffleValidationErrors.phone) {
                      setRaffleValidationErrors(prev => ({ ...prev, phone: undefined }));
                    }
                  }}
                  onBlur={() => {
                    const error = validatePhone(formData.angler.phone || "");
                    setRaffleValidationErrors(prev => ({ ...prev, phone: error }));
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
                  onPress={() => setShowRaffleModal(false)}
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
                      setRaffleValidationErrors(prev => ({ ...prev, email: emailError }));
                      Alert.alert("Invalid Email", emailError);
                      return;
                    }
                    // Validate phone format (if provided)
                    const phoneError = validatePhone(formData.angler.phone || "");
                    if (phoneError) {
                      setRaffleValidationErrors(prev => ({ ...prev, phone: phoneError }));
                      Alert.alert("Invalid Phone", phoneError);
                      return;
                    }
                    setEnterRaffle(true);
                    setShowRaffleModal(false);
                    showToast("Rewards Entry Added", "You'll be entered in this quarter's drawing.");
                  }}
                  disabled={!catchPhoto || !formData.angler.firstName?.trim() || !formData.angler.lastName?.trim() ||
                           !formData.angler.email?.trim() || !!validateEmail(formData.angler.email || "") ||
                           !!validatePhone(formData.angler.phone || "")}
                >
                  <Feather name="check" size={18} color={colors.white} />
                  <Text style={localStyles.raffleModalPrimaryButtonText}>Submit & Enter</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// Local styles for multi-fish UI and count picker
const localStyles = StyleSheet.create({
  // Label row with info icon
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
    elevation: 15,
    zIndex: 200, // Above scrollView (zIndex: 2) and floating back button (zIndex: 100)
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

  // Fixed header - sits behind scrolling content
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.85,
    marginTop: 2,
  },
  testModeBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  testModeBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },

  // FAQ button in header
  faqButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAQ Modal styles
  faqModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  faqModalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  faqModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  faqModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faqModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  faqScrollView: {
    paddingHorizontal: 16,
  },
  faqItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  faqLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
  },
  faqLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  faqCloseButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  faqCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },

  // Floating back button - appears on scroll
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 52,
    left: 16,
    zIndex: 100,
    backgroundColor: colors.primary,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingBackTouchable: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll view - slides over fixed header
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },

  // Header spacer - transparent area showing fixed header behind
  headerSpacerArea: {
    height: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 100 : 130,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingHorizontal: 20,
  },
  spacerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacerBackButton: {
    width: 40,
    height: 40,
  },
  spacerFaqButton: {
    width: 40,
    height: 40,
  },

  // Content container - the light card that slides over
  contentContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 24, // Extra padding for bottom rounded corners
    marginBottom: 20, // Space below the card to show the rounded corners
    minHeight: Dimensions.get('window').height - 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },

  // Modal styles
  modalWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1,
  },
  modalDrawer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    zIndex: 2,
    elevation: 10,
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
    fontSize: 16,
    fontWeight: "500",
    color: colors.primary,
    marginRight: 6,
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
  fishChipTextActive: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
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
    marginTop: 16,
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
  // CatchFeed photo section (for users already entered in raffle)
  catchFeedPhotoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  catchFeedPhotoLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  catchFeedPhotoDesc: {
    fontSize: 13,
    color: colors.darkGray,
    marginBottom: 12,
  },
  catchFeedPhotoContainer: {
    alignItems: "center",
  },
  catchFeedPhoto: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
  },
  catchFeedPhotoActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 16,
  },
  catchFeedPhotoActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  catchFeedPhotoActionText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
  },
  catchFeedAddPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    paddingVertical: 16,
    gap: 8,
  },
  catchFeedAddPhotoText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  raffleModalScrollContent: {
    padding: 24,
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
  raffleInputError: {
    borderColor: colors.error || "#FF3B30",
    borderWidth: 1,
  },
  raffleErrorText: {
    color: colors.error || "#FF3B30",
    fontSize: 12,
    marginTop: 4,
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
  datePickerContainer: {
    width: "100%",
    minHeight: 350,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  datePickerInline: {
    height: 350,
    width: "100%",
    backgroundColor: colors.white,
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
  // Collapsible contact section styles
  contactSectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 102, 153, 0.1)",
  },
  contactSectionToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactSectionToggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
  contactSectionContent: {
    backgroundColor: "#fafbfc",
    borderRadius: 10,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 16,
    marginTop: -2,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "rgba(0, 102, 153, 0.1)",
  },
  contactSectionHint: {
    fontSize: 13,
    color: colors.darkGray,
    marginBottom: 4,
    lineHeight: 18,
  },
  phoneDisclaimer: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 15,
    fontStyle: 'italic',
  },
  // Area of Harvest Info Modal styles
  areaInfoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  areaInfoModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  areaInfoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  areaInfoModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginLeft: 12,
  },
  areaInfoModalText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  areaInfoModalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  areaInfoModalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  areaInfoModalTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  areaInfoModalTipText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    lineHeight: 20,
  },
  areaInfoModalCloseButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  areaInfoModalCloseText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
});

export default ReportFormScreen;