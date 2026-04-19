import { Response } from 'express';

import { userSessionService } from '../services/userSession.service';
import { auditLogService } from '../services/auditLog.service';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { logError } from '../utils/logger';
import { invalidateUserCache } from '../middlewares/auth.middleware';
import { User } from '../models/User';
import { FlatRequest as Request, type AuthRequest } from '../types/auth-request';

export const getUserSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const sessions = await userSessionService.getActiveSessions(userId);
    sendSuccess(res, sessions);
  } catch (error) {
    logError('세션 목록 조회 실패', error);
    sendError(res, 500, '세션 목록 조회 실패');
  }
};

export const forceLogoutSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, sessionId } = req.params;
    const success = await userSessionService.forceLogout(sessionId);

    if (!success) {
      sendNotFound(res, '세션');
      return;
    }

    // tokenVersion 증가 → 해당 사용자의 모든 기존 JWT(access/refresh) 무효화
    try {
      const user = await User.findByPk(userId);
      if (user) {
        await user.increment('tokenVersion');
        invalidateUserCache(userId); // 인증 미들웨어 캐시도 즉시 제거
      }
    } catch (tvErr) {
      logError('강제 종료 후 tokenVersion 증가 실패', tvErr);
      // tokenVersion 증가 실패해도 세션 비활성화는 완료됐으므로 계속 진행
    }

    const authReq = req as unknown as AuthRequest;
    auditLogService
      .createAuditLog({
        adminId: authReq.user?.id ?? 'unknown',
        adminName: authReq.user?.name ?? 'unknown',
        action: 'force_logout',
        targetType: 'user',
        targetId: userId,
        afterValue: { sessionId, forcedAt: new Date().toISOString() },
        ipAddress: req.ip ?? null,
      })
      .catch(err => logError('감사 로그 기록 실패 (강제 로그아웃)', err));

    sendSuccess(res, null, '세션이 강제 종료되었습니다.');
  } catch (error) {
    logError('세션 강제 종료 실패', error);
    sendError(res, 500, '세션 강제 종료 실패');
  }
};

export const getOwnSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as unknown as AuthRequest;
    if (!authReq.user?.id) {
      sendError(res, 401, '인증 정보가 없습니다.');
      return;
    }
    const sessions = await userSessionService.getActiveSessions(authReq.user.id);
    sendSuccess(res, sessions);
  } catch (error) {
    logError('내 세션 목록 조회 실패', error);
    sendError(res, 500, '세션 목록 조회 실패');
  }
};
