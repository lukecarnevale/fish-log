// App.tsx - Main component for the Fish Reporting App

import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import {
  createStackNavigator,
  TransitionPresets,
  TransitionSpecs,
  HeaderStyleInterpolators,
} from "@react-navigation/stack";
import type { StackCardStyleInterpolator } from "@react-navigation/stack";
import { Feather } from "@expo/vector-icons";
import { colors } from "./styles/common";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { Platform, View, Text, StyleSheet } from 'react-native';

// Import Redux store
import { store } from './store';

// Import React Query client
import { queryClient } from './api/queryClient';

// Import Error Boundary
import ErrorBoundary from './components/ErrorBoundary';

// Import Rewards context
import { RewardsProvider } from './contexts/RewardsContext';

// Import Achievement context for displaying achievement notifications
import { AchievementProvider } from './contexts/AchievementContext';

// Import Bulletin context for displaying app bulletins (closures, advisories, etc.)
import { BulletinProvider } from './contexts/BulletinContext';

// Import Species Alerts context for species-specific bulletins (closures, regulation changes)
import { SpeciesAlertsProvider } from './contexts/SpeciesAlertsContext';

// Import Supabase config check
import { isSupabaseConfigured } from './config/supabase';
import { env } from './config/env';

// Import app initialization hooks
import {
  useInitializeData,
  useDeepLinkHandler,
  useConnectivityMonitoring,
  usePendingSubmissionRecovery,
  useAuthStateListener,
  useAnonymousUserInitialization,
} from './hooks';

// Import types
import { RootStackParamList } from "./types";

// Import screens
import HomeScreen from "./screens/HomeScreen";
import ReportFormScreen from "./screens/ReportFormScreen";
import ConfirmationScreen from "./screens/ConfirmationScreen";
import PastReportsScreen from "./screens/PastReportsScreen";
import SpeciesInfoScreen from "./screens/SpeciesInfoScreen";
import FishingLicenseScreen from "./screens/FishingLicenseScreen";
import CatchFeedScreen from "./screens/CatchFeedScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LegalDocumentScreen from "./screens/LegalDocumentScreen";

// Import styles
import { navigationStyles } from "./styles/navigationStyles";

// Create a custom navigation theme
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: (navigationStyles.screenOptions.headerStyle as { backgroundColor: string })?.backgroundColor ?? '#0B548B',
    background: (navigationStyles.screenOptions.cardStyle as { backgroundColor: string })?.backgroundColor ?? '#E5F4FF',
    card: '#FFFFFF',
    text: '#263238',
    border: '#BBDEFB',
  },
};

const Stack = createStackNavigator<RootStackParamList>();

/**
 * Custom Android card style interpolator that prevents flicker during back navigation.
 * The key is to keep the current screen fully visible until the incoming screen covers it.
 */
const forNoFlickerAndroid: StackCardStyleInterpolator = ({ current, next, layouts }) => {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.width, 0],
  });

  const overlayOpacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  // When this screen is being covered by another screen (next exists)
  // Keep it fully visible (opacity 1) to prevent flicker
  const cardOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1], // Always fully visible when being covered
      })
    : 1;

  return {
    cardStyle: {
      transform: [{ translateX }],
      opacity: cardOpacity,
    },
    overlayStyle: {
      opacity: overlayOpacity,
    },
  };
};

// Component to initialize data and listeners on app startup
const AppInitializer: React.FC = () => {
  // Initialize anonymous user on app startup
  useAnonymousUserInitialization();

  // Check for pending submissions (mid-auth recovery)
  usePendingSubmissionRecovery();

  // Load all initial data in parallel
  useInitializeData();

  // Monitor connectivity and auto-sync queued reports
  useConnectivityMonitoring();

  // Handle deep links for magic link authentication
  useDeepLinkHandler();

  // Listen for auth state changes
  useAuthStateListener();


  return null;
};

const AppContent: React.FC = () => {
  return (
    <NavigationContainer theme={AppTheme} linking={{
      // Define app linking configuration for React Navigation v7
      prefixes: ['fishlog://'],
      config: {
        screens: {
          Home: 'home',
          ReportForm: 'report',
          PastReports: 'my-reports',
          SpeciesInfo: 'species',
          LicenseDetails: 'license',
          CatchFeed: 'catchfeed',
          Profile: 'profile',
          Confirmation: 'confirmation',
          LegalDocument: 'legal/:type',
        },
      },
    }}>
      <StatusBar style="light" />
      <AppInitializer />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          ...navigationStyles.screenOptions,
          headerBackButtonDisplayMode: 'minimal', // Hide back button title in v7
          headerLeftContainerStyle: { paddingLeft: 16 }, // Give the back button more padding
          headerBackImage: ({ tintColor }) => (
            <Feather
              name="chevron-left"
              size={30}
              color={tintColor || colors.white}
              style={{ marginLeft: 4 }}
            />
          ),
          // Platform-specific transitions to prevent Android flicker
          ...(Platform.OS === 'ios'
            ? TransitionPresets.SlideFromRightIOS
            : {
                // Android-specific settings to prevent flicker
                cardStyleInterpolator: forNoFlickerAndroid,
                transitionSpec: {
                  open: TransitionSpecs.TransitionIOSSpec,
                  close: TransitionSpecs.TransitionIOSSpec,
                },
                headerStyleInterpolator: HeaderStyleInterpolators.forSlideLeft,
                gestureDirection: 'horizontal',
                // Critical: these prevent the flicker on Android
                cardOverlayEnabled: true,
                cardShadowEnabled: false,
                // Keep previous screen mounted during transition
                detachPreviousScreen: false,
                freezeOnBlur: false,
              }
          ),
          gestureEnabled: true,
          // Ensure card background matches app theme to prevent white flash
          cardStyle: { backgroundColor: colors.primary },
        }}
      >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ 
              title: "Fish Report",
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="ReportForm"
            component={ReportFormScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Confirmation"
            component={ConfirmationScreen}
            options={{
              headerShown: false,
              gestureEnabled: false, // Disable nav gesture - custom pan responder handles dismiss
            }}
          />
          <Stack.Screen
            name="PastReports"
            component={PastReportsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="SpeciesInfo"
            component={SpeciesInfoScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="LicenseDetails"
            component={FishingLicenseScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="CatchFeed"
            component={CatchFeedScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="LegalDocument"
            component={LegalDocumentScreen}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
  );
};

/** Fallback screen shown when Supabase credentials are missing at build time */
const ConfigErrorScreen: React.FC = () => (
  <View style={configErrorStyles.container}>
    <Feather name="alert-circle" size={64} color={colors.primary} />
    <Text style={configErrorStyles.title}>Configuration Error</Text>
    <Text style={configErrorStyles.message}>
      Supabase credentials were not found in this build.{'\n\n'}
      EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in eas.json under the build profile's "env" section.
    </Text>
    <Text style={configErrorStyles.detail}>
      URL: {env.SUPABASE_URL || '(missing)'}{'\n'}
      Key: {env.SUPABASE_ANON_KEY ? 'present' : '(missing)'}
    </Text>
  </View>
);

const configErrorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  detail: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

const App: React.FC = () => {
  if (!isSupabaseConfigured) {
    return <ConfigErrorScreen />;
  }

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <RewardsProvider>
            <AchievementProvider>
              <BulletinProvider>
                <SpeciesAlertsProvider>
                  <SafeAreaProvider>
                    <AppContent />
                  </SafeAreaProvider>
                </SpeciesAlertsProvider>
              </BulletinProvider>
            </AchievementProvider>
          </RewardsProvider>
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;