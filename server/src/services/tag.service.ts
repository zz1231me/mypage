import { Tag } from '../models/Tag';
import { PostTag } from '../models/PostTag';
import { BaseService } from './base.service';
import { AppError } from '../middlewares/error.middleware';
import { sequelize } from '../config/sequelize';
import { UniqueConstraintError, WhereOptions } from 'sequelize';

export class TagService extends BaseService {
  // boardId 지정 시 해당 게시판 태그만, null이면 전체 공용 태그만, undefined면 전체
  async getAllTags(boardId?: string | null): Promise<Tag[]> {
    const where: WhereOptions = boardId !== undefined ? { boardId: boardId ?? null } : {};
    return Tag.findAll({ where, order: [['name', 'ASC']] });
  }

  async createTag(data: {
    name: string;
    color?: string;
    description?: string;
    boardId?: string | null;
  }): Promise<Tag> {
    const name = data.name.toLowerCase().trim();
    const boardId = data.boardId ?? null;
    const existing = await Tag.findOne({ where: { name, boardId } });
    if (existing) throw new AppError(409, `태그 '${name}'이 이미 존재합니다.`);
    try {
      return await Tag.create({
        name,
        color: data.color || '#3b82f6',
        description: data.description,
        boardId,
      });
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new AppError(409, `태그 '${name}'이 이미 존재합니다.`);
      }
      throw err;
    }
  }

  async updateTag(
    id: number,
    data: { name?: string; color?: string; description?: string }
  ): Promise<Tag> {
    const tag = await Tag.findByPk(id);
    if (!tag) throw new AppError(404, '태그를 찾을 수 없습니다.');
    const updateData = { ...data, ...(data.name ? { name: data.name.toLowerCase().trim() } : {}) };
    await tag.update(updateData);
    return tag;
  }

  async deleteTag(id: number): Promise<void> {
    const tag = await Tag.findByPk(id);
    if (!tag) throw new AppError(404, '태그를 찾을 수 없습니다.');
    await sequelize.transaction(async t => {
      await PostTag.destroy({ where: { TagId: id }, transaction: t });
      await tag.destroy({ transaction: t });
    });
  }

  async addTagsToPost(postId: string, tagIds: number[]): Promise<void> {
    await sequelize.transaction(async t => {
      await PostTag.destroy({ where: { PostId: postId }, transaction: t });
      if (tagIds.length > 0) {
        await PostTag.bulkCreate(
          tagIds.map(TagId => ({ PostId: postId, TagId })),
          { transaction: t }
        );
      }
    });
  }

  async getTagsForPost(postId: string): Promise<Tag[]> {
    const postTags = await PostTag.findAll({ where: { PostId: postId } });
    if (postTags.length === 0) return [];
    const tagIds = postTags.map(pt => pt.TagId as number);
    return Tag.findAll({ where: { id: tagIds } });
  }

  async getTagsForPosts(postIds: string[]): Promise<Record<string, Tag[]>> {
    if (postIds.length === 0) return {};
    const postTags = await PostTag.findAll({ where: { PostId: postIds } });
    if (postTags.length === 0) return {};
    const tagIds = [...new Set(postTags.map(pt => pt.TagId as number))];
    const tags = await Tag.findAll({ where: { id: tagIds } });
    const tagMap = new Map(tags.map(t => [t.id, t]));
    const result: Record<string, Tag[]> = {};
    postIds.forEach(id => {
      result[id] = [];
    });
    postTags.forEach(pt => {
      const tag = tagMap.get(pt.TagId as number);
      if (tag && result[pt.PostId as string]) {
        result[pt.PostId as string].push(tag);
      }
    });
    return result;
  }
}

export const tagService = new TagService();
