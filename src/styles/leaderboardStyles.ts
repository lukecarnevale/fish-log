// styles/leaderboardStyles.ts
import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from './common';

const leaderboardStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
    fontSize: 20,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  segmentControl: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: -spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeSegment: {
    backgroundColor: colors.primaryLight,
  },
  segmentText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  activeSegmentText: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg, // Added top padding to create space for badges
    paddingBottom: spacing.xxl,
  },
  leaderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rankTop3: {
    backgroundColor: colors.warning,
  },
  rankText: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  rankTop3Text: {
    color: colors.white,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  userStatsRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  userStat: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    ...typography.h2,
    color: colors.primary,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badgeContainer: {
    position: 'absolute',
    top: -24, // Moved even higher to completely avoid overlapping with numbers
    right: -20,
    backgroundColor: colors.accent,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 2, // Ensure badge appears on top
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.white,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl, // Increased from md to xl to provide more space
  },
  filterLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: colors.lightestGray,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  filterActiveButton: {
    backgroundColor: colors.primaryLight,
  },
  filterButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  filterActiveButtonText: {
    color: colors.primary,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionHeaderText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '85%',
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  modalPrimaryButton: {
    backgroundColor: colors.primary,
  },
  modalSecondaryButton: {
    backgroundColor: colors.lightGray,
  },
  modalButtonText: {
    ...typography.button,
  },
  modalPrimaryButtonText: {
    color: colors.white,
  },
  modalSecondaryButtonText: {
    color: colors.textPrimary,
  },
  statsCard: {
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
  statsHeader: {
    ...typography.subtitle,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statsLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  statsValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  chartContainer: {
    marginTop: spacing.md,
    height: 200,
  },
  // Styles for main tabs
  mainTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: -spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.md,
  },
  mainTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeMainTab: {
    backgroundColor: colors.primaryLight,
  },
  mainTabText: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  activeMainTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  statsScrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  actionButtonContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonIcon: {
    marginRight: spacing.sm,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '600',
  },
});

export default leaderboardStyles;