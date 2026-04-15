import api from './axios';
import { unwrap } from './utils';
import { ReactionType } from '../types/board.types';

export async function toggleReaction(boardType: string, postId: string, type: ReactionType) {
  const res = await api.post(`/posts/${boardType}/${postId}/reactions`, { type });
  return unwrap(res);
}

export async function getReactions(boardType: string, postId: string) {
  const res = await api.get(`/posts/${boardType}/${postId}/reactions`);
  return unwrap(res);
}

// ── 댓글 리액션 ──────────────────────────────────────────────────────────

export async function toggleCommentReaction(commentId: number, type: ReactionType) {
  const res = await api.post(`/comments/reactions/${commentId}`, { type });
  return unwrap(res) as { myReaction: ReactionType | null; counts: Record<string, number> };
}

export async function getCommentReactions(commentId: number) {
  const res = await api.get(`/comments/reactions/${commentId}`);
  return unwrap(res) as { myReaction: ReactionType | null; counts: Record<string, number> };
}
