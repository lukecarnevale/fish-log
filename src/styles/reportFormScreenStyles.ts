// styles/reportFormScreenStyles.ts
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from './common';

interface ReportFormScreenStyles {
  container: ViewStyle;
  headerAccent: ViewStyle;
  scrollContainer: ViewStyle;
  scrollContent: ViewStyle;
  content: ViewStyle;
  section: ViewStyle;
  sectionTitle: TextStyle;
  label: TextStyle;
  input: TextStyle & ViewStyle;
  textArea: TextStyle & ViewStyle;
  selectorButton: ViewStyle;
  selectorText: TextStyle;
  selectorPlaceholder: TextStyle;
  selectorArrow: TextStyle;
  datePickerButton: ViewStyle;
  dateText: TextStyle;
  locationContainer: ViewStyle;
  locationRow: ViewStyle;
  switchContainer: ViewStyle;
  switchLabel: TextStyle;
  disabledInput: ViewStyle;
  submitButton: ViewStyle;
  submitButtonText: TextStyle;
  requiredFields: TextStyle;
  photoInstructions: TextStyle;
  photoButtons: ViewStyle;
  photoButton: ViewStyle;
  photoButtonText: TextStyle;
  photoPreviewContainer: ViewStyle;
  photoPreview: ImageStyle;
  modalContainer: ViewStyle;
  modalContent: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  closeButton: TextStyle;
  optionItem: ViewStyle;
  optionText: TextStyle;
  checkmark: TextStyle;
  separator: ViewStyle;
  licenseRow: ViewStyle;
  licenseButton: ViewStyle;
  licenseButtonText: TextStyle;
}

// Get forms from common.ts
import { forms as commonForms } from './common';

const reportFormScreenStyles = StyleSheet.create<ReportFormScreenStyles>({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerAccent: {
    // Kept for backwards compatibility but no longer used
    height: 0,
    backgroundColor: 'transparent',
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: -1,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  content: {
    padding: spacing.screenHorizontal,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderTopWidth: 0, // Remove the border for a cleaner look
    shadowColor: 'rgba(0, 69, 126, 0.12)',
    shadowOffset: {
      width: 0,
      height: 10
    },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: spacing.md,
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: 0.5,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    fontSize: 16,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  selectorText: {
    fontSize: 16,
    color: colors.black,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: colors.mediumGray,
  },
  selectorArrow: {
    fontSize: 12,
    color: colors.primary,
  },
  datePickerButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    color: colors.black,
  },
  locationContainer: {
    marginBottom: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.darkGray,
  },
  disabledInput: {
    backgroundColor: colors.lightGray,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 30, // Fully rounded corners
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    shadowColor: 'rgba(0, 69, 126, 0.4)',
    shadowOffset: { 
      width: 0, 
      height: 6 
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: spacing.sm,
  },
  requiredFields: {
    fontSize: 14,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  photoInstructions: {
    fontSize: 16,
    color: colors.darkGray,
    marginBottom: spacing.md,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  photoButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: '48%',
    alignItems: 'center',
    shadowColor: 'rgba(0, 69, 126, 0.25)',
    shadowOffset: { 
      width: 0, 
      height: 3 
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  photoButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  photoPreviewContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
  },
  closeButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionText: {
    fontSize: 16,
    color: colors.darkGray,
  },
  checkmark: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  licenseButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  licenseButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default reportFormScreenStyles;