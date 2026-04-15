import express, { RequestHandler } from 'express';
import { createEvent, getEvents, updateEvent, deleteEvent } from '../controllers/event.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { checkEventPermission } from '../middlewares/eventPermission.middleware';

const router = express.Router();

// ✅ EventPermission 기반 권한 체크 사용
router.post(
  '/',
  authenticate as RequestHandler,
  checkEventPermission('create') as RequestHandler,
  createEvent as RequestHandler
);

router.get(
  '/',
  authenticate as RequestHandler,
  checkEventPermission('read') as RequestHandler,
  getEvents as RequestHandler
);

router.put(
  '/:id',
  authenticate as RequestHandler,
  checkEventPermission('update') as RequestHandler,
  updateEvent as RequestHandler
);

router.delete(
  '/:id',
  authenticate as RequestHandler,
  checkEventPermission('delete') as RequestHandler,
  deleteEvent as RequestHandler
);

export default router;
