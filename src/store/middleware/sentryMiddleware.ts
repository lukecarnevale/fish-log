// store/middleware/sentryMiddleware.ts
//
// Redux middleware that records dispatched actions as Sentry breadcrumbs.
// Replaces console-based breadcrumbs stripped by transform-remove-console in prod.
// Only logs action type (not payload) to avoid PII leakage.

import { Middleware } from '@reduxjs/toolkit';
import * as Sentry from '@sentry/react-native';

export const sentryBreadcrumbMiddleware: Middleware = () => (next) => (action) => {
  if (action && typeof action === 'object' && 'type' in action) {
    Sentry.addBreadcrumb({
      category: 'redux',
      message: (action as { type: string }).type,
      level: 'info',
    });
  }
  return next(action);
};
