// server/src/routes/report.routes.ts - 신고 라우트
import { Router, RequestHandler } from 'express';
import asyncHandler from 'express-async-handler';
import {
  createReport,
  getReports,
  reviewReport,
  getReportStats,
} from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { AuthRequest } from '../types/auth-request';

const router = Router();

// 신고 제출 (인증된 사용자)
router.post(
  '/',
  authenticate as RequestHandler,
  asyncHandler((req, res) => createReport(req as AuthRequest, res))
);

// 신고 통계 (관리자/매니저) — /reports 목록보다 먼저 등록
router.get(
  '/stats',
  authenticate as RequestHandler,
  asyncHandler((req, res) => getReportStats(req as AuthRequest, res))
);

// 신고 목록 (관리자/매니저)
router.get(
  '/',
  authenticate as RequestHandler,
  asyncHandler((req, res) => getReports(req as AuthRequest, res))
);

// 신고 처리 (관리자/매니저)
router.patch(
  '/:id/review',
  authenticate as RequestHandler,
  asyncHandler((req, res) => reviewReport(req as AuthRequest, res))
);

export default router;
