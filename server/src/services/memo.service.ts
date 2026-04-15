import { Memo, MemoColor } from '../models/Memo';
import { BaseService } from './base.service';
import { AppError } from '../middlewares/error.middleware';
import { sequelize } from '../config/sequelize';
import { literal } from 'sequelize';

export class MemoService extends BaseService {
  async getMemos(userId: string): Promise<Memo[]> {
    return Memo.findAll({
      where: { UserId: userId },
      order: [
        ['isPinned', 'DESC'],
        ['order', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  async createMemo(
    userId: string,
    data: {
      title?: string;
      content?: string;
      color?: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
    }
  ): Promise<Memo> {
    // DB 레벨 subquery로 order 계산 — 동시 요청 시 중복 order 방지
    return sequelize.transaction(async t => {
      const nextOrder = literal(
        `(SELECT COALESCE(MAX(\`order\`), 0) + 1 FROM Memos WHERE UserId = ${sequelize.escape(userId)})`
      );
      return Memo.create(
        {
          UserId: userId,
          title: data.title || '',
          content: data.content || '',
          color: data.color || 'yellow',
          isPinned: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          order: nextOrder as any,
        },
        { transaction: t }
      );
    });
  }

  async updateMemo(
    userId: string,
    id: number,
    data: Partial<{
      title: string;
      content: string;
      color: MemoColor;
      isPinned: boolean;
      order: number;
    }>
  ): Promise<Memo> {
    const memo = await Memo.findOne({ where: { id, UserId: userId } });
    if (!memo) throw new AppError(404, '메모를 찾을 수 없습니다.');
    await memo.update(data);
    return memo;
  }

  async deleteMemo(userId: string, id: number): Promise<void> {
    const memo = await Memo.findOne({ where: { id, UserId: userId } });
    if (!memo) throw new AppError(404, '메모를 찾을 수 없습니다.');
    await memo.destroy();
  }
}

export const memoService = new MemoService();
