/**
 * Supabase Query Helper
 *
 * Provides utility functions for common Supabase operations with consistent error handling.
 */

/**
 * Execute a Supabase operation with consistent error handling and fallback behavior.
 *
 * @param operation - Async function that returns Supabase { data, error } tuple
 * @param context - Context label for error logging
 * @param fallback - Default value to return on error
 * @returns The data from the operation, or fallback value on error
 */
export async function withConnection<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string,
  fallback: T
): Promise<T> {
  try {
    const { data, error } = await operation();
    if (error) throw error;
    return data ?? fallback;
  } catch (error) {
    console.error(`[${context}]`, error);
    return fallback;
  }
}

/**
 * Log a Supabase error with consistent formatting.
 *
 * @param error - The Supabase error object
 * @param context - Context label for error logging
 */
export function handleSupabaseError(error: any, context: string): void {
  console.error(`[Supabase Error - ${context}]:`, error?.message || error);
}
