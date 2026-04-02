// config/sentry.ts
//
// Sentry crash reporting configuration.
// Follows the same env-driven pattern as config/env.ts and config/supabase.ts.
//
// Sentry is initialized as early as possible in App.tsx (after the deep link buffer).
// When the DSN is missing, initialization is a no-op so dev builds without
// Sentry configured still work normally.

import * as Sentry from '@sentry/react-native';
import { supabaseIntegration } from '@supabase/sentry-js-integration';
import { SupabaseClient } from '@supabase/supabase-js';
import { env, isDevelopment, isProduction } from './env';
import { APP_VERSION } from './appConfig';

// React Navigation integration — created at module level so App.tsx can register
// the navigation container ref in NavigationContainer's onReady callback.
export const sentryNavigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    if (isDevelopment()) {
      console.warn('[Sentry] DSN not configured — crash reporting disabled');
    }
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,
    release: `io.fishlog.app@${APP_VERSION}`,
    dist: APP_VERSION,
    debug: isDevelopment(),
    enabled: true,

    // Performance monitoring — lower sample rates in production to control cost
    tracesSampleRate: isProduction() ? 0.2 : 1.0,
    profilesSampleRate: isProduction() ? 0.1 : 0,

    // Session tracking for crash-free rate metrics
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,

    enableAutoPerformanceTracing: true,
    attachStacktrace: true,

    // Strip PII — this app handles NC government fishery data
    beforeSend(event) {
      if (event.user) {
        delete event.user.ip_address;
      }
      return event;
    },

    integrations: [
      sentryNavigationIntegration,
      supabaseIntegration(SupabaseClient, Sentry, {
        tracing: true,
        breadcrumbs: true,
        errors: true,
      }),
    ],
  });
}

export { Sentry };
