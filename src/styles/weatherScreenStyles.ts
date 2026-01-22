// styles/weatherScreenStyles.ts
import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from './common';

const weatherScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
  },
  locationSelector: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    margin: spacing.md,
    marginTop: -spacing.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  dropdownIcon: {
    padding: spacing.xs,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  refreshText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  currentWeatherCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    margin: spacing.md,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentWeatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  temperature: {
    ...typography.largeTitle,
    color: colors.textPrimary,
    fontSize: 48,
  },
  weatherIcon: {
    width: 64,
    height: 64,
  },
  weatherDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  weatherDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  weatherDetailItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weatherDetailIcon: {
    width: 24,
    height: 24,
    marginRight: spacing.sm,
  },
  weatherDetailText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  hourlyForecastContainer: {
    marginHorizontal: spacing.md,
  },
  hourlyForecastList: {
    paddingVertical: spacing.sm,
  },
  hourlyForecastItem: {
    alignItems: 'center',
    marginRight: spacing.lg,
    width: 75,
  },
  hourlyForecastTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  hourlyForecastIcon: {
    width: 32,
    height: 32,
    marginBottom: spacing.xs,
  },
  hourlyForecastTemperature: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  hourlyForecastPrecip: {
    ...typography.caption,
    color: colors.info,
  },
  forecastCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    margin: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightestGray,
  },
  forecastDay: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    width: 90,
  },
  forecastIconContainer: {
    width: 36,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  forecastIcon: {
    width: 28,
    height: 28,
  },
  forecastDetails: {
    flex: 1,
  },
  forecastDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  forecastTemp: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'right',
    width: 80,
  },
  tideContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    margin: spacing.md,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tideTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  tideStation: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tideChartContainer: {
    height: 120,
    marginVertical: spacing.md,
  },
  tideEvents: {
    marginTop: spacing.sm,
  },
  tideEvent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightestGray,
  },
  tideEventType: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  tideEventTime: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tideEventHeight: {
    ...typography.body,
    color: colors.textPrimary,
  },
  warningCard: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    margin: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  warningIcon: {
    marginRight: spacing.sm,
  },
  warningTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
  },
  warningSeverity: {
    ...typography.caption,
    backgroundColor: colors.warning,
    color: colors.white,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  warningText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  warningMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  errorButtonText: {
    ...typography.button,
    color: colors.white,
  },
  // Location picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightestGray,
  },
  locationItemText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  locationItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  addLocationText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
});

export default weatherScreenStyles;