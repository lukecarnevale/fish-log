// screens/PastReportsScreen.tsx
//
// History screen for viewing past harvest reports with DMF confirmation numbers.
// Integrates with offlineQueue service to show synced and pending reports.
//

import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  ListRenderItem,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { RootStackParamList } from "../types";
import { SubmittedReport, QueuedReport } from "../types/harvestReport";
import { colors, spacing, typography, borderRadius } from "../styles/common";
import { isTestMode } from "../config/appConfig";
import ScreenLayout from "../components/ScreenLayout";

// DMF services
import {
  getHistory,
  getQueue,
} from "../services/offlineQueue";

type PastReportsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PastReports"
>;

interface PastReportsScreenProps {
  navigation: PastReportsScreenNavigationProp;
}

// Combined report type for display (either submitted or queued)
interface DisplayReport {
  type: "submitted" | "queued";
  confirmationNumber: string;
  harvestDate: string;
  areaLabel?: string;
  areaCode: string;
  usedHookAndLine: boolean;
  gearLabel?: string;
  redDrumCount: number;
  flounderCount: number;
  spottedSeatroutCount: number;
  weakfishCount: number;
  stripedBassCount: number;
  catchPhoto?: string;
  submittedAt?: string;
  queuedAt?: string;
  firstName?: string;
  lastName?: string;
  wrcId?: string;
  objectId?: number;
  retryCount?: number;
  lastError?: string;
  // Raffle info
  enteredRaffle?: boolean;
  raffleId?: string;
}

const PastReportsScreen: React.FC<PastReportsScreenProps> = ({ navigation }) => {
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>([]);
  const [queuedReports, setQueuedReports] = useState<QueuedReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<DisplayReport | null>(null);
  const [filterType, setFilterType] = useState<"all" | "synced" | "pending">("all");

  // Load reports from storage
  const loadReports = useCallback(async () => {
    try {
      const [history, queue] = await Promise.all([
        getHistory(),
        getQueue(),
      ]);
      setSubmittedReports(history);
      setQueuedReports(queue);
    } catch (error) {
      console.error("Failed to load reports:", error);
      Alert.alert("Error", "Failed to load your past reports");
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadReports();
      setLoading(false);
    };
    init();
  }, [loadReports]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }, [loadReports]);

  // Copy confirmation number
  const handleCopyConfirmation = async (confirmationNumber: string) => {
    await Clipboard.setStringAsync(confirmationNumber);
    Alert.alert("Copied!", "Confirmation number copied to clipboard");
  };

  // Convert reports to display format
  const convertToDisplayReport = (
    report: SubmittedReport | QueuedReport,
    type: "submitted" | "queued"
  ): DisplayReport => {
    if (type === "submitted") {
      const submitted = report as SubmittedReport;
      return {
        type: "submitted",
        confirmationNumber: submitted.confirmationNumber,
        harvestDate: submitted.harvestDate,
        areaLabel: submitted.areaLabel,
        areaCode: submitted.areaCode,
        usedHookAndLine: submitted.usedHookAndLine,
        gearLabel: submitted.gearLabel,
        redDrumCount: submitted.redDrumCount,
        flounderCount: submitted.flounderCount,
        spottedSeatroutCount: submitted.spottedSeatroutCount,
        weakfishCount: submitted.weakfishCount,
        stripedBassCount: submitted.stripedBassCount,
        catchPhoto: submitted.catchPhoto,
        submittedAt: submitted.submittedAt,
        firstName: submitted.firstName,
        lastName: submitted.lastName,
        wrcId: submitted.wrcId,
        objectId: submitted.objectId,
        enteredRaffle: submitted.raffleEntered,
        raffleId: submitted.raffleId,
      };
    } else {
      const queued = report as QueuedReport;
      return {
        type: "queued",
        confirmationNumber: queued.localConfirmationNumber,
        harvestDate: queued.harvestDate,
        areaLabel: queued.areaLabel,
        areaCode: queued.areaCode,
        usedHookAndLine: queued.usedHookAndLine,
        gearLabel: queued.gearLabel,
        redDrumCount: queued.redDrumCount,
        flounderCount: queued.flounderCount,
        spottedSeatroutCount: queued.spottedSeatroutCount,
        weakfishCount: queued.weakfishCount,
        stripedBassCount: queued.stripedBassCount,
        catchPhoto: queued.catchPhoto,
        queuedAt: queued.queuedAt,
        firstName: queued.firstName,
        lastName: queued.lastName,
        wrcId: queued.wrcId,
        retryCount: queued.retryCount,
        lastError: queued.lastError,
        enteredRaffle: queued.enterRaffle,
      };
    }
  };

  // Get combined and sorted display reports
  const getDisplayReports = (): DisplayReport[] => {
    const submitted = submittedReports.map(r => convertToDisplayReport(r, "submitted"));
    const queued = queuedReports.map(r => convertToDisplayReport(r, "queued"));

    let combined: DisplayReport[];
    switch (filterType) {
      case "synced":
        combined = submitted;
        break;
      case "pending":
        combined = queued;
        break;
      default:
        combined = [...queued, ...submitted]; // Show pending first
    }

    // Sort by date (most recent first)
    return combined.sort((a, b) => {
      const dateA = new Date(a.submittedAt || a.queuedAt || a.harvestDate).getTime();
      const dateB = new Date(b.submittedAt || b.queuedAt || b.harvestDate).getTime();
      return dateB - dateA;
    });
  };

  // Get total fish count
  const getTotalFish = (report: DisplayReport): number => {
    return (
      report.redDrumCount +
      report.flounderCount +
      report.spottedSeatroutCount +
      report.weakfishCount +
      report.stripedBassCount
    );
  };

  // Get species summary
  const getSpeciesSummary = (report: DisplayReport): string => {
    const species: string[] = [];
    if (report.redDrumCount > 0) species.push(`${report.redDrumCount} Red Drum`);
    if (report.flounderCount > 0) species.push(`${report.flounderCount} Flounder`);
    if (report.spottedSeatroutCount > 0) species.push(`${report.spottedSeatroutCount} Seatrout`);
    if (report.weakfishCount > 0) species.push(`${report.weakfishCount} Weakfish`);
    if (report.stripedBassCount > 0) species.push(`${report.stripedBassCount} Striped Bass`);
    return species.join(", ") || "No fish reported";
  };

  // Format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Render individual report card
  const renderReportItem: ListRenderItem<DisplayReport> = ({ item }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => setSelectedReport(item)}
      activeOpacity={0.7}
    >
      {/* Status Badges Row */}
      <View style={styles.badgesRow}>
        <View style={[
          styles.statusBadge,
          item.type === "queued" ? styles.statusBadgePending : styles.statusBadgeSynced
        ]}>
          <Feather
            name={item.type === "queued" ? "clock" : "check-circle"}
            size={12}
            color={item.type === "queued" ? colors.warning : colors.success}
          />
          <Text style={[
            styles.statusBadgeText,
            item.type === "queued" ? styles.statusBadgeTextPending : styles.statusBadgeTextSynced
          ]}>
            {item.type === "queued" ? "PENDING" : "SUBMITTED"}
          </Text>
        </View>

        {/* Raffle Badge */}
        {item.enteredRaffle && (
          <View style={styles.raffleBadge}>
            <Feather name="gift" size={12} color={colors.primary} />
            <Text style={styles.raffleBadgeText}>RAFFLE</Text>
          </View>
        )}
      </View>

      {/* Confirmation Number - PROMINENT */}
      <TouchableOpacity
        style={[
          styles.confirmationBox,
          item.type === "queued" && styles.confirmationBoxPending
        ]}
        onPress={() => handleCopyConfirmation(item.confirmationNumber)}
        activeOpacity={0.8}
      >
        <Text style={styles.confirmationLabel}>
          {item.type === "queued" ? "LOCAL #" : "CONFIRMATION #"}
        </Text>
        <Text style={[
          styles.confirmationNumber,
          item.type === "queued" && styles.confirmationNumberPending
        ]}>
          {item.confirmationNumber}
        </Text>
        <Text style={styles.confirmationHint}>Tap to copy</Text>
      </TouchableOpacity>

      {/* Report Details */}
      <View style={styles.reportDetails}>
        <View style={styles.reportRow}>
          <Feather name="calendar" size={14} color={colors.textSecondary} />
          <Text style={styles.reportRowText}>
            {formatDate(item.harvestDate)}
          </Text>
        </View>

        <View style={styles.reportRow}>
          <Feather name="map-pin" size={14} color={colors.textSecondary} />
          <Text style={styles.reportRowText} numberOfLines={1}>
            {item.areaLabel || `Area ${item.areaCode}`}
          </Text>
        </View>

        <View style={styles.reportRow}>
          <Feather name="anchor" size={14} color={colors.textSecondary} />
          <Text style={styles.reportRowText}>
            {getTotalFish(item)} fish • {item.usedHookAndLine ? "Hook & Line" : item.gearLabel}
          </Text>
        </View>
      </View>

      {/* Species Summary */}
      <Text style={styles.speciesSummary} numberOfLines={2}>
        {getSpeciesSummary(item)}
      </Text>

      {/* Retry Warning for Failed Queued Reports */}
      {item.type === "queued" && item.retryCount && item.retryCount > 0 && (
        <View style={styles.retryWarning}>
          <Feather name="alert-triangle" size={14} color={colors.warning} />
          <Text style={styles.retryWarningText}>
            Retry {item.retryCount} failed. Will try again when online.
          </Text>
        </View>
      )}

      {/* View Details Button */}
      <TouchableOpacity
        style={styles.viewDetailsButton}
        onPress={() => setSelectedReport(item)}
      >
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Feather name="chevron-right" size={16} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render detail modal
  const renderDetailModal = () => (
    <Modal
      visible={!!selectedReport}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedReport(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.modalXButton}
            onPress={() => setSelectedReport(null)}
            activeOpacity={0.7}
          >
            <Feather name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status Header */}
            <View style={[
              styles.modalStatusHeader,
              selectedReport?.type === "queued"
                ? styles.modalStatusHeaderPending
                : styles.modalStatusHeaderSynced
            ]}>
              <Feather
                name={selectedReport?.type === "queued" ? "clock" : "check-circle"}
                size={24}
                color={colors.white}
              />
              <Text style={styles.modalStatusText}>
                {selectedReport?.type === "queued" ? "Pending Sync" : "Submitted to DMF"}
              </Text>
            </View>

            {/* Confirmation Number */}
            <TouchableOpacity
              style={[
                styles.modalConfirmationBox,
                selectedReport?.type === "queued" && styles.modalConfirmationBoxPending,
              ]}
              onPress={() => selectedReport && handleCopyConfirmation(selectedReport.confirmationNumber)}
            >
              <Text style={[
                styles.modalConfirmationLabel,
                selectedReport?.type === "queued" && styles.modalConfirmationLabelPending,
              ]}>
                {selectedReport?.type === "queued" ? "LOCAL CONFIRMATION #" : "DMF CONFIRMATION #"}
              </Text>
              <Text style={[
                styles.modalConfirmationNumber,
                selectedReport?.type === "queued" && styles.modalConfirmationNumberPending,
              ]}>
                {selectedReport?.confirmationNumber}
              </Text>
              <Text style={styles.modalConfirmationHint}>
                Tap to copy
              </Text>
            </TouchableOpacity>

            {/* Photo if available */}
            {selectedReport?.catchPhoto && (
              <View style={styles.modalPhotoContainer}>
                <Image
                  source={{ uri: selectedReport.catchPhoto }}
                  style={styles.modalPhoto}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Harvest Details */}
            <View style={styles.modalDetailSection}>
              <Text style={styles.modalDetailTitle}>Harvest Details</Text>
              <View style={styles.modalDetailTable}>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Date</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedReport ? formatDate(selectedReport.harvestDate) : ""}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Location</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedReport?.areaLabel || `Area ${selectedReport?.areaCode}`}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Method</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedReport?.usedHookAndLine ? "Hook & Line" : selectedReport?.gearLabel}
                  </Text>
                </View>
                {selectedReport?.type === "submitted" && selectedReport.submittedAt && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Submitted</Text>
                    <Text style={styles.modalDetailValue}>
                      {formatDate(selectedReport.submittedAt)}
                    </Text>
                  </View>
                )}
                {selectedReport?.type === "queued" && selectedReport.queuedAt && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Queued</Text>
                    <Text style={styles.modalDetailValue}>
                      {formatDate(selectedReport.queuedAt)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Species Counts */}
            <View style={styles.modalDetailSection}>
              <Text style={styles.modalDetailTitle}>
                Fish Reported ({selectedReport ? getTotalFish(selectedReport) : 0} total)
              </Text>
              <View style={styles.modalDetailTable}>
                {selectedReport?.redDrumCount ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Red Drum</Text>
                    <Text style={styles.modalDetailValue}>{selectedReport.redDrumCount}</Text>
                  </View>
                ) : null}
                {selectedReport?.flounderCount ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Flounder</Text>
                    <Text style={styles.modalDetailValue}>{selectedReport.flounderCount}</Text>
                  </View>
                ) : null}
                {selectedReport?.spottedSeatroutCount ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Spotted Seatrout</Text>
                    <Text style={styles.modalDetailValue}>{selectedReport.spottedSeatroutCount}</Text>
                  </View>
                ) : null}
                {selectedReport?.weakfishCount ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Weakfish</Text>
                    <Text style={styles.modalDetailValue}>{selectedReport.weakfishCount}</Text>
                  </View>
                ) : null}
                {selectedReport?.stripedBassCount ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Striped Bass</Text>
                    <Text style={styles.modalDetailValue}>{selectedReport.stripedBassCount}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Angler Info */}
            {(selectedReport?.firstName || selectedReport?.lastName || selectedReport?.wrcId) && (
              <View style={styles.modalDetailSection}>
                <Text style={styles.modalDetailTitle}>Angler Information</Text>
                <View style={styles.modalDetailTable}>
                  {(selectedReport?.firstName || selectedReport?.lastName) && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Name</Text>
                      <Text style={styles.modalDetailValue}>
                        {[selectedReport?.firstName, selectedReport?.lastName].filter(Boolean).join(" ")}
                      </Text>
                    </View>
                  )}
                  {selectedReport?.wrcId && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>WRC ID</Text>
                      <Text style={styles.modalDetailValue}>{selectedReport.wrcId}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* DMF Object ID (for submitted) */}
            {selectedReport?.type === "submitted" && selectedReport.objectId && (
              <View style={styles.modalDetailSection}>
                <Text style={styles.modalDetailTitle}>DMF Reference</Text>
                <View style={styles.modalDetailTable}>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Object ID</Text>
                    <Text style={styles.modalDetailValue}>{selectedReport.objectId}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Raffle Entry Section */}
            {selectedReport?.enteredRaffle && (
              <View style={styles.modalRaffleSection}>
                <View style={styles.modalRaffleHeader}>
                  <Feather name="gift" size={20} color={colors.primary} />
                  <Text style={styles.modalRaffleTitle}>Raffle Entry</Text>
                </View>
                <Text style={styles.modalRaffleText}>
                  You entered the raffle with this report. Winners are contacted via email/phone at the end of each month.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedReport(null)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render empty state
  const renderEmptyState = () => {
    const isPending = filterType === "pending";
    const title = isPending ? "No Reports Pending" : "No Reports Yet";
    const description = isPending
      ? "All your reports have been submitted successfully."
      : filterType === "synced"
      ? "Your submitted reports will appear here."
      : "Your harvest reports will appear here after you submit them.";

    return (
      <View style={styles.emptyContainer}>
        <Feather
          name={isPending ? "check-circle" : "file-text"}
          size={64}
          color={isPending ? colors.success : colors.lightGray}
        />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyText}>{description}</Text>
        {filterType !== "pending" && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("ReportForm")}
          >
            <Feather name="plus" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.emptyButtonText}>Submit a Report</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const displayReports = getDisplayReports();

  // Custom header right element for test mode badge
  const headerRight = isTestMode() ? (
    <View style={styles.testModeBadge}>
      <Text style={styles.testModeBadgeText}>TEST</Text>
    </View>
  ) : undefined;

  if (loading) {
    return (
      <ScreenLayout
        navigation={navigation}
        title="Report History"
        noScroll
        loading={loading}
        loadingComponent={
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </>
        }
      />
    );
  }

  return (
    <ScreenLayout
      navigation={navigation}
      title="Report History"
      subtitle={`${submittedReports.length} submitted • ${queuedReports.length} pending`}
      headerRight={headerRight}
      noScroll
    >
      {/* Pending Banner */}
      {queuedReports.length > 0 && (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingBannerContent}>
            <Feather name="wifi-off" size={18} color={colors.warning} />
            <Text style={styles.pendingBannerText}>
              {queuedReports.length} report{queuedReports.length > 1 ? "s" : ""} pending sync
            </Text>
          </View>
          <Text style={styles.pendingBannerHint}>Pull down to refresh</Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterType === "all" && styles.filterButtonActive]}
          onPress={() => setFilterType("all")}
        >
          <Text style={[styles.filterButtonText, filterType === "all" && styles.filterButtonTextActive]}>
            All ({submittedReports.length + queuedReports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filterType === "synced" && styles.filterButtonActive]}
          onPress={() => setFilterType("synced")}
        >
          <Text style={[styles.filterButtonText, filterType === "synced" && styles.filterButtonTextActive]}>
            Submitted ({submittedReports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filterType === "pending" && styles.filterButtonActive]}
          onPress={() => setFilterType("pending")}
        >
          <Text style={[styles.filterButtonText, filterType === "pending" && styles.filterButtonTextActive]}>
            Pending ({queuedReports.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reports List */}
      <FlatList
        data={displayReports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.confirmationNumber}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {renderDetailModal()}
    </ScreenLayout>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  testModeBadge: {
    backgroundColor: "#ff9800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  testModeBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff8e1",
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  pendingBannerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  pendingBannerText: {
    ...typography.body,
    color: "#856404",
    marginLeft: spacing.sm,
  },
  pendingBannerHint: {
    ...typography.bodySmall,
    color: "#856404",
    fontStyle: "italic",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filterButton: {
    backgroundColor: colors.lightestGray,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  filterButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeSynced: {
    backgroundColor: "#e8f5e9",
  },
  statusBadgePending: {
    backgroundColor: "#fff8e1",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  statusBadgeTextSynced: {
    color: colors.success,
  },
  statusBadgeTextPending: {
    color: colors.warning,
  },
  raffleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: "#e3f2fd",
  },
  raffleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 0.5,
    color: colors.primary,
  },
  confirmationBox: {
    backgroundColor: "#f0f7f0",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.success,
  },
  confirmationBoxPending: {
    backgroundColor: "#fff8e1",
    borderColor: colors.warning,
  },
  confirmationLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.success,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  confirmationNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.success,
    letterSpacing: 2,
  },
  confirmationNumberPending: {
    color: colors.warning,
  },
  confirmationHint: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  reportDetails: {
    marginBottom: spacing.sm,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  reportRowText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  speciesSummary: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  retryWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  retryWarningText: {
    ...typography.bodySmall,
    color: "#856404",
    marginLeft: spacing.sm,
    flex: 1,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    marginTop: spacing.xs,
  },
  viewDetailsText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.white,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: "90%",
    maxHeight: "85%",
    padding: spacing.lg,
  },
  modalXButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  modalStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  modalStatusHeaderSynced: {
    backgroundColor: colors.success,
  },
  modalStatusHeaderPending: {
    backgroundColor: colors.warning,
  },
  modalStatusText: {
    ...typography.h3,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  modalConfirmationBox: {
    backgroundColor: "#f0f7f0",
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.success,
  },
  modalConfirmationBoxPending: {
    backgroundColor: "#fff8e1",
    borderColor: colors.warning,
  },
  modalConfirmationLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.success,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalConfirmationLabelPending: {
    color: colors.warning,
  },
  modalConfirmationNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.success,
    letterSpacing: 3,
  },
  modalConfirmationNumberPending: {
    color: colors.warning,
  },
  modalConfirmationHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 8,
  },
  modalPhotoContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalPhoto: {
    width: "100%",
    height: 180,
    borderRadius: borderRadius.md,
    backgroundColor: colors.lightGray,
  },
  modalDetailSection: {
    marginBottom: spacing.md,
  },
  modalDetailTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalDetailTable: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  modalDetailRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  modalDetailLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    backgroundColor: colors.lightestGray,
    padding: spacing.sm,
    width: "40%",
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  modalDetailValue: {
    ...typography.body,
    color: colors.textPrimary,
    padding: spacing.sm,
    flex: 1,
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  modalCloseButtonText: {
    ...typography.button,
    color: colors.white,
  },
  // Modal raffle section
  modalRaffleSection: {
    backgroundColor: "#e3f2fd",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  modalRaffleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  modalRaffleTitle: {
    ...typography.h3,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  modalRaffleText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default PastReportsScreen;
