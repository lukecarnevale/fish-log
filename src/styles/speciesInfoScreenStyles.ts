// styles/speciesInfoScreenStyles.ts
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from './common';

interface SpeciesInfoScreenStyles {
  container: ViewStyle;
  header: ViewStyle;
  headerTitle: TextStyle;
  headerSubtitle: TextStyle;
  searchContainer: ViewStyle;
  searchInput: TextStyle & ViewStyle;
  listContainer: ViewStyle;
  speciesCard: ViewStyle;
  speciesImage: ImageStyle;
  speciesBasicInfo: ViewStyle;
  speciesName: TextStyle;
  speciesScientific: TextStyle;
  speciesBrief: TextStyle;
  tapPrompt: TextStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
  // Detail view styles
  detailContainer: ViewStyle;
  backButton: ViewStyle;
  backButtonText: TextStyle;
  detailImage: ImageStyle;
  detailInfo: ViewStyle;
  detailName: TextStyle;
  detailScientific: TextStyle;
  divider: ViewStyle;
  sectionTitle: TextStyle;
  sectionText: TextStyle;
  regulationsBox: ViewStyle;
  regulationsTitle: TextStyle;
  regulationsText: TextStyle;
  regulationsFooter: TextStyle;
  reportButton: ViewStyle;
  reportButtonText: TextStyle;
}

const speciesInfoScreenStyles = StyleSheet.create<SpeciesInfoScreenStyles>({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.title,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.subtitle,
    color: colors.white,
    opacity: 0.9,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    ...shadows.medium,
  },
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
  speciesImage: {
    width: 120,
    height: 120,
    backgroundColor: colors.lightGray,
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
  tapPrompt: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
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
  detailImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.lightGray,
  },
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
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
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
  regulationsBox: {
    backgroundColor: colors.info,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  regulationsTitle: {
    ...typography.heading,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  regulationsText: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  regulationsFooter: {
    ...typography.caption,
    color: colors.darkGray,
    fontStyle: 'italic',
  },
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
});

export default speciesInfoScreenStyles;