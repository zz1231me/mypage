import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { errorLogService } from '../services/errorLog.service';
import { parsePagination } from '../utils/pagination';
import { logError, logInfo } from '../utils/logger';
import { AppError } from '../middlewares/error.middleware';

export const getErrorLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, limit } = parsePagination(req, { defaultLimit: 50, maxLimit: 100 });
  const filters = {
    severity: (req.query.severity as string) || undefined,
    userId: (req.query.userId as string) || undefined,
    route: (req.query.route as string) || undefined,
    dateFrom: (req.query.dateFrom as string) || undefined,
    dateTo: (req.query.dateTo as string) || undefined,
  };
  // Remove undefined values
  Object.keys(filters).forEach(k => {
    if ((filters as any)[k] === undefined) delete (filters as any)[k];
  });

  try {
    const result = await errorLogService.getLogs(filters, page, limit);
    sendSuccess(res, result);
  } catch (err) {
    logError('에러 로그 조회 실패', err);
    sendError(res, 500, '에러 로그 조회 중 오류가 발생했습니다.');
  }
};

/**
 * 에러 로그 일괄 삭제
 * Body: { before?: string (ISO date), severity?: string, ids?: string[] }
 */
export const deleteErrorLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { before, severity, ids } = req.body as {
    before?: string;
    severity?: string;
    ids?: string[];
  };
  try {
    const deleted = await errorLogService.deleteLogs({ before, severity, ids });
    logInfo(`에러 로그 삭제: ${deleted}건`, { before, severity, ids });
    sendSuccess(res, { deleted }, `${deleted}건의 에러 로그가 삭제되었습니다.`);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 400) {
      sendValidationError(res, 'condition', err.message);
      return;
    }
    logError('에러 로그 삭제 실패', err);
    sendError(res, 500, '에러 로그 삭제 중 오류가 발생했습니다.');
  }
};
