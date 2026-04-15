import { PostReaction, ReactionType } from '../models/PostReaction';
import { CommentReaction, CommentReactionType } from '../models/CommentReaction';
import { BaseService } from './base.service';
import { Op, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../config/sequelize';

const REACTION_TYPES: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

export class ReactionService extends BaseService {
  async toggleReaction(postId: string, userId: string, type: ReactionType) {
    // 트랜잭션 + LOCK으로 동시 요청 race condition 방지
    await sequelize.transaction(async t => {
      const existing = await PostReaction.findOne({
        where: { PostId: postId, UserId: userId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existing) {
        if (existing.type === type) {
          await existing.destroy({ transaction: t });
        } else {
          existing.type = type;
          await existing.save({ transaction: t });
        }
      } else {
        try {
          await PostReaction.create({ PostId: postId, UserId: userId, type }, { transaction: t });
        } catch (err) {
          // 동시 요청으로 이미 생성된 경우 — 같은 결과이므로 무시
          if (!(err instanceof UniqueConstraintError)) throw err;
        }
      }
    });

    return this.getReactions(postId, userId);
  }

  async getReactions(postId: string, userId: string) {
    const reactions = await PostReaction.findAll({ where: { PostId: postId } });

    const counts: Record<string, number> = {};
    REACTION_TYPES.forEach(t => {
      counts[t] = 0;
    });
    reactions.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });

    const myReaction = reactions.find(r => r.UserId === userId)?.type ?? null;
    return { myReaction, counts };
  }

  async getReactionCountsForPosts(
    postIds: string[]
  ): Promise<Record<string, Record<string, number>>> {
    if (postIds.length === 0) return {};
    const reactions = await PostReaction.findAll({ where: { PostId: { [Op.in]: postIds } } });
    const result: Record<string, Record<string, number>> = {};
    postIds.forEach(id => {
      result[id] = {};
      REACTION_TYPES.forEach(t => {
        result[id][t] = 0;
      });
    });
    reactions.forEach(r => {
      const postId = r.PostId;
      if (postId && result[postId]) {
        result[postId][r.type] = (result[postId][r.type] || 0) + 1;
      }
    });
    return result;
  }

  // ── 댓글 리액션 ──────────────────────────────────────

  async toggleCommentReaction(commentId: number, userId: string, type: CommentReactionType) {
    await sequelize.transaction(async t => {
      const existing = await CommentReaction.findOne({
        where: { CommentId: commentId, UserId: userId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existing) {
        if (existing.type === type) {
          await existing.destroy({ transaction: t });
        } else {
          existing.type = type;
          await existing.save({ transaction: t });
        }
      } else {
        try {
          await CommentReaction.create(
            { CommentId: commentId, UserId: userId, type },
            { transaction: t }
          );
        } catch (err) {
          if (!(err instanceof UniqueConstraintError)) throw err;
        }
      }
    });

    return this.getCommentReactions(commentId, userId);
  }

  async getCommentReactions(commentId: number, userId: string) {
    const reactions = await CommentReaction.findAll({ where: { CommentId: commentId } });

    const counts: Record<string, number> = {};
    REACTION_TYPES.forEach(t => {
      counts[t] = 0;
    });
    reactions.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });

    const myReaction = reactions.find(r => r.UserId === userId)?.type ?? null;
    return { myReaction, counts };
  }

  async getCommentReactionCountsForComments(
    commentIds: number[]
  ): Promise<Record<number, { counts: Record<string, number>; total: number }>> {
    if (commentIds.length === 0) return {};
    const reactions = await CommentReaction.findAll({
      where: { CommentId: { [Op.in]: commentIds } },
    });
    const result: Record<number, { counts: Record<string, number>; total: number }> = {};
    commentIds.forEach(id => {
      result[id] = { counts: {}, total: 0 };
      REACTION_TYPES.forEach(t => {
        result[id].counts[t] = 0;
      });
    });
    reactions.forEach(r => {
      const cid = r.CommentId;
      if (cid !== undefined && result[cid]) {
        result[cid].counts[r.type] = (result[cid].counts[r.type] || 0) + 1;
        result[cid].total++;
      }
    });
    return result;
  }
}

export const reactionService = new ReactionService();
