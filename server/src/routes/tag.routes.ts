import { Router, RequestHandler } from 'express';
import asyncHandler from 'express-async-handler';
import { getTags, createTag, updateTag, deleteTag } from '../controllers/tag.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/isAdmin';
import { AuthRequest } from '../types/auth-request';

const router = Router();

router.get(
  '/',
  authenticate as RequestHandler,
  asyncHandler((req, res) => getTags(req as AuthRequest, res))
);
router.post(
  '/',
  authenticate as RequestHandler,
  isAdmin as RequestHandler,
  asyncHandler((req, res) => createTag(req as AuthRequest, res))
);
router.put(
  '/:id',
  authenticate as RequestHandler,
  isAdmin as RequestHandler,
  asyncHandler((req, res) => updateTag(req as AuthRequest, res))
);
router.delete(
  '/:id',
  authenticate as RequestHandler,
  isAdmin as RequestHandler,
  asyncHandler((req, res) => deleteTag(req as AuthRequest, res))
);

export default router;
