import { Router, RequestHandler } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  approveUser,
  rejectUser,
  deactivateUser,
  restoreUser,
  getDeletedUsers,
  getAllBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  getBoardAccessPermissions,
  setBoardAccessPermissions,
  getAllEvents,
  deleteEventAsAdmin,
  updateEventAsAdmin,
  getEventPermissionsByRole,
  setEventPermissions,
  exportUsersExcel,
  exportSecurityLogsExcel,
} from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/isAdmin';
import { ipWhitelistMiddleware } from '../middlewares/ipWhitelistMiddleware';
import { getSecurityLogs, deleteSecurityLogs } from '../controllers/securityLog.controller';
import { getErrorLogs, deleteErrorLogs } from '../controllers/errorLog.controller';
import { getLoginHistory, getGlobalLoginHistory } from '../controllers/loginHistory.controller';
import { getAuditLogs, getUserAuditLogs } from '../controllers/auditLog.controller';
import { getUserSessions, forceLogoutSession } from '../controllers/userSession.controller';
import rateLimitAdminRoutes from './rateLimitAdmin.routes';
import tagRoutes from './tag.routes';
import {
  getIpRules,
  getStats as getIpStats,
  addIpRule,
  patchIpRule,
  removeIpRule,
} from '../controllers/ipRule.controller';

const router = Router();

// 인증, 관리자 권한, IP 제한 체크
router.use(
  authenticate as RequestHandler,
  isAdmin as RequestHandler,
  ipWhitelistMiddleware as RequestHandler
);

// ===== 사용자 관리 API =====
// ⚠️ 정적 라우트를 :id 파라미터 라우트보다 먼저 정의해야 함 (라우팅 우선순위)
router.get('/users', getAllUsers as RequestHandler);
router.get('/users/deleted', getDeletedUsers as RequestHandler);
router.post('/users', createUser as RequestHandler);
router.put('/users/:id', updateUser as RequestHandler);
router.delete('/users/:id', deleteUser as RequestHandler);
router.post('/users/:id/reset-password', resetPassword as RequestHandler);
router.patch('/users/:userId/approve', approveUser as RequestHandler);
router.delete('/users/:userId/reject', rejectUser as RequestHandler);
router.patch('/users/:userId/deactivate', deactivateUser as RequestHandler);
router.post('/users/:userId/restore', restoreUser as RequestHandler);

// ===== 게시판 관리 API =====
router.get('/boards', getAllBoards as RequestHandler);
router.post('/boards', createBoard as RequestHandler);
router.put('/boards/:id', updateBoard as RequestHandler);
router.delete('/boards/:id', deleteBoard as RequestHandler);
router.get('/boards/:boardId/permissions', getBoardAccessPermissions as RequestHandler);
router.put('/boards/:boardId/permissions', setBoardAccessPermissions as RequestHandler);

// ===== 권한 관리 API =====
router.get('/roles', getAllRoles as RequestHandler);
router.post('/roles', createRole as RequestHandler);
router.put('/roles/:id', updateRole as RequestHandler);
router.delete('/roles/:id', deleteRole as RequestHandler);

// ===== 이벤트 관리 API =====
// ⚠️ permissions 라우트를 :id 라우트보다 먼저 정의해야 함
router.get('/events/permissions', getEventPermissionsByRole as RequestHandler);
router.put('/events/permissions', setEventPermissions as RequestHandler);
router.get('/events', getAllEvents as RequestHandler);
router.put('/events/:id', updateEventAsAdmin as RequestHandler);
router.delete('/events/:id', deleteEventAsAdmin as RequestHandler);

// ===== 엑셀 내보내기 API =====
router.get('/export/users', exportUsersExcel as RequestHandler);
router.get('/export/security-logs', exportSecurityLogsExcel as RequestHandler);

// ===== 로그 조회/삭제 API =====
router.get('/security-logs', getSecurityLogs as RequestHandler);
router.delete('/security-logs', deleteSecurityLogs as RequestHandler);
router.get('/error-logs', getErrorLogs as RequestHandler);
router.delete('/error-logs', deleteErrorLogs as RequestHandler);

// ===== 로그인 이력 API =====
// ⚠️ 정적 라우트를 :userId 파라미터 라우트보다 먼저 정의
router.get('/login-history', getGlobalLoginHistory as RequestHandler);
router.get('/users/:userId/login-history', getLoginHistory as RequestHandler);

// ===== 감사 로그 API =====
router.get('/audit-logs', getAuditLogs as RequestHandler);
router.get('/users/:userId/audit-logs', getUserAuditLogs as RequestHandler);

// ===== 세션 관리 API =====
router.get('/users/:userId/sessions', getUserSessions as RequestHandler);
router.delete('/users/:userId/sessions/:sessionId', forceLogoutSession as RequestHandler);

// ===== Rate Limiting 관리 =====
router.use('/rate-limits', rateLimitAdminRoutes);

// ===== 태그 관리 =====
router.use('/tags', tagRoutes);

// ===== IP 규칙 관리 =====
router.get('/ip-rules/stats', getIpStats as RequestHandler);
router.get('/ip-rules', getIpRules as RequestHandler);
router.post('/ip-rules', addIpRule as RequestHandler);
router.patch('/ip-rules/:id', patchIpRule as RequestHandler);
router.delete('/ip-rules/:id', removeIpRule as RequestHandler);

export default router;
