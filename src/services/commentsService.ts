// services/commentsService.ts
//
// Backend access for catch comments (catch_comments table). RLS enforces
// that callers can only insert/delete their own rows, so this layer is a
// thin wrapper around supabase-js.

import { supabase } from '../config/supabase';
import { CatchComment } from '../types/catchFeed';

interface RawCommentRow {
  id: string;
  report_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  users: {
    first_name: string | null;
    last_name: string | null;
    profile_image_url: string | null;
  } | null;
}

function transformCommentRow(row: RawCommentRow, currentUserId?: string): CatchComment {
  const firstName = row.users?.first_name || 'Anonymous';
  const lastInitial = row.users?.last_name ? `${row.users.last_name.charAt(0)}.` : '';
  return {
    id: row.id,
    reportId: row.report_id,
    userId: row.user_id,
    anglerName: `${firstName} ${lastInitial}`.trim(),
    anglerProfileImage: row.users?.profile_image_url || undefined,
    text: row.text,
    createdAt: row.created_at,
    isOwn: currentUserId !== undefined && row.user_id === currentUserId,
  };
}

/**
 * Fetch all comments for a report, oldest-first so newest appears at the bottom
 * (mirrors Instagram's vertical thread direction).
 */
export async function fetchComments(
  reportId: string,
  currentUserId?: string,
): Promise<CatchComment[]> {
  const { data, error } = await supabase
    .from('catch_comments')
    .select(`
      id,
      report_id,
      user_id,
      text,
      created_at,
      updated_at,
      users:user_id (
        first_name,
        last_name,
        profile_image_url
      )
    `)
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch comments: ${error.message}`);
  }

  return ((data || []) as unknown as RawCommentRow[]).map((row) =>
    transformCommentRow(row, currentUserId),
  );
}

/**
 * Insert a new comment. RLS enforces user_id matches the caller's rewards user.
 * Returns the hydrated CatchComment so the caller can update local state.
 */
export async function addComment(
  reportId: string,
  userId: string,
  text: string,
): Promise<CatchComment> {
  const { data, error } = await supabase
    .from('catch_comments')
    .insert({ report_id: reportId, user_id: userId, text })
    .select(`
      id,
      report_id,
      user_id,
      text,
      created_at,
      updated_at,
      users:user_id (
        first_name,
        last_name,
        profile_image_url
      )
    `)
    .single();

  if (error || !data) {
    throw new Error(`Failed to add comment: ${error?.message ?? 'no data'}`);
  }

  return transformCommentRow(data as unknown as RawCommentRow, userId);
}

/**
 * Delete a comment. RLS enforces only the author can delete.
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('catch_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}

/**
 * File a moderation report against a comment. RLS enforces reporter_id matches
 * the caller. Duplicate reports (same reporter, same comment) are silently
 * absorbed via the unique constraint.
 */
export async function reportComment(
  commentId: string,
  reporterId: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase
    .from('comment_reports')
    .insert({ comment_id: commentId, reporter_id: reporterId, reason: reason ?? null });

  // 23505 = unique_violation; the user already reported this comment. Treat as success.
  if (error && error.code !== '23505') {
    throw new Error(`Failed to report comment: ${error.message}`);
  }
}
