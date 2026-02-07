// screens/ConfirmationScreen.tsx
//
// Confirmation screen for NC DMF harvest report submission.
// Handles actual DMF submission, displays confirmation number, and provides copy/share.
//

import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  ActivityIndicator,
  BackHandler,
  InteractionManager,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../styles/confirmationScreenStyles";
import { RootStackParamList, FishReportData, HarvestReportInput } from "../types";
import { colors, spacing, borderRadius, typography } from "../styles/common";

// DMF services
import { submitWithQueueFallback, SubmitWithQueueResult } from "../services/offlineQueue";
import { aggregateFishEntries } from "../constants/species";
import { isTestMode } from "../config/appConfig";

// Rewards prompt
import RewardsPromptModal from "../components/RewardsPromptModal";
import { shouldShowRewardsPrompt } from "../services/anonymousUserService";

// Achievement notifications
import { useAchievements } from "../contexts/AchievementContext";

// Badge notification
import { markNewReportSubmitted, invalidateBadgeCache } from "../utils/badgeUtils";

// Catch feed cache
import { clearCatchFeedCache } from "../services/catchFeedService";

// User service for syncing profile to Supabase
import { updateCurrentUser } from "../services/userProfileService";
import { UserInput } from "../types/user";

type ConfirmationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Confirmation"
>;

type ConfirmationScreenRouteProp = RouteProp<
  RootStackParamList,
  "Confirmation"
>;

interface ConfirmationScreenProps {
  navigation: ConfirmationScreenNavigationProp;
  route: ConfirmationScreenRouteProp;
}

const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ route, navigation }) => {
  const { reportData } = route.params || { reportData: {} as FishReportData };

  // Achievement notifications
  const { queueAchievementsForLater } = useAchievements();

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(true);
  const [submitResult, setSubmitResult] = useState<SubmitWithQueueResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Rewards prompt state
  const [showRewardsPrompt, setShowRewardsPrompt] = useState(false);
  const [rewardsPromptChecked, setRewardsPromptChecked] = useState(false);

  // Ref to track if dismissing (prevents multiple navigation attempts)
  const isDismissingRef = useRef(false);

  // Close button handler
  const handleClose = () => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    console.log('❌ Close button pressed, navigating home');
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  // Submit to DMF on mount
  useEffect(() => {
    submitToDMF();
  }, []);

  // Check if rewards prompt should be shown after successful submission
  useEffect(() => {
    const checkRewardsPrompt = async () => {
      // Only check once, and only after submission completes successfully
      if (rewardsPromptChecked || isSubmitting || submitError) return;
      if (!submitResult?.success && !submitResult?.queued) return;

      setRewardsPromptChecked(true);

      try {
        const shouldShow = await shouldShowRewardsPrompt();
        console.log('🎁 shouldShowRewardsPrompt result:', shouldShow);
        if (shouldShow) {
          console.log('🎁 Showing rewards prompt');
          setShowRewardsPrompt(true);
        } else {
          console.log('🎁 Not showing rewards prompt (user already a member or dismissed)');
        }
      } catch (error) {
        console.error('Error checking rewards prompt:', error);
      }
    };

    checkRewardsPrompt();
  }, [isSubmitting, submitResult, submitError, rewardsPromptChecked]);

  // Prevent Android back button from going back to the form
  // Instead, navigate to Home (same as pressing "Return Home" button)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isDismissingRef.current) {
        isDismissingRef.current = true;
        navigation.reset({ index: 0, routes: [{ name: "Home" }] });
      }
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [navigation]);

  const submitToDMF = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Build HarvestReportInput from reportData
      const harvestInput = buildHarvestReportInput(reportData);

      // Submit via the offline-aware service
      const result = await submitWithQueueFallback(harvestInput);
      setSubmitResult(result);

      // Mark new report for badge notification (if submitted or queued)
      if (result.success || result.queued) {
        await markNewReportSubmitted();
        // Clear catch feed cache so the new submission appears immediately
        await clearCatchFeedCache();
        // Invalidate the in-memory badge cache so HomeScreen fetches fresh data
        invalidateBadgeCache();

        // Save preferred area to user profile for future reports
        if (reportData.areaCode || reportData.waterbody) {
          try {
            const existingProfile = await AsyncStorage.getItem("userProfile");
            const profileData = existingProfile ? JSON.parse(existingProfile) : {};
            const updatedProfile = {
              ...profileData,
              preferredAreaCode: reportData.areaCode || profileData.preferredAreaCode,
              preferredAreaLabel: reportData.waterbody || reportData.areaLabel || profileData.preferredAreaLabel,
            };
            await AsyncStorage.setItem("userProfile", JSON.stringify(updatedProfile));
            console.log("✅ Preferred area saved to profile:", updatedProfile.preferredAreaLabel);
          } catch (areaError) {
            console.warn("Failed to save preferred area:", areaError);
          }
        }

        // Sync profile fields to Supabase users table
        try {
          const profileUpdates: UserInput = {};

          // Debug: Log what's in reportData for profile fields
          console.log("🔄 Profile sync - reportData fields:", {
            zipCode: reportData.zipCode,
            wrcId: reportData.wrcId,
            hasLicense: reportData.hasLicense,
            areaCode: reportData.areaCode,
            waterbody: reportData.waterbody,
            anglerFirstName: reportData.angler?.firstName,
            anglerLastName: reportData.angler?.lastName,
            anglerPhone: reportData.angler?.phone,
          });

          // Add fields from report data if they exist
          if (reportData.zipCode) {
            profileUpdates.zipCode = reportData.zipCode;
          }
          if (reportData.wrcId) {
            profileUpdates.wrcId = reportData.wrcId;
          }
          if (reportData.hasLicense !== undefined) {
            profileUpdates.hasLicense = reportData.hasLicense;
          }
          if (reportData.areaCode) {
            profileUpdates.preferredAreaCode = reportData.areaCode;
          }
          if (reportData.waterbody || reportData.areaLabel) {
            profileUpdates.preferredAreaLabel = reportData.waterbody || reportData.areaLabel;
            profileUpdates.primaryHarvestArea = reportData.waterbody || reportData.areaLabel;
          }
          // Save fishing method as primary default
          if (reportData.usedHookAndLine !== undefined) {
            profileUpdates.primaryFishingMethod = reportData.usedHookAndLine
              ? 'Hook and Line'
              : (reportData.gearLabel || reportData.gearCode || null);
          }
          if (reportData.angler?.firstName) {
            profileUpdates.firstName = reportData.angler.firstName;
          }
          if (reportData.angler?.lastName) {
            profileUpdates.lastName = reportData.angler.lastName;
          }
          if (reportData.angler?.phone) {
            profileUpdates.phone = reportData.angler.phone;
          }

          // Only call updateCurrentUser if we have fields to update
          if (Object.keys(profileUpdates).length > 0) {
            console.log("🔄 Profile updates to sync:", profileUpdates);
            await updateCurrentUser(profileUpdates);
            console.log("✅ Profile synced to Supabase:", Object.keys(profileUpdates).join(", "));
          } else {
            console.log("⚠️ No profile fields to sync (all empty)");
          }
        } catch (syncError) {
          console.warn("Failed to sync profile to Supabase:", syncError);
          // Don't fail the submission if sync fails - data is already in local storage
        }
      }

      // Queue achievement notifications to show after navigating to HomeScreen
      if (result.achievementsAwarded && result.achievementsAwarded.length > 0) {
        queueAchievementsForLater(result.achievementsAwarded);
      }

      if (!result.success && !result.queued) {
        setSubmitError(result.error || "Submission failed");
      }
    } catch (error) {
      console.error("DMF submission error:", error);
      setSubmitError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build HarvestReportInput from the FishReportData passed from ReportFormScreen
  const buildHarvestReportInput = (data: FishReportData): HarvestReportInput => {
    // Aggregate fish entries by species
    const fishEntries = data.fishEntries || [];
    const speciesCounts = aggregateFishEntries(
      fishEntries.map((entry: { species: string; count: number }) => ({
        species: entry.species,
        count: entry.count,
      }))
    );

    return {
      // Identity
      hasLicense: data.hasLicense ?? true,
      wrcId: data.wrcId,
      firstName: data.angler?.firstName,
      lastName: data.angler?.lastName,
      zipCode: data.zipCode,

      // Contact / Confirmation preferences
      wantTextConfirmation: data.wantTextConfirmation ?? false,
      phone: data.angler?.phone,
      wantEmailConfirmation: data.wantEmailConfirmation ?? false,
      email: data.angler?.email,

      // Harvest data
      harvestDate: data.date ? new Date(data.date) : new Date(),
      redDrumCount: speciesCounts.redDrum,
      flounderCount: speciesCounts.flounder,
      spottedSeatroutCount: speciesCounts.spottedSeatrout,
      weakfishCount: speciesCounts.weakfish,
      stripedBassCount: speciesCounts.stripedBass,

      // Location
      areaCode: data.areaCode || "",
      areaLabel: data.areaLabel || data.waterbody,

      // Gear
      usedHookAndLine: data.usedHookAndLine ?? true,
      gearCode: data.gearCode,
      gearLabel: data.gearLabel,

      // Reporting scope
      reportingFor: (data.reportingFor as "self" | "family") || "self",
      familyCount: data.familyCount,

      // App-only fields
      enterRaffle: !!data.enteredRaffle,
      catchPhoto: data.photo,
      fishEntries: fishEntries,
    };
  };

  // Copy confirmation number to clipboard
  const handleCopyConfirmation = async () => {
    if (submitResult?.confirmationNumber) {
      await Clipboard.setStringAsync(submitResult.confirmationNumber);
      Alert.alert("Copied!", "Confirmation number copied to clipboard");
    }
  };

  // Share confirmation details
  const handleShare = async () => {
    if (!submitResult?.confirmationNumber) return;

    const totalFish = (reportData.fishEntries || []).reduce(
      (sum: number, fish: { count: number }) => sum + fish.count,
      0
    );

    const message = `NC Harvest Report Confirmation

Confirmation #: ${submitResult.confirmationNumber}
Date: ${reportData.date ? new Date(reportData.date).toLocaleDateString() : new Date().toLocaleDateString()}
Location: ${reportData.waterbody || "Not specified"}
Total Fish: ${totalFish}

This report was submitted to the NC Division of Marine Fisheries.`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  // Calculate total fish count
  const totalFishCount = (reportData.fishEntries || []).reduce(
    (sum: number, fish: { count: number }) => sum + fish.count,
    0
  );

  // Get species summary
  const getSpeciesSummary = (): string => {
    const entries = reportData.fishEntries || [];
    if (entries.length === 0) {
      return reportData.species || "Not specified";
    }

    // Group by species and sum counts
    const speciesMap: Record<string, number> = {};
    entries.forEach((entry: { species: string; count: number }) => {
      speciesMap[entry.species] = (speciesMap[entry.species] || 0) + entry.count;
    });

    return Object.entries(speciesMap)
      .map(([species, count]) => `${count} ${species}`)
      .join(", ");
  };

  // Show loading state while submitting
  if (isSubmitting) {
    return (
      <View style={localStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={localStyles.loadingText}>Submitting to NC DMF...</Text>
        {isTestMode() && (
          <Text style={localStyles.testModeNote}>TEST MODE - Not sending to real DMF</Text>
        )}
      </View>
    );
  }

  // Show error state if submission failed and wasn't queued
  if (submitError && !submitResult?.queued) {
    return (
      <View style={localStyles.errorContainer}>
        <View style={localStyles.errorIconCircle}>
          <Feather name="alert-circle" size={50} color={colors.white} />
        </View>
        <Text style={localStyles.errorTitle}>Submission Failed</Text>
        <Text style={localStyles.errorText}>{submitError}</Text>
        <TouchableOpacity
          style={localStyles.retryButton}
          onPress={submitToDMF}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={18} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={localStyles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={localStyles.homeButton}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "Home" }] })}
          activeOpacity={0.8}
        >
          <Text style={localStyles.homeButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Determine header color based on status
  const headerColor = submitResult?.queued ? colors.warning : colors.success;
  const statusIcon = submitResult?.queued ? "clock" : "check";
  const statusTitle = submitResult?.queued ? "Report Queued" : "Report Submitted";

  return (
    <View
      style={[
        localStyles.screenContainer,
        { backgroundColor: headerColor },
      ]}
    >
      {/* Modern Header with Close Button */}
      <View
        style={[localStyles.header, { backgroundColor: headerColor }]}
      >
        {/* Close button - positioned top right */}
        <TouchableOpacity
          style={localStyles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={24} color="rgba(255, 255, 255, 0.9)" />
        </TouchableOpacity>

        <Text style={localStyles.headerTitle}>{statusTitle}</Text>
        {isTestMode() && (
          <View style={localStyles.testModeBadge}>
            <Text style={localStyles.testModeBadgeText}>TEST MODE</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={localStyles.scrollView}
        contentContainerStyle={localStyles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            {/* Status icon */}
            <View style={[localStyles.iconCircle, { backgroundColor: headerColor }]}>
              <Feather name={statusIcon} size={50} color={colors.white} />
            </View>
            <Text style={styles.title}>
              {submitResult?.queued ? "Saved for Later" : "Thank You!"}
            </Text>
            <Text style={styles.subtitle}>
              {submitResult?.queued
                ? "Your report has been saved and will be submitted when you're back online."
                : "Your harvest report has been successfully submitted to the NC Division of Marine Fisheries."}
            </Text>
          </View>

          {/* Confirmation Number Box - PROMINENT */}
          <TouchableOpacity
            style={[
              localStyles.confirmationBox,
              submitResult?.queued && localStyles.confirmationBoxQueued,
            ]}
            onPress={handleCopyConfirmation}
            activeOpacity={0.8}
          >
            <Text style={[
              localStyles.confirmationLabel,
              submitResult?.queued && localStyles.confirmationLabelQueued,
            ]}>
              {submitResult?.queued ? "LOCAL CONFIRMATION #" : "CONFIRMATION NUMBER"}
            </Text>
            <Text style={[
              localStyles.confirmationNumber,
              submitResult?.queued && localStyles.confirmationNumberQueued,
            ]}>
              {submitResult?.confirmationNumber || "------"}
            </Text>
            <Text style={localStyles.confirmationHint}>
              {submitResult?.queued
                ? "This number will update when synced"
                : "Tap to copy • Show to law enforcement if inspected"}
            </Text>
          </TouchableOpacity>

          {/* Queued Warning */}
          {submitResult?.queued && (
            <View style={localStyles.queuedWarning}>
              <Feather name="wifi-off" size={20} color={colors.warning} />
              <Text style={localStyles.queuedWarningText}>
                Report saved offline. It will automatically submit when you have internet connection.
              </Text>
            </View>
          )}

          {/* Report Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Report Summary</Text>

            <SummaryRow
              label="Species"
              value={getSpeciesSummary()}
            />

            <SummaryRow
              label="Total Fish"
              value={totalFishCount.toString()}
            />

            <SummaryRow
              label="Location"
              value={reportData.waterbody || reportData.location || "Not specified"}
            />

            <SummaryRow
              label="Date"
              value={reportData.date
                ? new Date(reportData.date).toLocaleDateString()
                : new Date().toLocaleDateString()
              }
            />

            <SummaryRow
              label="Method"
              value={reportData.fishingMethod || "Hook & Line"}
            />

            {reportData.photo && (
              <View style={styles.photoContainer}>
                <Text style={styles.summaryLabel}>Photo:</Text>
                <Image
                  source={{ uri: reportData.photo }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>

          {/* DMF Confirmation Status */}
          <View style={localStyles.notificationBox}>
            <Text style={localStyles.notificationTitle}>
              {submitResult?.queued ? "Confirmation Pending" : "Confirmation Sent"}
            </Text>

            {reportData.wantTextConfirmation && reportData.angler?.phone && (
              <View style={localStyles.notificationRow}>
                <Feather name="smartphone" size={18} color={submitResult?.queued ? colors.warning : colors.success} />
                <Text style={localStyles.notificationText}>
                  {submitResult?.queued
                    ? `Text will be sent to ${reportData.angler.phone} when synced`
                    : `Text sent to ${reportData.angler.phone}`}
                </Text>
              </View>
            )}

            {reportData.wantEmailConfirmation && reportData.angler?.email && (
              <View style={localStyles.notificationRow}>
                <Feather name="mail" size={18} color={submitResult?.queued ? colors.warning : colors.success} />
                <Text style={localStyles.notificationText}>
                  {submitResult?.queued
                    ? `Email will be sent to ${reportData.angler.email} when synced`
                    : `Email sent to ${reportData.angler.email}`}
                </Text>
              </View>
            )}

            {!reportData.wantTextConfirmation && !reportData.wantEmailConfirmation && (
              <View style={localStyles.notificationRow}>
                <Feather name="camera" size={18} color={colors.darkGray} />
                <Text style={localStyles.notificationText}>
                  No confirmation requested. Take a screenshot!
                </Text>
              </View>
            )}
          </View>

          {/* Rewards Status */}
          {reportData.enteredRaffle && (
            <View style={localStyles.raffleBox}>
              <View style={localStyles.raffleHeader}>
                <Feather name="gift" size={20} color={colors.primary} />
                <Text style={localStyles.raffleTitle}>Rewards Entry</Text>
              </View>
              <Text style={localStyles.raffleText}>
                You've been entered into the quarterly rewards drawing! Selected contributors will be contacted via email.
              </Text>
            </View>
          )}

          {/* Info Box */}
          <View style={localStyles.infoContainer}>
            <View style={localStyles.infoHeader}>
              <Feather name="info" size={20} color={colors.primary} />
              <Text style={localStyles.infoTitle}>What happens next?</Text>
            </View>
            <Text style={localStyles.infoText}>
              Your report will be processed by NC Division of Marine Fisheries.
              This information helps monitor fish populations and make informed
              conservation decisions.
            </Text>
            <Text style={localStyles.legalNote}>
              NC General Statute 113-170.3 requires harvest reporting for Red Drum,
              Flounder, Spotted Seatrout, Weakfish, and Striped Bass.
            </Text>
          </View>

          {/* Action Buttons - Simplified */}
          <View style={styles.buttonContainer}>
            {/* Primary Action - Return Home */}
            <TouchableOpacity
              style={localStyles.primaryButton}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: "Home" }] })}
              activeOpacity={0.8}
            >
              <Feather name="home" size={20} color={colors.white} style={{ marginRight: 10 }} />
              <Text style={localStyles.primaryButtonText}>Return to Home</Text>
            </TouchableOpacity>

            {/* Secondary Action - Submit Another */}
            <TouchableOpacity
              style={localStyles.secondaryActionButton}
              onPress={() => navigation.reset({ index: 1, routes: [{ name: "Home" }, { name: "ReportForm" }] })}
              activeOpacity={0.8}
            >
              <Feather name="plus-circle" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={localStyles.secondaryActionButtonText}>Submit Another Report</Text>
            </TouchableOpacity>

            {/* Quick Actions Row - Full Width */}
            <View style={localStyles.quickActionsRow}>
              <TouchableOpacity
                style={localStyles.quickActionButton}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <View style={localStyles.quickActionIcon}>
                  <Feather name="share-2" size={22} color={colors.primary} />
                </View>
                <Text style={localStyles.quickActionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={localStyles.quickActionButton}
                onPress={handleCopyConfirmation}
                activeOpacity={0.7}
              >
                <View style={localStyles.quickActionIcon}>
                  <Feather name="copy" size={22} color={colors.primary} />
                </View>
                <Text style={localStyles.quickActionText}>Copy #</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={localStyles.quickActionButton}
                onPress={() => {
                  // Navigate with smooth slide-in animation instead of reset
                  // (reset tears down the entire stack, causing a brief white flash
                  // while HomeScreen re-renders behind the new PastReportsScreen)
                  navigation.navigate('PastReports');
                  // After the transition animation completes, silently remove
                  // Confirmation and ReportForm so back goes to Home
                  InteractionManager.runAfterInteractions(() => {
                    navigation.dispatch(state => {
                      const topRoute = state.routes[state.routes.length - 1];
                      if (topRoute?.name !== 'PastReports') return state;
                      const routes = state.routes.filter(
                        r => r.name === 'Home' || r.name === 'PastReports'
                      );
                      return CommonActions.reset({
                        ...state,
                        routes,
                        index: routes.length - 1,
                      });
                    });
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={localStyles.quickActionIcon}>
                  <Feather name="clock" size={22} color={colors.primary} />
                </View>
                <Text style={localStyles.quickActionText}>Past Reports</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Rewards Prompt Modal */}
      <RewardsPromptModal
        visible={showRewardsPrompt}
        onClose={() => setShowRewardsPrompt(false)}
        onJoinSuccess={() => {
          setShowRewardsPrompt(false);
          Alert.alert(
            "Welcome to Rewards!",
            "You're now a member of the Quarterly Rewards Program. Good luck in the drawing!",
            [{ text: "Awesome!", style: "default" }]
          );
        }}
        // Pre-fill from report data
        initialFirstName={reportData.angler?.firstName || ''}
        initialLastName={reportData.angler?.lastName || ''}
        initialEmail={reportData.angler?.email || ''}
        initialPhone={reportData.angler?.phone || ''}
        initialZipCode={reportData.zipCode || ''}
        initialWrcId={reportData.wrcId || ''}
        // If user opted into rewards during form, they must complete signup
        requiresSignup={!!reportData.enteredRaffle}
      />
    </View>
  );
};

// Helper component for summary rows
const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}:</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

// Local styles
const localStyles = StyleSheet.create({
  // Loading state
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.heading,
    color: colors.primary,
    marginTop: spacing.lg,
  },
  testModeNote: {
    ...typography.bodySmall,
    color: colors.warning,
    marginTop: spacing.sm,
  },

  // Error state
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.heading,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  homeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  homeButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 16,
  },

  // Screen layout
  screenContainer: {
    flex: 1,
    backgroundColor: colors.success,
  },
  header: {
    backgroundColor: colors.success,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  swipeIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 3,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.3,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  testModeBadge: {
    backgroundColor: "#ff9800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  testModeBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
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
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Confirmation box
  confirmationBox: {
    backgroundColor: "#f0f7f0",
    padding: 24,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.success,
  },
  confirmationBoxQueued: {
    backgroundColor: "#fff8e1",
    borderColor: colors.warning,
  },
  confirmationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
    letterSpacing: 1,
    marginBottom: 8,
  },
  confirmationLabelQueued: {
    color: colors.warning,
  },
  confirmationNumber: {
    fontSize: 42,
    fontWeight: "bold",
    color: colors.success,
    letterSpacing: 3,
  },
  confirmationNumberQueued: {
    color: colors.warning,
  },
  confirmationHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },

  // Queued warning
  queuedWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  queuedWarningText: {
    ...typography.bodySmall,
    color: "#856404",
    marginLeft: spacing.sm,
    flex: 1,
  },

  // Notification box
  notificationBox: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: "rgba(0, 0, 0, 0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationTitle: {
    ...typography.heading,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  notificationText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },

  // Raffle box
  raffleBox: {
    backgroundColor: "#f0f7ff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  raffleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  raffleTitle: {
    ...typography.heading,
    fontSize: 16,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  raffleText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Info container
  infoContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: "rgba(0, 0, 0, 0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  infoTitle: {
    ...typography.heading,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontSize: 18,
  },
  infoText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  legalNote: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: "italic",
  },

  // Buttons - Redesigned
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 17,
  },
  secondaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryActionButtonText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 16,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  quickActionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    marginHorizontal: 6,
    backgroundColor: "#f5f9fc",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#e0e8f0",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e8f4fc",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});

export default ConfirmationScreen;
