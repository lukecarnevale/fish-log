// services/blocksService.ts
//
// Backend access for the mutual-hide block list (user_blocks table).
// The v_catch_feed view and get_following_feed RPC both filter the bidirectional
// block set automatically, so the only client-side concern is mutating the
// list and re-fetching dependent queries.

import { supabase } from '../config/supabase';

/**
 * Block a user. RLS enforces blocker_id matches the caller. Idempotent —
 * duplicate inserts are absorbed (already blocked).
 */
export async function blockUser(
  targetUserId: string,
  currentUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: currentUserId, blocked_id: targetUserId });

  if (error && error.code !== '23505') {
    throw new Error(`Failed to block user: ${error.message}`);
  }
}

/**
 * Unblock a user. RLS enforces only the blocker may delete.
 */
export async function unblockUser(
  targetUserId: string,
  currentUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', currentUserId)
    .eq('blocked_id', targetUserId);

  if (error) {
    throw new Error(`Failed to unblock user: ${error.message}`);
  }
}

/**
 * Check whether the current user has blocked the target. RLS only exposes
 * the caller's own block rows, so this is safe to call from the client.
 */
export async function isUserBlocked(
  targetUserId: string,
  currentUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id')
    .eq('blocker_id', currentUserId)
    .eq('blocked_id', targetUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check block status: ${error.message}`);
  }
  return !!data;
}
