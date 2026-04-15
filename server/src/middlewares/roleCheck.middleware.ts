// server/src/middlewares/roleCheck.middleware.ts - 역할 기반 권한 체크
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth-request';
import { logWarning } from '../utils/logger';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import { ROLES } from '../config/constants';

/**
 * ✅ 특정 역할 권한 체크 미들웨어
 */
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      sendUnauthorized(res, '인증이 필요합니다.');
      return;
    }

    if (authReq.user.role !== requiredRole) {
      logWarning('권한 부족', {
        userId: authReq.user.id,
        userRole: authReq.user.role,
        requiredRole,
      });
      sendForbidden(res, '관리자 권한이 필요합니다.');
      return;
    }

    next();
  };
};

/**
 * ✅ 여러 역할 중 하나라도 만족하면 허용
 */
export const requireAnyRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      sendUnauthorized(res, '인증이 필요합니다.');
      return;
    }

    if (!requiredRoles.includes(authReq.user.role)) {
      logWarning('권한 부족', {
        userId: authReq.user.id,
        userRole: authReq.user.role,
        requiredRoles,
      });
      sendForbidden(res, '적절한 권한이 필요합니다.');
      return;
    }

    next();
  };
};

/**
 * ✅ 관리자 또는 본인 권한 체크
 */
export const requireAdminOrSelf = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      sendUnauthorized(res, '인증이 필요합니다.');
      return;
    }

    const targetUserId = req.params[userIdParam];
    const isPrivileged = authReq.user.role === ROLES.ADMIN || authReq.user.role === ROLES.MANAGER;
    const isSelf = authReq.user.id === targetUserId;

    if (!isPrivileged && !isSelf) {
      logWarning('권한 부족: 타인 리소스 접근 시도', { userId: authReq.user.id, targetUserId });
      sendForbidden(res, '본인 또는 관리자 권한이 필요합니다.');
      return;
    }

    next();
  };
};
