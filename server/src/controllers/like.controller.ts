import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { logError } from '../utils/logger';
import { likeService } from '../services/like.service';
import { AppError } from '../middlewares/error.middleware';
import { notificationService } from '../services/notification.service';
import { Post } from '../models/Post';

// POST /api/posts/:boardType/:id/like  → 좋아요 토글
export const toggleLike = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: postId } = req.params;
  const userId = req.user?.id;

  try {
    const result = await likeService.toggleLike(postId, userId);

    // 좋아요를 누른 경우 게시글 작성자에게 알림
    if (result.liked) {
      try {
        const post = await Post.findByPk(postId, { attributes: ['UserId', 'title', 'boardType'] });
        if (post?.UserId && post.UserId !== userId) {
          const likerName = req.user?.name || '누군가';
          await notificationService.create({
            userId: post.UserId,
            type: 'LIKE',
            message: `${likerName}님이 "${post.title}" 게시글에 좋아요를 눌렀습니다.`,
            link: `/dashboard/posts/${post.boardType}/${postId}`,
            relatedId: postId,
          });
        }
      } catch (notifErr) {
        logError('좋아요 알림 생성 실패', notifErr);
      }
    }

    sendSuccess(res, result, result.liked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.');
  } catch (err: unknown) {
    if (err instanceof AppError && err.statusCode === 404) return sendNotFound(res, '게시글');
    sendError(res, 500, '좋아요 처리 실패');
  }
};

// GET /api/posts/:boardType/:id/like  → 좋아요 상태 조회
export const getLikeStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: postId } = req.params;
  const userId = req.user?.id;

  try {
    const result = await likeService.getLikeStatus(postId, userId);
    sendSuccess(res, result);
  } catch (_err) {
    sendError(res, 500, '좋아요 조회 실패');
  }
};
