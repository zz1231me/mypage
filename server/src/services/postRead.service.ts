import { PostRead } from '../models/PostRead';
import { BaseService } from './base.service';
import { Op } from 'sequelize';

export class PostReadService extends BaseService {
  async markRead(postId: string, userId: string): Promise<void> {
    await PostRead.upsert({ PostId: postId, UserId: userId, readAt: new Date() });
  }

  async getReadPostIds(postIds: string[], userId: string): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();
    const reads = await PostRead.findAll({
      where: { PostId: { [Op.in]: postIds }, UserId: userId },
      attributes: ['PostId'],
    });
    return new Set(reads.map(r => r.PostId as string));
  }

  async isRead(postId: string, userId: string): Promise<boolean> {
    const read = await PostRead.findOne({ where: { PostId: postId, UserId: userId } });
    return !!read;
  }
}

export const postReadService = new PostReadService();
