// styles/enhancedSpeciesStyles.ts
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows, modals } from './common';
import { Theme } from './theme';

const enhancedSpeciesStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header styles
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.title,
    color: colors.white,
    fontSize: 20,
  },
  headerSubtitle: {
    ...typography.subtitle,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  
  // Search and filter section
  searchFilterContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.md,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    ...shadows.medium,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  filterButtonText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginLeft: spacing.xxs,
  },
  filterActiveButton: {
    backgroundColor: colors.primary,
  },
  filterActiveText: {
    color: colors.white,
  },
  categoryTabs: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  categoryTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginRight: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryActiveTab: {
    backgroundColor: colors.primary,
  },
  categoryTabText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  categoryActiveTabText: {
    color: colors.white,
  },
  
  // Fish species list
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  speciesCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  imageContainer: {
    position: 'relative',
    width: 90,
    height: 100,
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  imageWrapper: {
    width: 90,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  speciesImage: {
    width: 82,
    height: 68,
    backgroundColor: 'transparent',
  },
  placeholderImageContainer: {
    width: 82,
    height: 68,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImage: {
    width: 80,
    height: 80,
    opacity: 0.7,
    tintColor: colors.mediumGray,
  },
  speciesBasicInfo: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  speciesName: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  speciesScientific: {
    ...typography.caption,
    fontStyle: 'italic',
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  speciesBrief: {
    ...typography.bodySmall,
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },
  
  // Season indicator
  seasonIndicator: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  seasonDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.xs,
    marginRight: spacing.xxs,
  },
  seasonActive: {
    backgroundColor: colors.success,
  },
  seasonInactive: {
    backgroundColor: colors.lightGray,
  },
  seasonText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xxs,
  },
  
  // Regulation and status indicators
  statusBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.warning,
    zIndex: 10, // Higher z-index to ensure it appears on top
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5, // Higher elevation for Android
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  statusText: {
    ...typography.caption,
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  tapPrompt: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  
  // Card regulations styles
  cardRegulationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    marginBottom: spacing.xxs,
  },
  cardRegulationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightestGray,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    marginRight: spacing.xs,
    marginBottom: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardRegulationIcon: {
    marginRight: spacing.xxs,
  },
  cardRegulationText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Empty state
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.darkGray,
    textAlign: 'center',
  },
  
  // Detail view styles
  detailContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Image gallery
  imageGallery: {
    height: 220,
  },
  galleryImage: {
    width: '100%',
    height: 220,
    backgroundColor: 'transparent',
  },
  paginationDots: {
    position: 'absolute',
    bottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.white,
    opacity: 0.5,
    marginHorizontal: 4,
  },
  paginationActiveDot: {
    opacity: 1,
  },
  
  // Detail content
  detailInfo: {
    padding: spacing.lg,
  },
  detailName: {
    ...typography.largeTitle,
    color: colors.black,
    marginBottom: spacing.xxs,
  },
  detailScientific: {
    ...typography.subtitle,
    fontStyle: 'italic',
    color: colors.darkGray,
    marginBottom: spacing.md,
  },
  commonNames: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailsColumn: {
    flex: 1,
  },
  detailsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  detailsValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  
  // Section styles
  sectionTitle: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionText: {
    ...typography.body,
    color: colors.darkGray,
    lineHeight: 24,
  },
  
  // Regulations box
  regulationsBox: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg / 2,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  regulationsTitle: {
    ...typography.heading,
    color: colors.white,
    marginBottom: spacing.md,
    fontSize: 20,
    fontWeight: '700',
  },
  regulationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  regulationIcon: {
    width: 28,
    height: 28,
    marginRight: spacing.sm,
  },
  regulationLabel: {
    ...typography.body,
    color: colors.primary,
    width: 90,
    fontWeight: '600',
  },
  regulationValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.black,
    flex: 1,
  },
  regulationsNotes: {
    ...typography.body,
    color: colors.white,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    fontWeight: '500',
  },
  regulationsFooter: {
    ...typography.bodySmall,
    color: colors.white,
    fontStyle: 'italic',
    marginTop: spacing.md,
    textAlign: 'center',
    opacity: 0.9,
  },
  
  // Fishing tips section
  tipCategory: {
    marginBottom: spacing.md,
  },
  tipCategoryTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tipsList: {
    marginLeft: spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  tipBullet: {
    ...typography.body,
    color: colors.primary,
    marginRight: spacing.xs,
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  
  // Conservation status
  conservationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.md,
    marginVertical: spacing.md,
  },
  statusIcon: {
    width: 24,
    height: 24,
    marginRight: spacing.sm,
  },
  statusDescription: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  
  // Similar species section
  similarSpeciesCard: {
    padding: spacing.md,
    paddingBottom: spacing.md + 28,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  similarSpeciesImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: spacing.md,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  similarSpeciesInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  similarSpeciesName: {
    ...typography.subtitle,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontWeight: '600',
    fontSize: 16,
  },
  similarSpeciesFeatures: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  
  // Report button
  reportButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.medium,
  },
  reportButtonText: {
    ...typography.buttonText,
    color: colors.white,
  },
  
  // Filter modal - uses modals.overlayBottomSheet from common
  modalOverlay: modals.overlayBottomSheet,
  filterModal: modals.contentBottomSheet,
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterSectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  filterOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterOptionText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  filterOptionSelectedText: {
    color: colors.primary,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  applyButtonText: {
    ...typography.buttonText,
    color: colors.white,
  },
  resetFiltersButton: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  resetFiltersText: {
    ...typography.bodySmall,
    color: colors.danger,
  },
});

export default enhancedSpeciesStyles;

// Theme-aware factory mirroring `enhancedSpeciesStyles` above.
// All `colors.xxx` references are swapped for `theme.colors.xxx`.
// rgba() literals, gradient arrays, spacing/typography/borderRadius and
// shadow/modal helpers are intentionally left untouched.
export const createEnhancedSpeciesStyles = (theme: Theme) =>
  StyleSheet.create({
    // Container styles
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Header styles
    header: {
      backgroundColor: theme.colors.primary,
      paddingTop: 60,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    headerTitle: {
      ...typography.title,
      color: theme.colors.white,
      fontSize: 20,
    },
    headerSubtitle: {
      ...typography.subtitle,
      color: theme.colors.white,
      opacity: 0.9,
      textAlign: 'center',
    },

    // Search and filter section
    searchFilterContainer: {
      paddingHorizontal: spacing.lg,
      marginTop: -spacing.lg,
      marginBottom: spacing.md,
      zIndex: 1,
    },
    searchInput: {
      backgroundColor: theme.colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: 16,
      ...shadows.medium,
    },
    filterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.white,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      marginRight: spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...shadows.small,
    },
    filterButtonText: {
      ...typography.bodySmall,
      color: theme.colors.textPrimary,
      marginLeft: spacing.xxs,
    },
    filterActiveButton: {
      backgroundColor: theme.colors.primary,
    },
    filterActiveText: {
      color: theme.colors.white,
    },
    categoryTabs: {
      flexDirection: 'row',
      marginTop: spacing.sm,
    },
    categoryTab: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      marginRight: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryActiveTab: {
      backgroundColor: theme.colors.primary,
    },
    categoryTabText: {
      ...typography.caption,
      color: theme.colors.textPrimary,
    },
    categoryActiveTabText: {
      color: theme.colors.white,
    },

    // Fish species list
    listContainer: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    speciesCard: {
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.lg,
      flexDirection: 'row',
      overflow: 'hidden',
      marginBottom: spacing.md,
      ...shadows.medium,
    },
    imageContainer: {
      // Inset photo card: floats within the card with its own rounding.
      // Fish PNGs have white backgrounds — giving the container its own white
      // rounded shape makes it look like a framed photo print on the dark card
      // rather than a white panel bleeding edge-to-edge.
      position: 'relative',
      width: 90,
      height: 100,
      margin: 10,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
      // Border matches the species name text color for visual consistency
      borderWidth: 2.5,
      borderColor: theme.isDark ? theme.colors.primary : theme.colors.border,
    },
    imageWrapper: {
      width: 90,
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    speciesImage: {
      width: 82,
      height: 68,
      backgroundColor: 'transparent',
    },
    placeholderImageContainer: {
      width: 82,
      height: 68,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderImage: {
      width: 80,
      height: 80,
      opacity: 0.7,
      tintColor: theme.colors.mediumGray,
    },
    speciesBasicInfo: {
      flex: 1,
      padding: spacing.md,
      justifyContent: 'center',
    },
    speciesName: {
      ...typography.heading,
      color: theme.colors.primary,
      marginBottom: spacing.xxs,
    },
    speciesScientific: {
      ...typography.caption,
      fontStyle: 'italic',
      color: theme.colors.darkGray,
      marginBottom: spacing.xs,
    },
    speciesBrief: {
      ...typography.bodySmall,
      color: theme.colors.darkGray,
      marginBottom: spacing.xs,
    },

    // Season indicator
    seasonIndicator: {
      flexDirection: 'row',
      marginTop: spacing.xs,
      alignItems: 'center',
    },
    seasonDot: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.xs,
      marginRight: spacing.xxs,
    },
    seasonActive: {
      backgroundColor: theme.colors.success,
    },
    seasonInactive: {
      backgroundColor: theme.colors.lightGray,
    },
    seasonText: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      marginLeft: spacing.xxs,
    },

    // Regulation and status indicators
    statusBadge: {
      position: 'absolute',
      top: spacing.xs,
      left: spacing.xs,
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm,
      backgroundColor: theme.colors.warning,
      zIndex: 10, // Higher z-index to ensure it appears on top
      shadowColor: 'rgba(0,0,0,0.3)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.8,
      shadowRadius: 2,
      elevation: 5, // Higher elevation for Android
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.7)',
    },
    statusText: {
      ...typography.caption,
      color: theme.colors.white,
      fontSize: 11,
      fontWeight: 'bold',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 1,
    },
    tapPrompt: {
      ...typography.caption,
      color: theme.colors.primary,
      fontWeight: '600',
      marginTop: spacing.xs,
    },

    // Card regulations styles
    cardRegulationsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.xs,
      marginBottom: spacing.xxs,
    },
    cardRegulationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.lightestGray,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
      marginRight: spacing.xs,
      marginBottom: spacing.xxs,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    cardRegulationIcon: {
      marginRight: spacing.xxs,
    },
    cardRegulationText: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },

    // Empty state
    emptyContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      ...typography.body,
      color: theme.colors.darkGray,
      textAlign: 'center',
    },

    // Detail view styles
    detailContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButtonText: {
      ...typography.body,
      color: theme.colors.primary,
      fontWeight: '600',
    },

    // Image gallery
    imageGallery: {
      height: 220,
    },
    galleryImage: {
      width: '100%',
      height: 220,
      backgroundColor: 'transparent',
    },
    paginationDots: {
      position: 'absolute',
      bottom: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'center',
      width: '100%',
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.xs,
      backgroundColor: theme.colors.white,
      opacity: 0.5,
      marginHorizontal: 4,
    },
    paginationActiveDot: {
      opacity: 1,
    },

    // Detail content
    detailInfo: {
      padding: spacing.lg,
    },
    detailName: {
      ...typography.largeTitle,
      color: theme.colors.black,
      marginBottom: spacing.xxs,
    },
    detailScientific: {
      ...typography.subtitle,
      fontStyle: 'italic',
      color: theme.colors.darkGray,
      marginBottom: spacing.md,
    },
    commonNames: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: spacing.md,
    },
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    detailsColumn: {
      flex: 1,
    },
    detailsLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    detailsValue: {
      ...typography.bodySmall,
      color: theme.colors.textPrimary,
      fontWeight: '500',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginVertical: spacing.md,
    },

    // Section styles
    sectionTitle: {
      ...typography.heading,
      color: theme.colors.primary,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    sectionText: {
      ...typography.body,
      color: theme.colors.darkGray,
      lineHeight: 24,
    },

    // Regulations box
    regulationsBox: {
      // Dark mode: use primaryDark — consistent with all other header surfaces
      // and less glaring than the bright primary (#3A8AC2) on a dark screen.
      backgroundColor: theme.isDark ? theme.colors.primaryDark : theme.colors.primary,
      padding: spacing.lg,
      borderRadius: borderRadius.md,
      marginTop: spacing.lg / 2,
      marginBottom: spacing.lg,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    regulationsTitle: {
      ...typography.heading,
      color: theme.colors.textOnPrimary,
      marginBottom: spacing.md,
      fontSize: 20,
      fontWeight: '700',
    },
    regulationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      backgroundColor: 'rgba(255,255,255,0.9)',
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    regulationIcon: {
      width: 28,
      height: 28,
      marginRight: spacing.sm,
    },
    regulationLabel: {
      ...typography.body,
      // Row background is always rgba(255,255,255,0.9) — use primaryDark so
      // the label stays readable in dark mode (primary #3A8AC2 is still fine
      // but primaryDark is richer against white).
      color: theme.isDark ? theme.colors.primaryDark : theme.colors.primary,
      width: 90,
      fontWeight: '600',
    },
    regulationValue: {
      ...typography.body,
      fontWeight: '600',
      // Row background is always rgba(255,255,255,0.9) — hardcode dark text so
      // it stays readable in both modes. theme.colors.black = #E0E6ED in dark
      // (off-white), making the value near-invisible on the white pill.
      color: '#263238',
      flex: 1,
    },
    regulationsNotes: {
      ...typography.body,
      color: theme.colors.white,
      marginTop: spacing.md,
      backgroundColor: 'rgba(255,255,255,0.2)',
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      fontWeight: '500',
    },
    regulationsFooter: {
      ...typography.bodySmall,
      color: theme.colors.white,
      fontStyle: 'italic',
      marginTop: spacing.md,
      textAlign: 'center',
      opacity: 0.9,
    },

    // Fishing tips section
    tipCategory: {
      marginBottom: spacing.md,
    },
    tipCategoryTitle: {
      ...typography.subtitle,
      color: theme.colors.textPrimary,
      marginBottom: spacing.xs,
    },
    tipsList: {
      marginLeft: spacing.md,
    },
    tipItem: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    tipBullet: {
      ...typography.body,
      color: theme.colors.primary,
      marginRight: spacing.xs,
    },
    tipText: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
      flex: 1,
    },

    // Conservation status
    conservationStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      backgroundColor: theme.colors.lightGray,
      borderRadius: borderRadius.md,
      marginVertical: spacing.md,
    },
    statusIcon: {
      width: 24,
      height: 24,
      marginRight: spacing.sm,
    },
    statusDescription: {
      ...typography.bodySmall,
      color: theme.colors.textPrimary,
      flex: 1,
    },

    // Similar species section
    similarSpeciesCard: {
      padding: spacing.md,
      paddingBottom: spacing.md + 28,
      backgroundColor: theme.colors.white,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    similarSpeciesImage: {
      width: 70,
      height: 70,
      borderRadius: 35,
      marginRight: spacing.md,
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.colors.primaryLight,
    },
    similarSpeciesInfo: {
      flex: 1,
      paddingRight: spacing.sm,
    },
    similarSpeciesName: {
      ...typography.subtitle,
      color: theme.colors.primary,
      marginBottom: spacing.xs,
      fontWeight: '600',
      fontSize: 16,
    },
    similarSpeciesFeatures: {
      ...typography.body,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    chevronContainer: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.xs,
    },

    // Report button
    reportButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
      ...shadows.medium,
    },
    reportButtonText: {
      ...typography.buttonText,
      color: theme.colors.white,
    },

    // Filter modal - uses modals.overlayBottomSheet from common
    modalOverlay: modals.overlayBottomSheet,
    filterModal: modals.contentBottomSheet,
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      ...typography.heading,
      color: theme.colors.textPrimary,
    },
    closeButton: {
      padding: spacing.xs,
    },
    filterSection: {
      marginBottom: spacing.lg,
    },
    filterSectionTitle: {
      ...typography.subtitle,
      color: theme.colors.textPrimary,
      marginBottom: spacing.sm,
    },
    filterOptionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    filterOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: spacing.sm,
      marginBottom: spacing.sm,
    },
    filterOptionSelected: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
    },
    filterOptionText: {
      ...typography.bodySmall,
      color: theme.colors.textPrimary,
    },
    filterOptionSelectedText: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    applyButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    applyButtonText: {
      ...typography.buttonText,
      color: theme.colors.white,
    },
    resetFiltersButton: {
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    resetFiltersText: {
      ...typography.bodySmall,
      color: theme.colors.danger,
    },
  });