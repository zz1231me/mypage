// src/controllers/comment.controller.ts - Service Layer 적용
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth-request';
import { commentService } from '../services/comment.service';
import { notificationService } from '../services/notification.service';
import {
  sendSuccess,
  sendUnauthorized,
  sendForbidden,
  sendValidationError,
  sendNotFound,
} from '../utils/response';
import { logError } from '../utils/logger';
import { getSettings } from '../utils/settingsCache';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';

// ✅ 댓글 작성
export const createComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      sendUnauthorized(res, '로그인이 필요합니다.');
      return;
    }

    if (req.user?.role === 'guest' && !getSettings().allowGuestComment) {
      sendForbidden(res, '게스트는 댓글을 작성할 수 없습니다.');
      return;
    }

    if (!content || content.trim().length === 0) {
      sendValidationError(res, 'content', '댓글 내용을 입력해주세요.');
      return;
    }

    if (content.trim().length > 1000) {
      sendValidationError(res, 'content', '댓글은 1000자 이내로 작성해주세요.');
      return;
    }

    // ✅ 게시글 존재 여부 확인 + 알림용 정보를 한 번에 조회
    const post = await Post.findByPk(postId, {
      attributes: ['id', 'UserId', 'title', 'boardType'],
    });
    if (!post) {
      sendNotFound(res, '게시글');
      return;
    }

    const authorName = req.user?.name || '알 수 없음';
    const comment = await commentService.createComment(
      postId,
      userId,
      content,
      authorName,
      parentId
    );

    const commenterName = req.user?.name || '누군가';

    // 알림 1: 내 글에 댓글 달린 경우 → 게시글 작성자에게 알림
    if (post.UserId && post.UserId !== userId) {
      notificationService
        .create({
          userId: post.UserId,
          type: 'COMMENT',
          message: `${commenterName}님이 "${post.title}" 게시글에 댓글을 남겼습니다.`,
          link: `/dashboard/posts/${post.boardType}/${postId}`,
          relatedId: postId,
        })
        .catch(err => logError('댓글 알림 생성 실패', err));
    }

    // 알림 2: 내 댓글에 대댓글 달린 경우 → 원댓글 작성자에게 알림
    if (parentId) {
      const parentComment = await Comment.findByPk(parentId, { attributes: ['UserId'] });
      if (
        parentComment?.UserId &&
        parentComment.UserId !== userId &&
        parentComment.UserId !== post.UserId
      ) {
        notificationService
          .create({
            userId: parentComment.UserId,
            type: 'COMMENT',
            message: `${commenterName}님이 회원님의 댓글에 답글을 남겼습니다.`,
            link: `/dashboard/posts/${post.boardType}/${postId}`,
            relatedId: postId,
          })
          .catch(err => logError('대댓글 알림 생성 실패', err));
      }
    }

    sendSuccess(res, comment, '댓글이 작성되었습니다.', 201);
  } catch (err) {
    next(err);
  }
};

// ✅ 게시글의 댓글 조회
export const getCommentsByPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;
    const sortBy = (req.query.sortBy as string) ?? 'oldest';
    const validSorts = ['oldest', 'newest', 'popular'];
    const sort = validSorts.includes(sortBy)
      ? (sortBy as 'oldest' | 'newest' | 'popular')
      : 'oldest';
    const comments = await commentService.getCommentsByPost(postId, sort);
    sendSuccess(res, comments, '댓글 목록 조회 성공');
  } catch (err) {
    next(err);
  }
};

// ✅ 댓글 수정
export const updateComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      sendUnauthorized(res, '로그인이 필요합니다.');
      return;
    }

    if (!content || content.trim().length === 0) {
      sendValidationError(res, 'content', '댓글 내용을 입력해주세요.');
      return;
    }

    if (content.trim().length > 1000) {
      sendValidationError(res, 'content', '댓글은 1000자 이내로 작성해주세요.');
      return;
    }

    const numericCommentId = parseInt(commentId, 10);
    if (isNaN(numericCommentId)) {
      sendValidationError(res, 'commentId', '잘못된 댓글 ID입니다.');
      return;
    }

    const updatedComment = await commentService.updateComment(
      numericCommentId,
      userId,
      userRole || 'guest',
      content
    );

    sendSuccess(res, updatedComment, '댓글이 수정되었습니다.');
  } catch (err) {
    next(err);
  }
};

// ✅ 댓글 삭제
export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      sendUnauthorized(res, '로그인이 필요합니다.');
      return;
    }

    const numericCommentId = parseInt(commentId, 10);
    if (isNaN(numericCommentId)) {
      sendValidationError(res, 'commentId', '잘못된 댓글 ID입니다.');
      return;
    }

    await commentService.deleteComment(numericCommentId, userId, userRole || 'guest');

    sendSuccess(res, { deletedCommentId: commentId }, '댓글이 삭제되었습니다.');
  } catch (err) {
    next(err);
  }
};
