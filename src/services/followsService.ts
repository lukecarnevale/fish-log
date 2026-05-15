// services/followsService.ts
//
// Backend access for follow relationships (user_follows table).
// Counts are denormalized on the users table via DB triggers, so reads are cheap.

import { supabase } from '../config/supabase';
import { CatchFeedEntry, SpeciesCatch } from '../types/catchFeed';

export interface FollowProfileData {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

/**
 * Read the follower/following counts for a target user, plus whether the
 * viewer (currentUserId) currently follows them. When viewer is null
 * (anonymous or non-rewards), isFollowing is false.
 */
export async function fetchFollowProfileData(
  targetUserId: string,
  viewerUserId: string | null,
): Promise<FollowProfileData> {
  const userPromise = supabase
    .from('users')
    .select('followers_count, following_count')
    .eq('id', targetUserId)
    .maybeSingle();

  const followPromise = viewerUserId
    ? supabase
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', viewerUserId)
        .eq('following_id', targetUserId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null } as const);

  const [{ data: userData, error: userErr }, { data: followRow }] = await Promise.all([
    userPromise,
    followPromise,
  ]);

  if (userErr) {
    throw new Error(`Failed to fetch follow profile: ${userErr.message}`);
  }

  return {
    followersCount: userData?.followers_count ?? 0,
    followingCount: userData?.following_count ?? 0,
    isFollowing: !!followRow,
  };
}

/**
 * Follow a user. RLS enforces follower_id matches the caller's rewards user
 * and following_id is a rewards opt-in user.
 */
export async function followUser(
  targetUserId: string,
  currentUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: currentUserId, following_id: targetUserId });

  // 23505 = unique_violation; already following. Treat as success.
  if (error && error.code !== '23505') {
    throw new Error(`Failed to follow user: ${error.message}`);
  }
}

/**
 * Unfollow a user. RLS enforces only the follower may delete.
 */
export async function unfollowUser(
  targetUserId: string,
  currentUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId);

  if (error) {
    throw new Error(`Failed to unfollow user: ${error.message}`);
  }
}

/**
 * Fetch the "Following" feed for the current user via the get_following_feed RPC.
 * Returns the same shape as the public feed so the existing card renders unchanged.
 */
export async function fetchFollowingFeed(
  limit = 12,
  offset = 0,
): Promise<{ entries: CatchFeedEntry[]; hasMore: boolean }> {
  // Fetch one extra row to detect hasMore.
  const { data, error } = await supabase.rpc('get_following_feed', {
    p_limit: limit + 1,
    p_offset: offset,
  });

  if (error) {
    throw new Error(`Failed to fetch following feed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    report_id: string;
    user_id: string;
    photo_url: string | null;
    area_label: string | null;
    harvest_date: string | null;
    created_at: string;
    first_name: string | null;
    last_name: string | null;
    profile_image_url: string | null;
    red_drum_count: number;
    flounder_count: number;
    spotted_seatrout_count: number;
    weakfish_count: number;
    striped_bass_count: number;
    total_fish: number;
    like_count: number;
    fish_entries_json: unknown;
    report_type: string | null;
    photos: unknown;
    comment_count: number;
  }>;

  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;

  const entries: CatchFeedEntry[] = [];
  for (const row of visible) {
    const firstName = row.first_name || 'Anonymous';
    const lastInitial = row.last_name ? `${row.last_name.charAt(0)}.` : '';
    const anglerName = `${firstName} ${lastInitial}`.trim();

    let speciesList: SpeciesCatch[] = [];
    if (Array.isArray(row.fish_entries_json)) {
      speciesList = (row.fish_entries_json as Array<Record<string, unknown>>).map((fe) => ({
        species: fe.species as string,
        count: fe.count as number,
        lengths: (fe.lengths as string[] | undefined) ?? undefined,
        tagNumber: (fe.tagNumber as string | undefined) ?? (fe.tag_number as string | undefined),
      }));
    }
    if (speciesList.length === 0) {
      const allSpecies = [
        { species: 'Red Drum', count: row.red_drum_count },
        { species: 'Flounder', count: row.flounder_count },
        { species: 'Spotted Seatrout (speckled trout)', count: row.spotted_seatrout_count },
        { species: 'Weakfish (gray trout)', count: row.weakfish_count },
        { species: 'Striped Bass', count: row.striped_bass_count },
      ];
      speciesList = allSpecies
        .filter((s) => s.count && s.count > 0)
        .map((s) => ({ species: s.species, count: s.count as number }));
    }
    if (speciesList.length === 0) continue;

    const totalFish = speciesList.reduce((sum, s) => sum + s.count, 0);
    const primary = speciesList.reduce((max, s) => (s.count > max.count ? s : max), speciesList[0]);

    const photos = Array.isArray(row.photos) ? (row.photos as string[]) : [];
    const photoUrls = photos.length > 0 ? photos : row.photo_url ? [row.photo_url] : undefined;

    entries.push({
      id: row.report_id,
      userId: row.user_id,
      anglerName,
      anglerProfileImage: row.profile_image_url ?? undefined,
      species: primary.species,
      speciesList,
      totalFish,
      photoUrl: row.photo_url ?? undefined,
      photoUrls,
      catchDate: row.harvest_date ?? row.created_at,
      location: row.area_label ?? undefined,
      createdAt: row.created_at,
      likeCount: row.like_count ?? 0,
      isLikedByCurrentUser: false,
      commentCount: row.comment_count ?? 0,
    });
  }

  return { entries, hasMore };
}
