// hooks/useCurrentRewardsUserId.ts
//
// Resolves the current viewer's `users.id` (rewards member ID) from the
// rewards conversion service and keeps it in sync with auth state changes.
// Used by social features (comments, follows, blocks) that need to know
// which `users` row represents the signed-in actor.

import { useEffect, useState } from 'react';
import { getRewardsMemberForAnonymousUser } from '../services/rewardsConversionService';
import { onAuthStateChange } from '../services/authService';

export function useCurrentRewardsUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const member = await getRewardsMemberForAnonymousUser();
      if (cancelled) return;
      setUserId(member?.id ?? null);
    };

    resolve();

    const unsubscribe = onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Wait a beat for createRewardsMemberFromAuthUser to finish wiring up.
        setTimeout(resolve, 1500);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return userId;
}
