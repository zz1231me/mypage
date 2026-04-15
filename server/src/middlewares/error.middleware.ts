// ============================================================================
// server/src/middlewares/error.middleware.ts
// TypeScript 5.8 호환 - override 수정자 적용
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { errorLogService } from '../services/errorLog.service';
import { logError } from '../utils/logger';
import { env } from '../config/env';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: string;
  };
}

// ============================================================================
// ✅ TypeScript 5.8: override 수정자 적용
// ============================================================================
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // ✅ 프로토타입 체인 복구 (TypeScript inheritance 패턴)
    Object.setPrototypeOf(this, AppError.prototype);

    // ✅ 스택 트레이스 캡처
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// 에러 핸들러 미들웨어
// ============================================================================
export const errorHandler = (
  err: Error,
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
): void => {
  const userId = req.user?.id;
  const userName = req.user?.name;
  const userRole = req.user?.role;

  // ✅ 개발 환경 여부: NODE_ENV가 명시적으로 'development'인 경우에만 상세 정보 노출
  const isDev = env.NODE_ENV === 'development';

  if (err instanceof AppError) {
    // Only log 5xx errors to DB (not client errors)
    if (err.statusCode >= 500) {
      void errorLogService.createLog({
        userId,
        userName,
        userRole,
        route: req.originalUrl,
        method: req.method,
        errorCode: `HTTP_${err.statusCode}`,
        errorMessage: err.message,
        errorStack: isDev ? err.stack : undefined,
        severity: 'error',
      });
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      // ✅ 스택 트레이스는 개발 환경 + 5xx 서버 오류에서만 노출
      //    4xx 클라이언트 오류(404, 401 등)에는 스택 불필요 & 보안 위험
      ...(isDev && err.statusCode >= 500 && { stack: err.stack }),
    });
    return;
  }

  // Log unexpected errors
  void errorLogService.createLog({
    userId,
    userName,
    userRole,
    route: req.originalUrl,
    method: req.method,
    errorCode: 'INTERNAL_SERVER_ERROR',
    errorMessage: err.message || '알 수 없는 오류',
    errorStack: isDev ? err.stack : undefined,
    severity: 'critical',
  });

  logError('Unexpected error', err);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.',
    // ✅ 개발 환경에서만 상세 정보 노출
    ...(isDev && {
      error: err.message,
      stack: err.stack,
    }),
  });
};

// ============================================================================
// 404 에러 핸들러
// ============================================================================
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(404, `경로를 찾을 수 없습니다: ${req.originalUrl}`);
  next(error);
};
