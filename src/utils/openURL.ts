/**
 * Safe URL opening utility.
 *
 * Wraps React Native's Linking API with canOpenURL pre-checks and
 * graceful error handling so failed deep-links (mailto:, tel:, https)
 * never bubble up as unhandled exceptions to Sentry.
 */

import { Alert, Linking } from 'react-native';

/**
 * Safely open a URL using the device's default handler.
 *
 * 1. Checks `Linking.canOpenURL` first — avoids the "Unable to open URL"
 *    error on devices without a mail client, dialer, or browser configured.
 * 2. Catches errors from `Linking.openURL` itself (network issues, etc.).
 * 3. Shows a user-friendly alert when the URL can't be opened.
 *
 * @param url  The URL to open (https://, mailto:, tel:, etc.)
 * @param fallbackMessage  Optional custom message shown when the URL can't be opened.
 */
export async function safeOpenURL(
  url: string,
  fallbackMessage?: string
): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      const scheme = url.split(':')[0];
      const defaultMessages: Record<string, string> = {
        mailto: 'No email app is configured on this device. You can reach us at the email address shown.',
        tel: 'Unable to open the phone dialer on this device.',
      };
      Alert.alert(
        'Unable to Open Link',
        fallbackMessage ?? defaultMessages[scheme] ?? `This device can't open the link: ${url}`
      );
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'Unable to Open Link',
      fallbackMessage ?? 'Something went wrong while opening the link. Please try again later.'
    );
  }
}
