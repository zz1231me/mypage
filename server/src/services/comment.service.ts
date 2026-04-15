import { BaseService } from './base.service';
import { Comment, CommentInstance } from '../models/Comment';
import { User } from '../models/User';
import { AppError } from '../middlewares/error.middleware';
import { isAdminOrManager } from '../config/constants';
import { getCommentSettings } from '../utils/settingsCache';

// Note: User is still needed for the include in findByPk responses

export class CommentService extends BaseService {
  /**
   * 댓글 생성
   * authorName: controller가 req.user.name 을 전달하므로 별도 User 조회 불필요
   */
  async createComment(
    postId: string,
    userId: string,
    content: string,
    authorName: string,
    parentId?: number
  ): Promise<CommentInstance> {
    // 대댓글 깊이 체크 (최대 깊이는 관리자 설정값 사용)
    if (parentId !== undefined && parentId !== null) {
      const parentComment = await Comment.findByPk(parentId, { attributes: ['depth'] });
      if (!parentComment) {
        throw new AppError(404, '부모 댓글을 찾을 수 없습니다.');
      }
      const { maxDepth } = getCommentSettings();
      // depth는 0-based이므로 maxDepth단계 = depth(maxDepth-1)까지 허용
      if ((parentComment.depth ?? 0) >= maxDepth - 1) {
        throw new AppError(
          400,
          `더 이상 대댓글을 달 수 없습니다. 최대 ${maxDepth}단계까지 허용됩니다.`
        );
      }
    }

    // 댓글 생성
    const newComment = await Comment.create({
      content: content.trim(),
      PostId: postId,
      UserId: userId,
      author: authorName,
      parentId: parentId ?? null,
    });

    // 응답용 데이터 조회 (User 정보 포함)
    const commentWithUser = await Comment.findByPk(newComment.id, {
      attributes: [
        'id',
        'content',
        'author',
        'createdAt',
        'updatedAt',
        'UserId',
        'PostId',
        'isEdited',
        'editedAt',
        'parentId',
        'depth',
        'path',
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar'],
          required: false,
        },
      ],
    });

    if (!commentWithUser) {
      throw new AppError(500, '댓글 생성 후 조회 실패');
    }

    return commentWithUser;
  }

  /**
   * 게시글의 댓글 목록 조회
   * @param sortBy 'oldest' (기본) | 'newest' | 'popular'
   */
  async getCommentsByPost(
    postId: string,
    sortBy: 'oldest' | 'newest' | 'popular' = 'oldest'
  ): Promise<CommentInstance[]> {
    const orderMap: Record<string, [string, string][]> = {
      oldest: [['createdAt', 'ASC']],
      newest: [['createdAt', 'DESC']],
      popular: [
        ['likeCount', 'DESC'],
        ['createdAt', 'ASC'],
      ],
    };

    return Comment.findAll({
      where: { PostId: postId },
      attributes: [
        'id',
        'content',
        'author',
        'createdAt',
        'updatedAt',
        'UserId',
        'PostId',
        'isEdited',
        'editedAt',
        'parentId',
        'depth',
        'path',
        'likeCount',
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar'],
          required: false,
        },
      ],
      order: orderMap[sortBy] ?? [['createdAt', 'ASC']],
      // DoS 방지: 게시글당 최대 개수는 관리자 설정값 사용
      limit: getCommentSettings().maxCount,
    });
  }

  /**
   * 댓글 수정
   */
  async updateComment(
    commentId: number,
    userId: string,
    userRole: string,
    content: string
  ): Promise<CommentInstance> {
    const comment = await Comment.findByPk(commentId);

    if (!comment) {
      throw new AppError(404, '댓글을 찾을 수 없습니다.');
    }

    // 권한 확인 (admin, manager 또는 작성자 본인)
    const isPrivileged = isAdminOrManager(userRole);
    const isOwner = comment.UserId === userId;

    if (!isPrivileged && !isOwner) {
      throw new AppError(403, '수정 권한이 없습니다.');
    }

    // beforeUpdate 훅이 isEdited/editedAt 자동 설정하므로 content만 전달
    await comment.update({ content: content.trim() });

    // 응답용 데이터 조회
    const updatedComment = await Comment.findByPk(commentId, {
      attributes: [
        'id',
        'content',
        'author',
        'createdAt',
        'updatedAt',
        'UserId',
        'PostId',
        'isEdited',
        'editedAt',
        'parentId',
        'depth',
        'path',
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar'],
          required: false,
        },
      ],
    });

    if (!updatedComment) {
      throw new AppError(500, '댓글 수정 후 조회 실패');
    }

    return updatedComment;
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(commentId: number, userId: string, userRole: string): Promise<void> {
    const comment = await Comment.findByPk(commentId);

    if (!comment) {
      throw new AppError(404, '댓글을 찾을 수 없습니다.');
    }

    // 권한 확인 (admin, manager 또는 작성자 본인)
    const isPrivileged = isAdminOrManager(userRole);
    const isOwner = comment.UserId === userId;

    if (!isPrivileged && !isOwner) {
      throw new AppError(403, '삭제 권한이 없습니다.');
    }

    // soft delete가 model에 설정되어 있으므로 destroy 호출
    await comment.destroy();
  }
}

export const commentService = new CommentService();
