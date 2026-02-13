// hooks/usePendingSubmissionRecovery.ts
//
// Hook for checking and recovering pending submissions during mid-auth flow.
// Handles cases where users start auth flow but don't complete it.
//

import { useEffect } from 'react';
import { Linking, Alert } from 'react-native';
import {
  checkForPendingSubmission,
  clearPendingSubmission,
} from '../services/pendingSubmissionService';

/**
 * Hook for checking and recovering pending submissions on app startup.
 *
 * Features:
 * - Checks for incomplete rewards sign-up submissions
 * - Skips check if app opened via deep link (magic link auth flow)
 * - Shows recovery prompt to user
 * - Allows user to dismiss or continue pending submission
 * - Clears submission when dismissed
 *
 * Note: This effect runs after deep link checks to avoid conflicts
 * with the magic link authentication flow.
 */
export function usePendingSubmissionRecovery() {
  useEffect(() => {
    // Check for pending submissions (mid-auth recovery)
    // But only if there's no deep link being processed (e.g., magic link auth)
    const checkPendingSubmissionIfNoDeepLink = async () => {
      try {
        // First check if we're opening via a deep link (magic link auth)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('📋 Skipping pending submission check - deep link being processed');
          return; // Let the deep link handler deal with auth flow
        }

        const pending = await checkForPendingSubmission();
        if (pending && pending.status === 'pending') {
          console.log('📋 Found pending submission for:', pending.email);
          // Show recovery prompt
          Alert.alert(
            'Continue Sign Up?',
            `You have an unfinished rewards sign-up for ${pending.email}. Would you like to continue?`,
            [
              {
                text: 'Dismiss',
                style: 'cancel',
                onPress: () => {
                  clearPendingSubmission();
                  console.log('📋 Pending submission dismissed by user');
                },
              },
              {
                text: 'Continue',
                onPress: () => {
                  // The user can continue by going to Profile tab and signing in
                  // The pending auth data is already stored, so the magic link flow will use it
                  console.log('📋 User chose to continue pending submission');
                  Alert.alert(
                    'Continue Sign Up',
                    'Go to the Profile tab and tap "Sign In" to complete your rewards sign-up.',
                    [{ text: 'OK' }]
                  );
                },
              },
            ]
          );
        }
      } catch (error) {
        console.warn('⚠️ Failed to check pending submissions:', error);
      }
    };
    checkPendingSubmissionIfNoDeepLink();
  }, []);
}
