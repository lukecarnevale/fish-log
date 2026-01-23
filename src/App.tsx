// App.tsx - Main component for the Fish Reporting App

import React, { useEffect } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createStackNavigator, TransitionPresets } from "@react-navigation/stack";
import { Feather } from "@expo/vector-icons";
import { colors } from "./styles/common";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';

// Import Redux store
import { store } from './store';
import { fetchUserProfile } from './store/slices/userSlice';
import { fetchLicense } from './store/slices/licenseSlice';
import { fetchFishReports } from './store/slices/fishReportsSlice';

// Import React Query client
import { queryClient } from './api/queryClient';

// Import Rewards context
import { RewardsProvider } from './contexts/RewardsContext';

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
  useEffect(() => {
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

    // Cleanup listener on unmount
    return () => {
      unsubscribeConnectivity();
    };
  }, []);

  return null;
};

const AppContent: React.FC = () => {
  return (
    <NavigationContainer theme={AppTheme} linking={{
      // Define app linking configuration for React Navigation v7
      prefixes: [],
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