import { BaseService } from './base.service';
import { LoginHistory } from '../models/LoginHistory';
import { Op } from 'sequelize';
import { logError } from '../utils/logger';

interface CreateLoginRecordDTO {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  ipAddress: string;
  userAgent?: string | null;
  status: 'success' | 'failed' | 'locked';
  failureReason?: string | null;
}

interface GetLoginHistoryDTO {
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class LoginHistoryService extends BaseService {
  /**
   * 로그인 이력 생성 (fire-and-forget)
   */
  async createLoginRecord(data: CreateLoginRecordDTO): Promise<void> {
    try {
      await LoginHistory.create({
        ...data,
        userAgent: data.userAgent?.substring(0, 500) ?? null,
      });
    } catch (error) {
      logError('로그인 이력 저장 실패', error);
    }
  }

  /**
   * 로그인 이력 조회
   */
  async getLoginHistory(params: GetLoginHistoryDTO) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.status && ['success', 'failed', 'locked'].includes(params.status)) {
      where.status = params.status;
    }

    if (params.startDate && params.endDate) {
      where.createdAt = {
        [Op.between]: [new Date(params.startDate), new Date(params.endDate)],
      };
    } else if (params.startDate) {
      where.createdAt = { [Op.gte]: new Date(params.startDate) };
    } else if (params.endDate) {
      where.createdAt = { [Op.lte]: new Date(params.endDate) };
    }

    const { count, rows } = await LoginHistory.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      records: rows,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    };
  }

  /**
   * 오래된 로그인 이력 자동 삭제
   */
  async deleteOldRecords(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return LoginHistory.destroy({
      where: { createdAt: { [Op.lt]: cutoffDate } },
    });
  }
}

export const loginHistoryService = new LoginHistoryService();
