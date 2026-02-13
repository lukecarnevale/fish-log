// types/anonymousUser.ts
//
// Type definitions for anonymous user management.
// Anonymous users are tracked by device ID before opting into the Rewards Program.
//

/**
 * Anonymous user record from Supabase.
 * Created silently on app install, upgraded to full user when joining rewards.
 */
export interface AnonymousUser {
  id: string;
  deviceId: string;
  createdAt: string;
  lastActiveAt: string;
  dismissedRewardsPrompt: boolean;
}

/**
 * Input for creating or updating an anonymous user.
 */
export interface AnonymousUserInput {
  deviceId: string;
  dismissedRewardsPrompt?: boolean;
}

/**
 * User state enum - represents whether user is anonymous or a rewards member.
 */
export type UserState = 'anonymous' | 'rewards_member';

/**
 * Combined user state object returned by getCurrentUserState.
 */
export interface UserStateInfo {
  state: UserState;
  anonymousUser: AnonymousUser | null;
  rewardsMember: import('./user').User | null;
  isRewardsMember: boolean;
  shouldShowRewardsPrompt: boolean;
}

/**
 * Transform Supabase anonymous_users row to AnonymousUser type.
 */
export function transformAnonymousUser(row: Record<string, unknown>): AnonymousUser {
  return {
    id: row.id as string,
    deviceId: row.device_id as string,
    createdAt: row.created_at as string,
    lastActiveAt: row.last_active_at as string,
    dismissedRewardsPrompt: row.dismissed_rewards_prompt as boolean,
  };
}
