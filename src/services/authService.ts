// services/authService.ts
//
// Service for handling Supabase authentication.
// Uses magic link (passwordless) authentication for Rewards Members.
//

import { supabase } from '../config/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  pendingAuth: '@pending_auth', // Stores email waiting for magic link confirmation
} as const;

// App URL scheme for deep linking
// This should match your app.json/app.config.js scheme
const APP_SCHEME = 'fishlog';
const REDIRECT_URL = `${APP_SCHEME}://auth/callback`;

// =============================================================================
// Types
// =============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  session: Session | null;
}

export interface PendingAuth {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  sentAt: string;
}

// =============================================================================
// Magic Link Authentication
// =============================================================================

/**
 * Send a magic link to the user's email for passwordless authentication.
 * The user will receive an email with a link to complete sign-in.
 */
export async function sendMagicLink(
  email: string,
  metadata?: { firstName?: string; lastName?: string; phone?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        emailRedirectTo: REDIRECT_URL,
        data: metadata, // This will be stored in user metadata on first sign-in
      },
    });

    if (error) {
      console.error('Magic link error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Magic link sent to:', email);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send magic link';
    console.error('Magic link error:', error);
    return { success: false, error: message };
  }
}

/**
 * Store pending auth data while waiting for magic link confirmation.
 */
export async function storePendingAuth(data: PendingAuth): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.pendingAuth, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to store pending auth:', error);
  }
}

/**
 * Get pending auth data (if any).
 */
export async function getPendingAuth(): Promise<PendingAuth | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.pendingAuth);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Clear pending auth data after successful authentication.
 */
export async function clearPendingAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.pendingAuth);
  } catch (error) {
    console.error('Failed to clear pending auth:', error);
  }
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Get the current authentication state.
 */
export async function getAuthState(): Promise<AuthState> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Failed to get session:', error);
      return { isAuthenticated: false, user: null, session: null };
    }

    return {
      isAuthenticated: !!session,
      user: session?.user ?? null,
      session,
    };
  } catch (error) {
    console.error('Error getting auth state:', error);
    return { isAuthenticated: false, user: null, session: null };
  }
}

/**
 * Get the currently authenticated user.
 */
export async function getCurrentAuthUser(): Promise<SupabaseUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Check if user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const state = await getAuthState();
  return state.isAuthenticated;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    console.log('✅ User signed out');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sign out';
    return { success: false, error: message };
  }
}

// =============================================================================
// Auth State Listener
// =============================================================================

/**
 * Subscribe to authentication state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session?.user?.email);
    callback(event, session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

// =============================================================================
// Deep Link Handling
// =============================================================================

/**
 * Handle the magic link callback URL.
 * Call this when the app receives a deep link with auth tokens.
 */
export async function handleMagicLinkCallback(
  url: string
): Promise<{ success: boolean; session?: Session; error?: string }> {
  try {
    // Parse the URL to extract tokens
    // The URL format is: fishlog://auth/callback#access_token=...&refresh_token=...
    const hashParams = new URLSearchParams(url.split('#')[1] || '');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      return { success: false, error: 'Invalid callback URL - missing tokens' };
    }

    // Set the session with the tokens
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    console.log('✅ Magic link authenticated:', data.session?.user?.email);
    return { success: true, session: data.session ?? undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to handle magic link';
    console.error('Magic link callback error:', error);
    return { success: false, error: message };
  }
}

/**
 * Check if a URL is a magic link callback.
 */
export function isMagicLinkCallback(url: string): boolean {
  return url.startsWith(`${APP_SCHEME}://auth/callback`);
}

// =============================================================================
// User Metadata
// =============================================================================

/**
 * Update the authenticated user's metadata.
 */
export async function updateUserMetadata(
  metadata: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return { success: false, error: message };
  }
}
