import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RewardsProvider } from '../src/contexts/RewardsContext';
import { AchievementProvider } from '../src/contexts/AchievementContext';
import { BulletinProvider } from '../src/contexts/BulletinContext';
import { SpeciesAlertsProvider } from '../src/contexts/SpeciesAlertsContext';
import userReducer from '../src/store/slices/userSlice';
import fishReportsReducer from '../src/store/slices/fishReportsSlice';
import licenseReducer from '../src/store/slices/licenseSlice';
import type { RootState } from '../src/store';

const Stack = createStackNavigator();

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function createTestStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      user: userReducer,
      fishReports: fishReportsReducer,
      license: licenseReducer,
    },
    preloadedState,
  });
}

interface WrapperOptions {
  initialRouteName?: string;
  routeParams?: Record<string, unknown>;
  preloadedState?: Partial<RootState>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRouteName = 'TestScreen',
    routeParams,
    preloadedState,
    ...renderOptions
  }: WrapperOptions & RenderOptions = {}
) {
  const queryClient = createTestQueryClient();
  const testStore = createTestStore(preloadedState);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={testStore}>
        <QueryClientProvider client={queryClient}>
          <RewardsProvider>
            <AchievementProvider>
              <BulletinProvider>
                <SpeciesAlertsProvider>
                  <SafeAreaProvider>
                    <NavigationContainer>
                      <Stack.Navigator initialRouteName={initialRouteName}>
                        <Stack.Screen name={initialRouteName} initialParams={routeParams}>
                          {() => children}
                        </Stack.Screen>
                      </Stack.Navigator>
                    </NavigationContainer>
                  </SafeAreaProvider>
                </SpeciesAlertsProvider>
              </BulletinProvider>
            </AchievementProvider>
          </RewardsProvider>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient, store: testStore };
}

export * from '@testing-library/react-native';
export { renderWithProviders as render };
