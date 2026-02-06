// hooks/useDeepLinkHandler.ts
//
// Hook for handling deep links (magic link authentication).
// Processes incoming magic links and creates/updates rewards member account.
//

import { useEffect, useCallback } from 'react';
import { Linking, Alert } from 'react-native';
import { store } from '../store';
import { fetchUserProfile } from '../store/slices/userSlice';
import {
  isMagicLinkCallback,
  handleMagicLinkCallback,
} from '../services/authService';
import {
  createRewardsMemberFromAuthUser,
} from '../services/rewardsConversionService';
import {
  completePendingSubmissionByEmail,
} from '../services/pendingSubmissionService';

/**
 * Hook for handling deep links (magic link authentication).
 *
 * Features:
 * - Processes magic link callbacks from deep links
 * - Creates rewards member from authenticated user
 * - Completes pending submissions if applicable
 * - Shows user welcome message with claimed catches info
 * - Listens for incoming deep links while app is running
 * - Handles initial URL when app opens via deep link
 */
export function useDeepLinkHandler() {
  /**
   * Handle incoming deep links for magic link authentication.
   */
  const handleDeepLink = useCallback(async (url: string) => {
    console.log('📱 Deep link received:', url);

    if (isMagicLinkCallback(url)) {
      console.log('🔐 Processing magic link callback...');

      try {
        const result = await handleMagicLinkCallback(url);
        console.log('🔐 Magic link callback result:', { success: result.success, error: result.error });

        if (result.success) {
          console.log('✅ Magic link authenticated, creating rewards member...');

          try {
            const memberResult = await createRewardsMemberFromAuthUser();
            console.log('🔐 Create member result:', { success: memberResult.success, error: memberResult.error });

            if (memberResult.success) {
              console.log('✅ Rewards member created:', memberResult.user?.email);
              // Refresh user data in Redux (await to ensure store is updated before UI refresh)
              await store.dispatch(fetchUserProfile());

              // Complete any pending submission for this email
              if (memberResult.user?.email) {
                await completePendingSubmissionByEmail(memberResult.user.email);
              }

              // Build welcome message with claim info if applicable
              let message = `You're now signed in as ${memberResult.user?.email}. Good luck in the quarterly drawing!`;

              if (memberResult.claimedCatches && memberResult.claimedCatches > 0) {
                const catchText = memberResult.claimedCatches === 1 ? 'catch' : 'catches';
                message = `You're now signed in as ${memberResult.user?.email}.\n\n🎣 We linked ${memberResult.claimedCatches} previous ${catchText} to your account!`;
              }

              // Show welcome message to user
              Alert.alert(
                'Welcome to Rewards! 🎉',
                message,
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
          } catch (memberError) {
            console.error('❌ Exception creating rewards member:', memberError);
            Alert.alert(
              'Sign In Issue',
              'There was a problem completing your sign up. Please try again.',
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
      } catch (error) {
        console.error('❌ Exception handling magic link:', error);
        Alert.alert(
          'Sign In Failed',
          'An unexpected error occurred. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  }, []);

  useEffect(() => {
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

    // Cleanup listener on unmount
    return () => {
      linkingSubscription.remove();
    };
  }, [handleDeepLink]);
}
