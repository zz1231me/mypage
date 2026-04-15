// server/src/routes/twoFactor.routes.ts - 2FA 라우트
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticate } from '../middlewares/auth.middleware';
import {
  generate2FASecret,
  enable2FA,
  disable2FA,
  verify2FALogin,
  get2FAStatus,
} from '../controllers/twoFactor.controller';
import { sendError } from '../utils/response';

const router = Router();

// 2FA 로그인 검증 전용 Rate Limiter (브루트포스 방지)
const twoFaVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5분
  max: 5,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    sendError(res, 429, '2FA 인증 시도 횟수를 초과했습니다. 5분 후 다시 시도해주세요.');
  },
});

// 2FA 상태 조회
router.get('/status', authenticate, get2FAStatus as any);

// 2FA 비밀키 생성 (QR 코드 포함)
router.post('/generate', authenticate, generate2FASecret as any);

// 2FA 활성화
router.post('/enable', authenticate, enable2FA as any);

// 2FA 비활성화
router.post('/disable', authenticate, disable2FA as any);

// 2FA 로그인 검증 (토큰 발행) - 인증 불필요, Rate Limit 적용
router.post('/verify-login', twoFaVerifyLimiter, verify2FALogin as any);

export default router;
