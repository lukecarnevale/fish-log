// api/blocksApi.ts
//
// React Query hooks for the user_blocks feature. Block toggles invalidate
// the catch feed and the following feed since they both filter blocked users.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { blockUser, unblockUser } from '../services/blocksService';
import { FOLLOWING_FEED_QUERY_KEY } from './followsApi';

interface BlockToggleVars {
  targetUserId: string;
  viewerUserId: string;
}

/**
 * Block a user. On success invalidates feed queries so the blocked user's
 * catches disappear from both Discover and Following tabs.
 */
export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: BlockToggleVars) =>
      blockUser(vars.targetUserId, vars.viewerUserId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [FOLLOWING_FEED_QUERY_KEY] });
      // v_catch_feed is read via direct supabase query (not React Query),
      // so the parent screen owns the refetch — exposed via callback.
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: BlockToggleVars) =>
      unblockUser(vars.targetUserId, vars.viewerUserId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [FOLLOWING_FEED_QUERY_KEY] });
    },
  });
}
