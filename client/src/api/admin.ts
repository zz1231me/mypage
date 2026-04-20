// client/src/api/admin.ts — 관리자 전용 API
import api from './axios';
import { unwrap } from './utils';
import { User } from '../types/admin.types';

// ─── 사용자 승인/거부/비활성화/복구 ───────────────────────────────────────

export const approveUser = (userId: string): Promise<void> =>
  api.patch(`/admin/users/${userId}/approve`).then(() => undefined);

export const rejectUser = (userId: string): Promise<void> =>
  api.delete(`/admin/users/${userId}/reject`).then(() => undefined);

export const deactivateUser = (userId: string): Promise<void> =>
  api.patch(`/admin/users/${userId}/deactivate`).then(() => undefined);

export const restoreUser = (userId: string): Promise<void> =>
  api.post(`/admin/users/${userId}/restore`).then(() => undefined);

export const fetchDeletedUsers = (): Promise<User[]> =>
  api.get('/admin/users/deleted').then(unwrap);

// ─── 보안 로그 ───────────────────────────────────────────────────────────────

export const fetchSecurityLogs = (params?: Record<string, string | number>) =>
  api.get('/admin/security-logs', { params }).then(unwrap);

/** 보안 로그 삭제
 * - ids 지정 시 해당 로그만 삭제
 * - before 지정 시 해당 날짜 이전 삭제 (ISO string)
 * - 둘 다 없으면 전체 삭제
 */
export const deleteSecurityLogs = (
  options: { before?: string; ids?: string[] } = {}
): Promise<{ deleted: number }> =>
  api.delete('/admin/security-logs', { data: options }).then(unwrap);

// ─── 에러 로그 ───────────────────────────────────────────────────────────────

export const fetchErrorLogs = (params?: Record<string, string | number>) =>
  api.get('/admin/error-logs', { params }).then(unwrap);

/** 에러 로그 삭제
 * - ids 지정 시 해당 로그만 삭제
 * - before + severity 조합 가능
 * - 둘 다 없으면 전체 삭제
 */
export const deleteErrorLogs = (
  options: { before?: string; severity?: string; ids?: string[] } = {}
): Promise<{ deleted: number }> => api.delete('/admin/error-logs', { data: options }).then(unwrap);

// ─── 로그인 이력 ───────────────────────────────────────────────────────────────

export const fetchLoginHistory = (params?: Record<string, string | number>) =>
  api.get('/admin/login-history', { params }).then(unwrap);

export const fetchUserLoginHistory = (userId: string, params?: Record<string, string | number>) =>
  api.get(`/admin/users/${userId}/login-history`, { params }).then(unwrap);

// ─── 감사 로그 ───────────────────────────────────────────────────────────────

export const fetchAuditLogs = (params?: Record<string, string | number>) =>
  api.get('/admin/audit-logs', { params }).then(unwrap);

export const fetchUserAuditLogs = (userId: string, params?: Record<string, string | number>) =>
  api.get(`/admin/users/${userId}/audit-logs`, { params }).then(unwrap);

// ─── 세션 관리 ───────────────────────────────────────────────────────────────

export const fetchUserSessions = (userId: string) =>
  api.get(`/admin/users/${userId}/sessions`).then(unwrap);

export const forceLogoutSession = (userId: string, sessionId: string): Promise<void> =>
  api.delete(`/admin/users/${userId}/sessions/${sessionId}`).then(() => undefined);

// ─── 위키 권한 관리 ───────────────────────────────────────────────────────────

export const fetchWikiPermissions = (): Promise<{ roles: string[] }> =>
  api.get('/admin/wiki/permissions').then(unwrap);

export const updateWikiPermissions = (roles: string[]): Promise<{ roles: string[] }> =>
  api.put('/admin/wiki/permissions', { roles }).then(unwrap);
