// screens/PastReportsScreen.tsx
//
// History screen for viewing past harvest reports with DMF confirmation numbers.
// Integrates with offlineQueue service to show synced and pending reports.
//

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  ListRenderItem,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { StackNavigationProp } from "@react-navigation/stack";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { RootStackParamList } from "../types";
import { SubmittedReport, QueuedReport } from "../types/harvestReport";
import { colors, spacing, typography, borderRadius } from "../styles/common";
import { isTestMode } from "../config/appConfig";
import ScreenLayout from "../components/ScreenLayout";
import { useAllFishSpecies } from "../api/speciesApi";
import { SCREEN_LABELS } from "../constants/screenLabels";

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

// Fish entry with lengths for detailed display
interface FishEntryDisplay {
  species: string;
  count: number;
  lengths?: string[];
  tagNumber?: string;
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
  // Fish entries with individual lengths
  fishEntries?: FishEntryDisplay[];
}

const PastReportsScreen: React.FC<PastReportsScreenProps> = ({ navigation }) => {
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>([]);
  const [queuedReports, setQueuedReports] = useState<QueuedReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<DisplayReport | null>(null);
  const [filterType, setFilterType] = useState<"all" | "synced" | "pending">("all");

  // Fetch species data for stock images
  const { data: fishSpeciesData = [] } = useAllFishSpecies();

  // Map species names to their stock images
  const getSpeciesImage = (speciesName: string): string | null => {
    const species = fishSpeciesData.find(
      (s) => s.name.toLowerCase().includes(speciesName.toLowerCase()) ||
             speciesName.toLowerCase().includes(s.name.toLowerCase())
    );
    return species?.images?.primary || null;
  };

  // Get the best image for a report (user photo or primary species stock image)
  const getReportImage = (report: DisplayReport): string | null => {
    // User's catch photo takes priority
    if (report.catchPhoto) return report.catchPhoto;

    // Otherwise, find stock image for primary species
    if (report.redDrumCount > 0) return getSpeciesImage("Red Drum");
    if (report.flounderCount > 0) return getSpeciesImage("Southern Flounder");
    if (report.spottedSeatroutCount > 0) return getSpeciesImage("Spotted Seatrout");
    if (report.stripedBassCount > 0) return getSpeciesImage("Striped Bass");
    if (report.weakfishCount > 0) return getSpeciesImage("Weakfish");

    return null;
  };

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
        fishEntries: submitted.fishEntries,
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
        fishEntries: queued.fishEntries,
      };
    }
  };

  // Get combined and sorted display reports - memoized for performance
  const displayReports = useMemo((): DisplayReport[] => {
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
  }, [submittedReports, queuedReports, filterType]);

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

  // Get species chips for display
  const getSpeciesChips = (report: DisplayReport): Array<{ name: string; count: number }> => {
    const chips: Array<{ name: string; count: number }> = [];
    if (report.redDrumCount > 0) chips.push({ name: "Red Drum", count: report.redDrumCount });
    if (report.flounderCount > 0) chips.push({ name: "Flounder", count: report.flounderCount });
    if (report.spottedSeatroutCount > 0) chips.push({ name: "Seatrout", count: report.spottedSeatroutCount });
    if (report.weakfishCount > 0) chips.push({ name: "Weakfish", count: report.weakfishCount });
    if (report.stripedBassCount > 0) chips.push({ name: "Striped Bass", count: report.stripedBassCount });
    return chips;
  };

  // Memoized keyExtractor for FlatList performance
  const keyExtractor = useCallback((item: DisplayReport) => item.confirmationNumber, []);

  // Render individual report card - memoized for performance
  const renderReportItem: ListRenderItem<DisplayReport> = useCallback(({ item }) => {
    const speciesChips = getSpeciesChips(item);
    const totalFish = getTotalFish(item);
    const isPending = item.type === "queued";
    const reportImage = getReportImage(item);
    const isUserPhoto = !!item.catchPhoto;

    return (
      <TouchableOpacity
        style={[styles.reportCard, isPending && styles.reportCardPending]}
        onPress={() => setSelectedReport(item)}
        activeOpacity={0.8}
      >
        {/* Raffle Badge - Top Left */}
        {item.enteredRaffle && (
          <View style={styles.raffleBadgeContainer}>
            <View style={styles.raffleBadge}>
              <Feather name="gift" size={28} color="#7B1FA2" />
            </View>
          </View>
        )}

        {/* Status Icon - Top Right */}
        <View style={styles.statusIconContainer}>
          {isPending ? (
            <View style={styles.pendingStatusBadge}>
              <Feather name="clock" size={24} color={colors.warning} />
            </View>
          ) : (
            <View style={styles.syncedStatusBadge}>
              <Feather name="check-circle" size={28} color={colors.success} />
            </View>
          )}
        </View>

        {/* Main Card Content */}
        <View style={styles.cardContent}>
          {/* Info Section - Left */}
          <View style={styles.infoSection}>
            {/* Date */}
            <Text style={styles.cardDate}>{formatDate(item.harvestDate)}</Text>

            {/* Location */}
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={colors.textSecondary} />
              <Text style={styles.cardLocation} numberOfLines={1}>
                {item.areaLabel || `Area ${item.areaCode}`}
              </Text>
            </View>

            {/* Species Tags */}
            <View style={styles.speciesTagsContainer}>
              {speciesChips.length > 0 ? (
                speciesChips.slice(0, 3).map((chip, index) => (
                  <View key={index} style={styles.speciesTag}>
                    <Text style={styles.speciesTagCount}>{chip.count}</Text>
                    <Text style={styles.speciesTagName}>{chip.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noFishText}>No fish reported</Text>
              )}
              {speciesChips.length > 3 && (
                <Text style={styles.moreSpeciesText}>+{speciesChips.length - 3} more</Text>
              )}
            </View>

            {/* Footer Row */}
            <View style={styles.cardFooter}>
              <View style={styles.footerLeft}>
                <Feather name="anchor" size={14} color={colors.primary} />
                <Text style={styles.fishCountText}>{totalFish} fish</Text>
                <Text style={styles.methodDivider}>•</Text>
                <Text style={styles.methodText}>
                  {item.usedHookAndLine ? "Hook & Line" : (item.gearLabel || "Other")}
                </Text>
              </View>
            </View>
          </View>

          {/* Photo Section - Right */}
          <View style={styles.photoSection}>
            {reportImage ? (
              <View style={styles.cardPhotoContainer}>
                <Image
                  source={{ uri: reportImage }}
                  style={styles.cardPhoto}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              </View>
            ) : (
              <View style={styles.cardPhotoPlaceholder}>
                <Feather name="image" size={28} color={colors.lightGray} />
              </View>
            )}
            {isUserPhoto && (
              <View style={styles.userPhotoBadge}>
                <Feather name="camera" size={10} color="#fff" />
              </View>
            )}
          </View>
        </View>

        {/* Perforation Line */}
        <View style={styles.perforationContainer}>
          <View style={styles.perforationNotchLeft} />
          <View style={styles.perforationLine}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View key={i} style={styles.perforationDot} />
            ))}
          </View>
          <View style={styles.perforationNotchRight} />
        </View>

        {/* Footer - Confirmation Number */}
        <View style={[
          styles.confirmationRow,
          !isPending && styles.confirmationRowBottom
        ]}>
          <Text style={styles.confirmationLabel}>Confirmation</Text>
          <Text style={styles.confirmationNumber}>#{item.confirmationNumber}</Text>
        </View>

        {/* Pending Banner */}
        {isPending && (
          <View style={styles.cardPendingBanner}>
            <Feather name="wifi-off" size={14} color={colors.warning} />
            <Text style={styles.cardPendingBannerText}>
              {item.retryCount && item.retryCount > 0
                ? `Sync failed (${item.retryCount}x) — will retry`
                : "Pending sync to DMF"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [fishSpeciesData]);

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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
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
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
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

            {/* Species Counts with Lengths */}
            <View style={styles.modalDetailSection}>
              <Text style={styles.modalDetailTitle}>
                Fish Reported ({selectedReport ? getTotalFish(selectedReport) : 0} total)
              </Text>
              <View style={styles.modalDetailTable}>
                {selectedReport?.fishEntries && selectedReport.fishEntries.length > 0 ? (
                  // Show detailed fish entries with lengths if available
                  selectedReport.fishEntries.map((entry, index) => (
                    <View key={`${entry.species}-${index}`}>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>{entry.species}</Text>
                        <Text style={styles.modalDetailValue}>{entry.count}</Text>
                      </View>
                      {entry.lengths && entry.lengths.length > 0 && (
                        <View style={styles.modalLengthsRow}>
                          <Text style={styles.modalLengthsLabel}>Lengths:</Text>
                          <Text style={styles.modalLengthsValue}>
                            {entry.lengths.map(l => `${l}"`).join(", ")}
                          </Text>
                        </View>
                      )}
                      {entry.tagNumber && (
                        <View style={styles.modalLengthsRow}>
                          <Text style={styles.modalLengthsLabel}>Tag #:</Text>
                          <Text style={styles.modalLengthsValue}>{entry.tagNumber}</Text>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  // Fallback to showing counts only (older reports without fishEntries)
                  <>
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
                  </>
                )}
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
        title={SCREEN_LABELS.pastReports.title}
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
      title={SCREEN_LABELS.pastReports.title}
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
        keyExtractor={keyExtractor}
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
        // Performance optimizations
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        initialNumToRender={6}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    position: "relative",
  },
  reportCardPending: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  statusIconContainer: {
    position: "absolute",
    top: -22,
    right: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  pendingStatusBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff8e1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: colors.white,
  },
  syncedStatusBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: colors.white,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardDate: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  cardLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  raffleBadgeContainer: {
    position: "absolute",
    top: -22,
    left: -10,
    zIndex: 10,
  },
  raffleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E1BEE7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: colors.white,
  },
  confirmationNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  confirmationRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    marginTop: 0,
    marginHorizontal: -spacing.md,
    backgroundColor: colors.primaryLight,
  },
  confirmationRowBottom: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  confirmationLabel: {
    fontSize: 12,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
    fontWeight: "600",
  },
  perforationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    marginHorizontal: -spacing.md,
    height: 0,
    overflow: "visible",
  },
  perforationNotchLeft: {
    width: 12,
    height: 24,
    backgroundColor: colors.background,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginLeft: -1,
    marginTop: -12,
  },
  perforationNotchRight: {
    width: 12,
    height: 24,
    backgroundColor: colors.background,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: -1,
    marginTop: -12,
  },
  perforationLine: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginTop: -4,
  },
  perforationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  speciesTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.sm,
  },
  speciesTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  speciesTagCount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    marginRight: 5,
  },
  speciesTagName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  noFishText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fishCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fishCountText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
  methodText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff8e1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.warning,
  },
  syncedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  retryBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: spacing.sm,
    gap: 8,
  },
  retryText: {
    fontSize: 12,
    color: "#c0392b",
    fontWeight: "500",
    flex: 1,
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
    overflow: "hidden",
  },
  modalScrollContent: {
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
  modalLengthsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.lightestGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  modalLengthsLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginRight: spacing.sm,
  },
  modalLengthsValue: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
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
  // New card layout styles
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  photoSection: {
    position: "relative",
    marginLeft: spacing.md,
    alignSelf: "center",
  },
  cardPhotoContainer: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.white,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  cardPhoto: {
    width: "100%",
    height: "100%",
  },
  cardPhotoPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  userPhotoBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  infoSection: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warning,
  },
  moreSpeciesText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
    alignSelf: "center",
  },
  methodDivider: {
    fontSize: 14,
    color: colors.lightGray,
  },
  chevronContainer: {
    marginLeft: spacing.sm,
    paddingLeft: spacing.sm,
  },
  cardPendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff8e1",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginHorizontal: -spacing.md,
    gap: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  cardPendingBannerText: {
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
    flex: 1,
  },
});

export default PastReportsScreen;
