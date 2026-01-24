// App.tsx - Main component for the Fish Reporting App

import React, { useEffect, useCallback } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createStackNavigator, TransitionPresets } from "@react-navigation/stack";
import { Feather } from "@expo/vector-icons";
import { colors } from "./styles/common";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { Linking, Alert } from 'react-native';

// Import Redux store
import { store } from './store';
import { fetchUserProfile } from './store/slices/userSlice';
import { fetchLicense } from './store/slices/licenseSlice';
import { fetchFishReports } from './store/slices/fishReportsSlice';

// Import React Query client
import { queryClient } from './api/queryClient';

// Import Rewards context
import { RewardsProvider } from './contexts/RewardsContext';

// Import auth services for deep link handling
import { isMagicLinkCallback, handleMagicLinkCallback, onAuthStateChange } from './services/authService';
import { createRewardsMemberFromAuthUser } from './services/userService';
import { getOrCreateAnonymousUser } from './services/anonymousUserService';

// Import connectivity listener for auto-sync of queued reports
import { startConnectivityListener } from './hooks';

// Import types
import { RootStackParamList } from "./types";

// Import screens
import HomeScreen from "./screens/HomeScreen";
import ReportFormScreen from "./screens/ReportFormScreen";
import ConfirmationScreen from "./screens/ConfirmationScreen";
import PastReportsScreen from "./screens/PastReportsScreen";
import SpeciesInfoScreen from "./screens/SpeciesInfoScreen";
import FishingLicenseScreen from "./screens/FishingLicenseScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import ProfileScreen from "./screens/ProfileScreen";

// Import styles
import { navigationStyles } from "./styles/navigationStyles";

// Create a custom navigation theme
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: navigationStyles.screenOptions.headerStyle.backgroundColor,
    background: navigationStyles.screenOptions.cardStyle.backgroundColor,
    card: '#FFFFFF',
    text: '#263238',
    border: '#BBDEFB',
  },
};

const Stack = createStackNavigator<RootStackParamList>();

// Component to initialize data and listeners on app startup
const AppInitializer: React.FC = () => {
  /**
   * Handle incoming deep links for magic link authentication.
   */
  const handleDeepLink = useCallback(async (url: string) => {
    console.log('📱 Deep link received:', url);

    if (isMagicLinkCallback(url)) {
      console.log('🔐 Processing magic link callback...');
      const result = await handleMagicLinkCallback(url);

      if (result.success) {
        console.log('✅ Magic link authenticated, creating rewards member...');
        const memberResult = await createRewardsMemberFromAuthUser();

        if (memberResult.success) {
          console.log('✅ Rewards member created:', memberResult.user?.email);
          // Refresh user data in Redux
          store.dispatch(fetchUserProfile());

          // Show welcome message to user
          Alert.alert(
            'Welcome to Rewards! 🎉',
            `You're now signed in as ${memberResult.user?.email}. Good luck in the quarterly drawing!`,
            [{ text: 'Awesome!', style: 'default' }]
          );
        } else {
          console.error('❌ Failed to create rewards member:', memberResult.error);
          Alert.alert(
            'Sign In Issue',
            memberResult.error || 'There was a problem completing your sign up. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        console.error('❌ Magic link authentication failed:', result.error);
        Alert.alert(
          'Sign In Failed',
          result.error || 'The sign-in link may have expired. Please request a new one.',
          [{ text: 'OK' }]
        );
      }
    }
  }, []);

  useEffect(() => {
    // Initialize anonymous user on app startup (creates in Supabase if needed)
    getOrCreateAnonymousUser()
      .then(() => console.log('✅ Anonymous user initialized'))
      .catch((error) => console.warn('⚠️ Failed to initialize anonymous user:', error));

    // Load all initial data in parallel
    Promise.all([
      store.dispatch(fetchUserProfile()),
      store.dispatch(fetchLicense()),
      store.dispatch(fetchFishReports()),
    ]).catch(error => {
      console.error('Error loading initial data:', error);
    });

    // Start connectivity listener for auto-syncing queued harvest reports
    // When the device comes back online, this will automatically sync any
    // reports that were queued while offline
    const unsubscribeConnectivity = startConnectivityListener((result) => {
      if (result.synced > 0) {
        console.log(`🎉 Auto-synced ${result.synced} queued harvest report(s)`);
      }
      if (result.failed > 0) {
        console.log(`⚠️ ${result.failed} report(s) failed to sync, will retry later`);
      }
      if (result.expired > 0) {
        console.log(`❌ ${result.expired} report(s) expired after max retries`);
      }
    });

    // Handle deep links - check for initial URL (app opened via link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Listen for auth state changes (handles session restore, sign out, etc.)
    const unsubscribeAuth = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('🔐 Auth state: SIGNED_IN');
        // User signed in - refresh user data
        store.dispatch(fetchUserProfile());
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 Auth state: SIGNED_OUT');
        // User signed out - could clear user data here if needed
      }
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeConnectivity();
      linkingSubscription.remove();
      unsubscribeAuth();
    };
  }, [handleDeepLink]);

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
          Leaderboard: 'leaderboard',
          Profile: 'profile',
          Confirmation: 'confirmation',
        },
      },
    }}>
      <StatusBar style="light" />
      <AppInitializer />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          ...navigationStyles.screenOptions,
          headerBackTitle: '', // Empty string to hide the text
          headerBackTitleVisible: false, // This explicitly hides the back title
          headerLeftContainerStyle: { paddingLeft: 16 }, // Give the back button more padding
          headerBackImage: ({ tintColor }) => (
            <Feather 
              name="chevron-left" 
              size={30} 
              color={tintColor || colors.white} 
              style={{ marginLeft: 4 }}
            />
          ),
          // Make sure transitions are working properly with React Navigation v7
          ...TransitionPresets.SlideFromRightIOS,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animationEnabled: true,
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
            name="Leaderboard"
            component={LeaderboardScreen}
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
        </Stack.Navigator>
      </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RewardsProvider>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </RewardsProvider>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;