// styles/confirmationScreenStyles.ts
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from './common';

interface ConfirmationScreenStyles {
  container: ViewStyle;
  content: ViewStyle;
  header: ViewStyle;
  icon: ImageStyle;
  title: TextStyle;
  subtitle: TextStyle;
  summaryContainer: ViewStyle;
  summaryTitle: TextStyle;
  summaryRow: ViewStyle;
  summaryLabel: TextStyle;
  summaryValue: TextStyle;
  photoContainer: ViewStyle;
  photo: ImageStyle;
  infoContainer: ViewStyle;
  infoTitle: TextStyle;
  infoText: TextStyle;
  reportIdText: TextStyle;
  buttonContainer: ViewStyle;
  button: ViewStyle;
  buttonText: TextStyle;
  secondaryButton: ViewStyle;
  secondaryButtonText: TextStyle;
}

const confirmationScreenStyles = StyleSheet.create<ConfirmationScreenStyles>({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: spacing.md,
    tintColor: colors.success,
  },
  title: {
    ...typography.largeTitle,
    color: colors.success,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.subtitle,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  summaryContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  summaryTitle: {
    ...typography.heading,
    marginBottom: spacing.md,
    color: colors.black,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.darkGray,
  },
  summaryValue: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.black,
    maxWidth: '60%',
    textAlign: 'right',
  },
  photoContainer: {
    marginTop: spacing.md,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  infoContainer: {
    backgroundColor: colors.info,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.small,
  },
  infoTitle: {
    ...typography.heading,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.darkGray,
    marginBottom: spacing.md,
  },
  reportIdText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.darkGray,
  },
  buttonContainer: {
    marginVertical: spacing.lg,
  },
  button: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  buttonText: {
    ...typography.buttonText,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...typography.buttonText,
    color: colors.primary,
  },
});

export default confirmationScreenStyles;