import { Router, RequestHandler } from 'express';
import asyncHandler from 'express-async-handler';
import {
  getPageTree,
  getPageBySlug,
  getPageHistory,
  createPage,
  updatePage,
  deletePage,
} from '../controllers/wiki.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdminOrManager } from '../middlewares/isAdmin';
import { AuthRequest } from '../types/auth-request';

const router = Router();
router.use(authenticate as RequestHandler);

router.get(
  '/',
  asyncHandler((req, res) => getPageTree(req as AuthRequest, res))
);
router.get(
  '/:slug',
  asyncHandler((req, res) => getPageBySlug(req as AuthRequest, res))
);
router.get(
  '/:slug/history',
  isAdminOrManager as RequestHandler,
  asyncHandler((req, res) => getPageHistory(req as AuthRequest, res))
);
router.post(
  '/',
  isAdminOrManager as RequestHandler,
  asyncHandler((req, res) => createPage(req as AuthRequest, res))
);
router.put(
  '/:slug',
  isAdminOrManager as RequestHandler,
  asyncHandler((req, res) => updatePage(req as AuthRequest, res))
);
router.delete(
  '/:slug',
  isAdminOrManager as RequestHandler,
  asyncHandler((req, res) => deletePage(req as AuthRequest, res))
);

export default router;
