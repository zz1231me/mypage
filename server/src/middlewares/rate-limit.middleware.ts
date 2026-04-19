// server/src/middlewares/rate-limit.middleware.ts
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { logWarning } from '../utils/logger';
import { env } from '../config/env';
import { RATE_LIMIT } from '../config/constants';
import { getRateLimitSettings } from '../utils/settingsCache';

// 일반 API 요청 제한
export const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: () => getRateLimitSettings().apiMax,
  message: {
    success: false,
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  },
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  keyGenerator: req => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.id;
    return userId ? `user:${userId}` : ipKeyGenerator(req.ip ?? '');
  },
  handler: (req, res) => {
    logWarning('Rate limit 초과', { ip: req.ip });
    res.status(429).json({
      success: false,
      message: '요청 한도를 초과했습니다. 15분 후 다시 시도해주세요.',
    });
  },
});

// 로그인 API 특별 제한
export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: () =>
    env.NODE_ENV === 'development' ? RATE_LIMIT.AUTH_MAX_DEV : getRateLimitSettings().authMax,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: '로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.',
  },
  handler: (req, res) => {
    logWarning('로그인 Rate limit 초과', { ip: req.ip });
    res.status(429).json({
      success: false,
      message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.',
    });
  },
});

// 관리자 API 제한
export const adminLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.ADMIN_MAX,
  message: {
    success: false,
    message: '관리자 API 요청 한도를 초과했습니다.',
  },
});

// 파일 업로드 제한
export const uploadLimiter = rateLimit({
  windowMs: RATE_LIMIT.UPLOAD_WINDOW_MS,
  max: () => getRateLimitSettings().uploadMax,
  message: {
    success: false,
    message: '파일 업로드 한도를 초과했습니다. 1시간 후 다시 시도해주세요.',
  },
});

// 비밀글 비밀번호 인증 제한 (IP + userId 기준)
// skipSuccessfulRequests 미사용: 정답을 섞어 카운터를 리셋하는 brute-force 우회를 방지
export const secretPostLimiter = rateLimit({
  windowMs: RATE_LIMIT.SECRET_POST_WINDOW_MS,
  max: RATE_LIMIT.SECRET_POST_MAX,
  keyGenerator: req => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.id;
    const postId = req.params?.id || 'unknown';
    return userId
      ? `secret-verify:user:${userId}:post:${postId}`
      : `secret-verify:ip:${ipKeyGenerator(req.ip ?? '')}:post:${postId}`;
  },
  handler: (req, res) => {
    logWarning('비밀글 비밀번호 brute-force 시도', { ip: req.ip, postId: req.params?.id });
    res.status(429).json({
      success: false,
      message: '비밀번호 시도 횟수를 초과했습니다. 5분 후 다시 시도해주세요.',
    });
  },
});

// 파일 다운로드 제한
export const downloadLimiter = rateLimit({
  windowMs: RATE_LIMIT.DOWNLOAD_WINDOW_MS,
  max: () => getRateLimitSettings().downloadMax,
  keyGenerator: req => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.id;
    return userId ? `download:user:${userId}` : `download:ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
  message: {
    success: false,
    message: '파일 다운로드 한도를 초과했습니다. 1시간 후 다시 시도해주세요.',
  },
  handler: (req, res) => {
    logWarning('다운로드 Rate limit 초과', { ip: req.ip });
    res.status(429).json({
      success: false,
      message: '파일 다운로드 한도를 초과했습니다. 1시간 후 다시 시도해주세요.',
    });
  },
});
