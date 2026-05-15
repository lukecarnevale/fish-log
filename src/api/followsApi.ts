// api/followsApi.ts
//
// React Query hooks for the follows feature.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchFollowProfileData,
  followUser,
  unfollowUser,
  fetchFollowingFeed,
  FollowProfileData,
} from '../services/followsService';

const FOLLOW_PROFILE_KEY = 'followProfile';
const FOLLOWING_FEED_KEY = 'followingFeed';

function profileKey(targetUserId: string, viewerUserId: string | null) {
  return [FOLLOW_PROFILE_KEY, targetUserId, viewerUserId ?? 'anon'] as const;
}

/**
 * Fetch follower/following counts and isFollowing for a target user.
 * Useful in AnglerProfileModal. Disabled when targetUserId is null.
 */
export function useFollowProfile(
  targetUserId: string | null,
  viewerUserId: string | null,
) {
  return useQuery<FollowProfileData>({
    queryKey: targetUserId
      ? profileKey(targetUserId, viewerUserId)
      : ['followProfile', 'disabled'],
    queryFn: () => fetchFollowProfileData(targetUserId as string, viewerUserId),
    enabled: !!targetUserId,
    staleTime: 60 * 1000,
  });
}

interface FollowToggleVars {
  targetUserId: string;
  viewerUserId: string;
  willFollow: boolean;
}

/**
 * Toggle follow state. Optimistically flips isFollowing + bumps followers/following
 * counts so the AnglerProfileModal feels instant. Rolls back on failure.
 *
 * Also invalidates the following feed so it'll refetch with the new follow set.
 */
export function useToggleFollow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: FollowToggleVars) => {
      if (vars.willFollow) {
        await followUser(vars.targetUserId, vars.viewerUserId);
      } else {
        await unfollowUser(vars.targetUserId, vars.viewerUserId);
      }
    },

    onMutate: async (vars) => {
      const k = profileKey(vars.targetUserId, vars.viewerUserId);
      await qc.cancelQueries({ queryKey: k });
      const previous = qc.getQueryData<FollowProfileData>(k);

      qc.setQueryData<FollowProfileData>(k, (cur) => {
        const base: FollowProfileData = cur ?? {
          isFollowing: !vars.willFollow,
          followersCount: 0,
          followingCount: 0,
        };
        return {
          isFollowing: vars.willFollow,
          followersCount: Math.max(
            0,
            base.followersCount + (vars.willFollow ? 1 : -1),
          ),
          followingCount: base.followingCount,
        };
      });

      return { previous };
    },

    onError: (_err, vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(profileKey(vars.targetUserId, vars.viewerUserId), ctx.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [FOLLOWING_FEED_KEY] });
    },
  });
}

/**
 * Fetch the current user's "Following" feed page. Caller controls pagination
 * by supplying the offset.
 */
export function useFollowingFeedPage(
  viewerUserId: string | null,
  limit = 12,
  offset = 0,
) {
  return useQuery({
    queryKey: [FOLLOWING_FEED_KEY, viewerUserId ?? 'anon', limit, offset],
    queryFn: () => fetchFollowingFeed(limit, offset),
    enabled: !!viewerUserId,
    staleTime: 30 * 1000,
  });
}

export const FOLLOWING_FEED_QUERY_KEY = FOLLOWING_FEED_KEY;
