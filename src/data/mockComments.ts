// data/mockComments.ts
//
// Temporary mock comments for visual development of CommentsSheet.
// Replace with real Supabase fetches once the schema is in place.

import { CatchComment } from '../types/catchFeed';

export const MOCK_COMMENTS: CatchComment[] = [
  {
    id: 'c-1',
    reportId: 'mock-report',
    userId: 'user-2',
    anglerName: 'Sarah K.',
    anglerProfileImage: undefined,
    text: 'Nice red drum! What were you using for bait?',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    isOwn: false,
  },
  {
    id: 'c-2',
    reportId: 'mock-report',
    userId: 'user-3',
    anglerName: 'Mike P.',
    anglerProfileImage: undefined,
    text: 'Beauty of a fish 🎣 Pamlico is producing big time this year.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isOwn: false,
  },
  {
    id: 'c-3',
    reportId: 'mock-report',
    userId: 'user-current',
    anglerName: 'You',
    anglerProfileImage: undefined,
    text: 'Topwater plug at sunrise. They were busting bait all over the shallows.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    isOwn: true,
  },
  {
    id: 'c-4',
    reportId: 'mock-report',
    userId: 'user-4',
    anglerName: 'Emma R.',
    anglerProfileImage: undefined,
    text: 'Heading down next week, any tips for first-timers in that area?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    isOwn: false,
  },
];

export const MOCK_COMMENTS_EMPTY: CatchComment[] = [];
