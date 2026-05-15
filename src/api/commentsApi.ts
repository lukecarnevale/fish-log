// api/commentsApi.ts
//
// React Query hooks for the catch comments feature.
//
// Caching strategy:
// - One query per reportId (key: ['comments', reportId])
// - Optimistic insert + delete to keep the sheet feeling instant
// - On error, mutation rolls back and rethrows so the UI can toast

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchComments,
  addComment,
  deleteComment,
  reportComment,
} from '../services/commentsService';
import { CatchComment } from '../types/catchFeed';

export const COMMENTS_QUERY_KEY = 'comments';

function key(reportId: string): readonly unknown[] {
  return [COMMENTS_QUERY_KEY, reportId];
}

/**
 * Fetch + cache comments for a single report.
 * Disabled until a non-null reportId is provided — the consumer controls
 * loading by toggling `enabled`.
 */
export function useComments(reportId: string | null, currentUserId?: string) {
  return useQuery<CatchComment[]>({
    queryKey: reportId ? key(reportId) : ['comments', 'disabled'],
    queryFn: () => fetchComments(reportId as string, currentUserId),
    enabled: !!reportId,
    staleTime: 30 * 1000, // 30s — comments are user-facing realtime-ish; balance freshness vs chatter
  });
}

interface AddCommentVars {
  reportId: string;
  userId: string;
  anglerName: string;
  anglerProfileImage?: string;
  text: string;
}

/**
 * Add a comment, optimistically prepending to the list while the network
 * round-trip completes. On error rolls back to the previous list.
 */
export function useAddComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: AddCommentVars) =>
      addComment(vars.reportId, vars.userId, vars.text),

    onMutate: async (vars) => {
      const k = key(vars.reportId);
      await qc.cancelQueries({ queryKey: k });
      const previous = qc.getQueryData<CatchComment[]>(k);

      const optimistic: CatchComment = {
        id: `optimistic-${Date.now()}`,
        reportId: vars.reportId,
        userId: vars.userId,
        anglerName: vars.anglerName,
        anglerProfileImage: vars.anglerProfileImage,
        text: vars.text,
        createdAt: new Date().toISOString(),
        isOwn: true,
      };

      qc.setQueryData<CatchComment[]>(k, [...(previous ?? []), optimistic]);
      return { previous, optimisticId: optimistic.id };
    },

    onSuccess: (real, vars, ctx) => {
      // Replace the optimistic row with the real server row in the cache.
      qc.setQueryData<CatchComment[]>(key(vars.reportId), (cur) => {
        if (!cur) return [real];
        return cur.map((c) => (c.id === ctx?.optimisticId ? real : c));
      });
    },

    onError: (_err, vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(key(vars.reportId), ctx.previous);
      }
    },
  });
}

interface DeleteCommentVars {
  reportId: string;
  commentId: string;
}

export function useDeleteComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: DeleteCommentVars) => deleteComment(vars.commentId),

    onMutate: async (vars) => {
      const k = key(vars.reportId);
      await qc.cancelQueries({ queryKey: k });
      const previous = qc.getQueryData<CatchComment[]>(k);
      qc.setQueryData<CatchComment[]>(k, (cur) =>
        (cur ?? []).filter((c) => c.id !== vars.commentId),
      );
      return { previous };
    },

    onError: (_err, vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(key(vars.reportId), ctx.previous);
      }
    },
  });
}

interface ReportCommentVars {
  commentId: string;
  reporterId: string;
  reason?: string;
}

export function useReportComment() {
  return useMutation({
    mutationFn: (vars: ReportCommentVars) =>
      reportComment(vars.commentId, vars.reporterId, vars.reason),
  });
}
