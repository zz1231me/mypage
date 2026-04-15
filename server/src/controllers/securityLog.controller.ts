import { Request, Response, NextFunction } from 'express';
import { securityLogService } from '../services/securityLog.service';
import { sendSuccess, sendError } from '../utils/response';
import { logError, logInfo } from '../utils/logger';

/**
 * 보안 로그 목록 조회
 */
export const getSecurityLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const userId = req.query.userId as string;
    const ipAddress = req.query.ipAddress as string;
    const action = req.query.action as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await securityLogService.getLogs({
      page,
      limit,
      userId,
      ipAddress,
      action,
      startDate,
      endDate,
    });

    sendSuccess(res, result);
  } catch (error) {
    logError('보안 로그 조회 실패', error);
    next(error);
  }
};

/**
 * 보안 로그 일괄 삭제
 * Body: { before?: string (ISO date), ids?: string[] }
 * before만 지정하면 해당 날짜 이전 로그 삭제
 * ids 지정하면 해당 ID 목록만 삭제
 * 둘 다 없으면 전체 삭제
 */
export const deleteSecurityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { before, ids } = req.body as { before?: string; ids?: string[] };
    const deleted = await securityLogService.deleteLogs({ before, ids });
    logInfo(`보안 로그 삭제: ${deleted}건`, { before, ids });
    sendSuccess(res, { deleted }, `${deleted}건의 보안 로그가 삭제되었습니다.`);
  } catch (error) {
    logError('보안 로그 삭제 실패', error);
    sendError(res, 500, '보안 로그 삭제 중 오류가 발생했습니다.');
  }
};
