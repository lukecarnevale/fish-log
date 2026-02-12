// constants/screenLabels.ts
//
// Centralized screen labels for consistency across the app.
// These labels are used in:
// - HomeScreen quick action cards
// - DrawerMenu items
// - Screen header titles
//
// When updating a label, it will be reflected everywhere automatically.

export const SCREEN_LABELS = {
  // Main screens
  reportCatch: {
    title: 'Report Catch',
    subtitle: 'Log your harvest',
  },
  pastReports: {
    title: 'Past Reports',
    subtitle: 'View history',
  },
  speciesGuide: {
    title: 'Species Guide',
    subtitle: 'NC inshore fish',
  },
  catchFeed: {
    title: 'Catch Feed',
    subtitle: 'Community catches',
  },
  fishingLicense: {
    title: 'Fishing License',
    subtitle: 'View license info',
  },
  profile: {
    title: 'Profile',
    subtitle: 'View Profile',
  },
} as const;

// Type for accessing screen labels
export type ScreenLabelKey = keyof typeof SCREEN_LABELS;
