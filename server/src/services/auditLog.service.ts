import { BaseService } from './base.service';
import { AuditLog, AuditAction, AuditTargetType } from '../models/AuditLog';
import { Op } from 'sequelize';
import { logError } from '../utils/logger';

interface CreateAuditLogDTO {
  adminId: string;
  adminName: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  targetName?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterValue?: any;
  ipAddress?: string | null;
}

interface GetAuditLogsDTO {
  adminId?: string;
  targetId?: string;
  action?: AuditAction;
  targetType?: AuditTargetType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class AuditLogService extends BaseService {
  /**
   * 감사 로그 생성 (fire-and-forget)
   */
  async createAuditLog(data: CreateAuditLogDTO): Promise<void> {
    try {
      await AuditLog.create(data);
    } catch (error) {
      logError('감사 로그 저장 실패', error);
    }
  }

  /**
   * 감사 로그 조회
   */
  async getAuditLogs(params: GetAuditLogsDTO) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (params.adminId) {
      where.adminId = params.adminId;
    }

    if (params.targetId) {
      where.targetId = params.targetId;
    }

    if (params.action) {
      where.action = params.action;
    }

    if (params.targetType) {
      where.targetType = params.targetType;
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

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      logs: rows,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    };
  }

  /**
   * 오래된 감사 로그 자동 삭제
   */
  async deleteOldLogs(retentionDays = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return AuditLog.destroy({
      where: { createdAt: { [Op.lt]: cutoffDate } },
    });
  }
}

export const auditLogService = new AuditLogService();
