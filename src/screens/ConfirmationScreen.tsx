// screens/ConfirmationScreen.tsx
//
// Confirmation screen for NC DMF harvest report submission.
// Handles actual DMF submission, displays confirmation number, and provides copy/share.
//

import React, { useState, useEffect } from "react";
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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import styles from "../styles/confirmationScreenStyles";
import { RootStackParamList, FishReportData, HarvestReportInput } from "../types";
import { colors, spacing, borderRadius, typography } from "../styles/common";

// DMF services
import { submitWithQueueFallback, SubmitWithQueueResult } from "../services/offlineQueue";
import { aggregateFishEntries } from "../constants/species";
import { isTestMode } from "../config/appConfig";

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

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(true);
  const [submitResult, setSubmitResult] = useState<SubmitWithQueueResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Submit to DMF on mount
  useEffect(() => {
    submitToDMF();
  }, []);

  const submitToDMF = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Build HarvestReportInput from reportData
      const harvestInput = buildHarvestReportInput(reportData);

      // Submit via the offline-aware service
      const result = await submitWithQueueFallback(harvestInput);
      setSubmitResult(result);

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
          onPress={() => navigation.navigate("Home")}
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
    <View style={[localStyles.screenContainer, { backgroundColor: headerColor }]}>
      {/* Modern Header */}
      <View style={[localStyles.header, { backgroundColor: headerColor }]}>
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
              onPress={() => navigation.navigate("Home")}
              activeOpacity={0.8}
            >
              <Feather name="home" size={20} color={colors.white} style={{ marginRight: 10 }} />
              <Text style={localStyles.primaryButtonText}>Return to Home</Text>
            </TouchableOpacity>

            {/* Secondary Action - Submit Another */}
            <TouchableOpacity
              style={localStyles.secondaryActionButton}
              onPress={() => navigation.navigate("ReportForm")}
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
                  // Reset stack so back from PastReports goes to Home, not Confirmation
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 1,
                      routes: [
                        { name: "Home" },
                        { name: "PastReports" },
                      ],
                    })
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={localStyles.quickActionIcon}>
                  <Feather name="clock" size={22} color={colors.primary} />
                </View>
                <Text style={localStyles.quickActionText}>History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTitle: {
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
