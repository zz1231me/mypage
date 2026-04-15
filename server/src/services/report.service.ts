// server/src/services/report.service.ts - 콘텐츠 신고 서비스
import { Op } from 'sequelize';
import { Report, ReportTargetType, ReportReason, ReportStatus } from '../models/Report';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { User } from '../models/User';
import { BaseService } from './base.service';
import { AppError } from '../middlewares/error.middleware';

export class ReportService extends BaseService {
  async createReport(params: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: number;
    reason: ReportReason;
    description?: string;
  }): Promise<Report> {
    const { reporterId, targetType, targetId, reason, description } = params;

    // 대상 존재 확인
    if (targetType === 'post') {
      const post = await Post.findByPk(targetId);
      if (!post) throw new AppError(404, '게시글을 찾을 수 없습니다.');
      // 자신의 글 신고 불가
      if (post.UserId === reporterId)
        throw new AppError(400, '자신의 게시글은 신고할 수 없습니다.');
    } else {
      const comment = await Comment.findByPk(targetId);
      if (!comment) throw new AppError(404, '댓글을 찾을 수 없습니다.');
      if (comment.UserId === reporterId)
        throw new AppError(400, '자신의 댓글은 신고할 수 없습니다.');
    }

    // 중복 신고 확인
    const existing = await Report.findOne({
      where: { reporterId, targetType, targetId },
    });
    if (existing) throw new AppError(409, '이미 신고한 콘텐츠입니다.');

    return Report.create({ reporterId, targetType, targetId, reason, description });
  }

  async getReports(params: {
    status?: ReportStatus;
    targetType?: ReportTargetType;
    page?: number;
    limit?: number;
  }) {
    const pagination = this.buildPagination({ page: params.page, limit: params.limit });
    const where: Record<string, unknown> = {};

    if (params.status) where['status'] = params.status;
    if (params.targetType) where['targetType'] = params.targetType;

    const { rows, count } = await Report.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    // 각 신고에 대상 정보 추가 (post/comment 제목 등)
    const enriched = await Promise.all(
      rows.map(async report => {
        const plain = report.get({ plain: true }) as Report & {
          reporter?: { id: string; name: string };
        };
        let targetInfo: { title?: string; content?: string } = {};

        try {
          if (plain.targetType === 'post') {
            const post = await Post.findByPk(plain.targetId, {
              attributes: ['id', 'title', 'boardType'],
              paranoid: false,
            });
            if (post) {
              const p = post.get({ plain: true }) as { title: string; boardType: string };
              targetInfo = { title: p.title };
            }
          } else {
            const comment = await Comment.findByPk(plain.targetId, {
              attributes: ['id', 'content'],
              paranoid: false,
            });
            if (comment) {
              const c = comment.get({ plain: true }) as { content: string };
              targetInfo = { content: c.content?.substring(0, 100) };
            }
          }
        } catch {
          // 삭제된 대상일 수 있음 — 무시
        }

        return { ...plain, targetInfo };
      })
    );

    return this.buildPagedResponse(enriched, count, pagination);
  }

  async reviewReport(params: {
    reportId: number;
    reviewerId: string;
    status: 'reviewed' | 'dismissed' | 'action_taken';
    reviewNote?: string;
  }): Promise<Report> {
    const report = await Report.findByPk(params.reportId);
    if (!report) throw new AppError(404, '신고를 찾을 수 없습니다.');
    if (report.status !== 'pending') throw new AppError(400, '이미 처리된 신고입니다.');

    await report.update({
      status: params.status,
      reviewedBy: params.reviewerId,
      reviewedAt: new Date(),
      reviewNote: params.reviewNote,
    });

    return report;
  }

  async getReportStats() {
    const [pending, reviewed, dismissed, action_taken] = await Promise.all([
      Report.count({ where: { status: 'pending' } }),
      Report.count({ where: { status: 'reviewed' } }),
      Report.count({ where: { status: 'dismissed' } }),
      Report.count({ where: { status: 'action_taken' } }),
    ]);

    const recentPending = await Report.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [{ model: User, as: 'reporter', attributes: ['id', 'name'], required: false }],
    });

    return {
      counts: {
        pending,
        reviewed,
        dismissed,
        action_taken,
        total: pending + reviewed + dismissed + action_taken,
      },
      recentPending: recentPending.map(r => r.get({ plain: true })),
    };
  }

  // 특정 게시글/댓글에 달린 신고 수 조회
  async getTargetReportCount(targetType: ReportTargetType, targetId: number): Promise<number> {
    return Report.count({
      where: {
        targetType,
        targetId,
        status: { [Op.in]: ['pending', 'action_taken'] },
      },
    });
  }
}

export const reportService = new ReportService();
