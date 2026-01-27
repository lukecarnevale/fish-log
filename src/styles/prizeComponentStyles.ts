// styles/prizeComponentStyles.ts
import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from './common';

const prizeComponentStyles = StyleSheet.create({
  // Main container
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  
  // Header section with background image
  headerContainer: {
    height: 140,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.9,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.white,
    marginBottom: spacing.xxs,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitleContainer: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xxs,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '500',
  },
  badgeContainer: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.white,
  },
  
  // Prize info container
  infoContainer: {
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    width: 20,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  
  // Prize carousel
  carouselContainer: {
    paddingBottom: spacing.md,
    minHeight: 170, // Ensure enough height for the prizes
  },
  carouselTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  carousel: {
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    height: 170, // Fixed height to ensure scrollable area
  },
  prizeCard: {
    width: 180, // Slightly wider cards
    marginRight: spacing.md,
    backgroundColor: colors.white, // Changed to white for better appearance
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginVertical: spacing.xs, // Add vertical margins
    height: 150, // Fixed height for consistency
  },
  prizeImage: {
    width: '100%',
    height: 90,
    backgroundColor: colors.lightestGray,
  },
  prizeContent: {
    padding: spacing.sm,
  },
  prizeName: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  prizeValue: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  
  // Footer section
  footer: {
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.primary,
    flex: 1,
  },
  reportButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportButtonText: {
    ...typography.button,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  
  // Progress bar
  progressGradient: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  progressTitle: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  progressCount: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  progressBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: colors.lightGray,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 5,
  },
  daysLeftText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accent,
    marginLeft: spacing.sm,
    minWidth: 80,
    textAlign: 'right',
  },
  progressSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  
  // Info bubble for terms - now clickable
  infoBubble: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoBubbleIcon: {
    marginRight: spacing.sm,
  },
  infoBubbleText: {
    ...typography.bodySmall,
    color: colors.white,
    flex: 1,
    fontWeight: '600',
    lineHeight: 20,
    marginRight: spacing.xs,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  modalScrollContent: {
    padding: spacing.lg,
  },
  modalHeader: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalSection: {
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modalPrizeList: {
    marginBottom: spacing.sm,
  },
  modalPrizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalPrizeIcon: {
    marginRight: spacing.sm,
  },
  modalPrizeText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalButtonContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default prizeComponentStyles;