// utils/sentryUtils.ts
//
// Lightweight Sentry helpers for service-level error reporting.
// Use these instead of console.error in production-critical paths,
// since transform-remove-console strips console.* calls in prod builds.

import * as Sentry from '@sentry/react-native';

/**
 * Capture an error to Sentry with a context tag.
 * Safe to call even when Sentry is not initialized (no-ops gracefully).
 */
export function captureError(error: unknown, context: string): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  Sentry.withScope((scope) => {
    scope.setTag('context', context);
    Sentry.captureException(errorObj);
  });
}

/**
 * Add a breadcrumb for significant app events.
 * Replaces console.log breadcrumbs that are stripped in production.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
  });
}

/**
 * Set the current user context for Sentry.
 * Call on sign-in; call with null on sign-out.
 */
export function setSentryUser(user: { id: string; email?: string } | null): void {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}
