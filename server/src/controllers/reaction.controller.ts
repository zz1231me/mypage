import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized } from '../utils/response';
import { logError } from '../utils/logger';
import { reactionService } from '../services/reaction.service';
import { ReactionType } from '../models/PostReaction';
import { CommentReactionType } from '../models/CommentReaction';

const VALID_TYPES: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
const VALID_COMMENT_TYPES: CommentReactionType[] = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

export const toggleReaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: postId } = req.params;
  const { type } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    sendUnauthorized(res, '로그인이 필요합니다.');
    return;
  }

  if (!VALID_TYPES.includes(type)) {
    return sendValidationError(res, 'type', '유효하지 않은 반응 타입입니다.');
  }

  try {
    const result = await reactionService.toggleReaction(postId, userId, type);
    sendSuccess(res, result);
  } catch (err) {
    logError('반응 처리 실패', err, { postId, userId });
    sendError(res, 500, '반응 처리 중 오류가 발생했습니다.');
  }
};

export const getReactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: postId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    sendUnauthorized(res, '로그인이 필요합니다.');
    return;
  }

  try {
    const result = await reactionService.getReactions(postId, userId);
    sendSuccess(res, result);
  } catch (err) {
    logError('반응 조회 실패', err, { postId, userId });
    sendError(res, 500, '반응 조회 중 오류가 발생했습니다.');
  }
};

// ── 댓글 리액션 ──────────────────────────────────────────────────────────

export const toggleCommentReaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const commentId = parseInt(req.params.commentId, 10);
  const { type } = req.body as { type: string };
  const userId = req.user?.id;

  if (!userId) {
    sendUnauthorized(res, '로그인이 필요합니다.');
    return;
  }
  if (isNaN(commentId)) {
    sendValidationError(res, 'commentId', '유효하지 않은 댓글 ID입니다.');
    return;
  }
  if (!VALID_COMMENT_TYPES.includes(type as CommentReactionType)) {
    sendValidationError(res, 'type', '유효하지 않은 반응 타입입니다.');
    return;
  }

  try {
    const result = await reactionService.toggleCommentReaction(
      commentId,
      userId,
      type as CommentReactionType
    );
    sendSuccess(res, result);
  } catch (err) {
    logError('댓글 반응 처리 실패', err, { commentId, userId });
    sendError(res, 500, '반응 처리 중 오류가 발생했습니다.');
  }
};

export const getCommentReactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const commentId = parseInt(req.params.commentId, 10);
  const userId = req.user?.id;

  if (!userId) {
    sendUnauthorized(res, '로그인이 필요합니다.');
    return;
  }
  if (isNaN(commentId)) {
    sendValidationError(res, 'commentId', '유효하지 않은 댓글 ID입니다.');
    return;
  }

  try {
    const result = await reactionService.getCommentReactions(commentId, userId);
    sendSuccess(res, result);
  } catch (err) {
    logError('댓글 반응 조회 실패', err, { commentId, userId });
    sendError(res, 500, '반응 조회 중 오류가 발생했습니다.');
  }
};
