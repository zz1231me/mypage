// server/src/middlewares/validate.middleware.ts
// zod 스키마 기반 요청 바디/쿼리/파라미터 검증 미들웨어

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

/**
 * 요청 바디를 zod 스키마로 검증하는 미들웨어 팩토리
 *
 * @example
 * router.post('/login', validateBody(loginSchema), login);
 */
export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = formatZodError(result.error);
      sendError(res, 400, message);
      return;
    }
    req.body = result.data;
    next();
  };

/**
 * 쿼리 파라미터를 zod 스키마로 검증하는 미들웨어 팩토리
 */
export const validateQuery =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = formatZodError(result.error);
      sendError(res, 400, message);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).validatedQuery = result.data;
    next();
  };

/**
 * ZodError를 사람이 읽기 쉬운 메시지로 변환
 */
function formatZodError(error: ZodError): string {
  const issues = error.issues.map(issue => {
    const field = issue.path.join('.');
    return field ? `${field}: ${issue.message}` : issue.message;
  });
  return issues.join(', ');
}
