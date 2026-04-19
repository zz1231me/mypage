// src/controllers/admin.controller.ts - Service Layer 완전 적용
import { Response } from 'express';

import XLSX from 'xlsx-js-style';
import { userService } from '../services/user.service';
import { boardService } from '../services/board.service';
import { roleService } from '../services/role.service';
import { eventService } from '../services/event.service';
import { Role } from '../models/Role';
import { User } from '../models/User';
import { SecurityLog } from '../models/SecurityLog';
import { sendSuccess, sendError } from '../utils/response';
import { logError } from '../utils/logger';
import { AuthValidator } from '../validators/auth.validator';
import { FlatRequest as Request, type AuthRequest } from '../types/auth-request';
import { auditLogService } from '../services/auditLog.service';
import type { AuditAction } from '../models/AuditLog';
import { AppError } from '../middlewares/error.middleware';

function toAppError(err: unknown): AppError | null {
  return err instanceof AppError ? err : null;
}

/** 감사 로그용 관리자 컨텍스트 추출 */
const getAdminCtx = (req: Request) => {
  const authReq = req as unknown as AuthRequest;
  return {
    adminId: authReq.user?.id ?? 'unknown',
    adminName: authReq.user?.name ?? 'unknown',
    ipAddress: req.ip ?? null,
  };
};

/** 감사 로그 fire-and-forget 헬퍼 */
const logAudit = (
  req: Request,
  action: AuditAction,
  opts: {
    targetType: 'user' | 'board' | 'role' | 'event' | 'setting';
    targetId?: string | null;
    targetName?: string | null;
    beforeValue?: unknown;
    afterValue?: unknown;
  }
) => {
  const { adminId, adminName, ipAddress } = getAdminCtx(req);
  auditLogService
    .createAuditLog({ adminId, adminName, action, ipAddress, ...opts })
    .catch(err => logError('감사 로그 기록 실패', err));
};

// ===== 사용자 관리 =====
export const getDeletedUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getDeletedUsers();
    sendSuccess(res, users);
  } catch (error) {
    logError('삭제된 사용자 조회 실패', error);
    sendError(res, 500, '삭제된 사용자 조회 실패');
  }
};

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getAllUsers(true);
    sendSuccess(res, users);
  } catch (error) {
    logError('사용자 조회 실패', error);
    sendError(res, 500, '사용자 조회 실패');
  }
};

export const approveUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await userService.approveUser(userId);
    logAudit(req, 'approve_user', {
      targetType: 'user',
      targetId: userId,
      targetName: user.name,
      afterValue: { isActive: true },
    });
    sendSuccess(
      res,
      { userId: user.id, name: user.name, isActive: user.isActive },
      '회원이 승인되었습니다.'
    );
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('회원 승인 실패', error);
    sendError(
      res,
      appErr?.statusCode ?? 500,
      appErr?.message ?? '회원 승인 중 오류가 발생했습니다.'
    );
  }
};

export const rejectUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    await userService.rejectUser(userId);
    logAudit(req, 'reject_user', { targetType: 'user', targetId: userId });
    sendSuccess(res, null, '회원 가입 신청이 거부되었습니다.');
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('회원 가입 거부 실패', error);
    sendError(
      res,
      appErr?.statusCode ?? 500,
      appErr?.message ?? '회원 가입 거부 중 오류가 발생했습니다.'
    );
  }
};

export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    await userService.deactivateUser(userId);
    logAudit(req, 'deactivate_user', {
      targetType: 'user',
      targetId: userId,
      afterValue: { isActive: false },
    });
    sendSuccess(res, null, '회원이 비활성화되었습니다.');
  } catch (error: unknown) {
    logError('회원 비활성화 실패', error);
    sendError(res, 500, toAppError(error)?.message ?? '회원 비활성화 실패');
  }
};

export const restoreUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    await userService.restoreUser(userId);
    logAudit(req, 'restore_user', { targetType: 'user', targetId: userId });
    sendSuccess(res, null, '회원이 복구되었습니다.');
  } catch (error: unknown) {
    logError('회원 복구 실패', error);
    sendError(res, 500, toAppError(error)?.message ?? '회원 복구 실패');
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { id, password, name, roleId } = req.body;

  const idValidation = AuthValidator.validateAdminUserId(id);
  if (!idValidation.valid) {
    sendError(res, 400, idValidation.error!);
    return;
  }

  const pwValidation = AuthValidator.validatePassword(password, true);
  if (!pwValidation.valid) {
    sendError(res, 400, pwValidation.error!);
    return;
  }

  const nameValidation = AuthValidator.validateName(name);
  if (!nameValidation.valid) {
    sendError(res, 400, nameValidation.error!);
    return;
  }

  try {
    await userService.createUser({ id, password, name, roleId, isActive: true });
    logAudit(req, 'create_user', {
      targetType: 'user',
      targetId: id,
      targetName: name,
      afterValue: { id, name, roleId, isActive: true },
    });
    sendSuccess(res, null, '사용자 생성 완료', 201);
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('사용자 생성 실패', error);
    sendError(res, appErr?.statusCode ?? 500, appErr?.message ?? '사용자 생성 실패');
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { roleId } = updateData;
    const adminId = (req as unknown as AuthRequest).user?.id;

    // 관리자가 자기 자신의 역할을 변경하거나 비활성화하는 것을 방지
    if (adminId && adminId === id) {
      if (roleId !== undefined && roleId !== 'admin') {
        sendError(res, 400, '자기 자신의 역할을 변경할 수 없습니다.');
        return;
      }
      if (updateData.isActive === false) {
        sendError(res, 400, '자기 자신의 계정을 비활성화할 수 없습니다.');
        return;
      }
    }

    if (roleId) {
      const role = await Role.findByPk(roleId);
      if (!role) {
        sendError(res, 400, '존재하지 않는 역할입니다.');
        return;
      }
      if (!role.isActive) {
        sendError(res, 400, '비활성화된 역할에는 사용자를 배정할 수 없습니다.');
        return;
      }
    }

    await userService.updateUser(id, updateData);
    logAudit(req, 'update_user', {
      targetType: 'user',
      targetId: id,
      afterValue: updateData,
    });
    sendSuccess(res, null, '사용자 정보 수정 완료');
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('사용자 수정 실패', error);
    sendError(res, appErr?.statusCode ?? 500, appErr?.message ?? '사용자 수정 실패');
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = (req as unknown as AuthRequest).user?.id;

    if (adminId && adminId === id) {
      sendError(res, 400, '자기 자신의 계정을 삭제할 수 없습니다.');
      return;
    }

    const result = await userService.deleteUser(id);
    logAudit(req, 'delete_user', { targetType: 'user', targetId: id });
    sendSuccess(res, result);
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('사용자 삭제 실패', error);
    sendError(res, appErr?.statusCode ?? 500, appErr?.message ?? '사용자 삭제 실패');
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      sendError(res, 400, '새 비밀번호를 입력해주세요.');
      return;
    }
    const pwValidation = AuthValidator.validatePassword(newPassword.trim(), true);
    if (!pwValidation.valid) {
      sendError(res, 400, pwValidation.error!);
      return;
    }

    await userService.resetPassword(id, newPassword.trim());
    logAudit(req, 'reset_password', {
      targetType: 'user',
      targetId: id,
      afterValue: { changed: true },
    });
    sendSuccess(res, null, '비밀번호 재설정 완료');
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('비밀번호 재설정 실패', error);
    sendError(res, appErr?.statusCode ?? 500, appErr?.message ?? '비밀번호 재설정 실패');
  }
};

// ===== 게시판 관리 =====
export const getAllBoards = async (_req: Request, res: Response): Promise<void> => {
  try {
    const boards = await boardService.getAllBoards();
    sendSuccess(res, boards);
  } catch (error) {
    logError('게시판 조회 실패', error);
    sendError(res, 500, '게시판 조회 실패');
  }
};

export const createBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, description, order } = req.body;

    if (!id || typeof id !== 'string' || !id.trim()) {
      sendError(res, 400, '게시판 ID는 필수입니다.');
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      sendError(res, 400, '게시판 이름은 필수입니다.');
      return;
    }
    if (name.trim().length > 100) {
      sendError(res, 400, '게시판 이름은 100자를 초과할 수 없습니다.');
      return;
    }

    await boardService.createBoard({ id: id.trim(), name: name.trim(), description, order });
    sendSuccess(res, null, '게시판 생성 완료', 201);
  } catch (error: unknown) {
    logError('게시판 생성 실패', error);
    sendError(res, 500, toAppError(error)?.message ?? '게시판 생성 실패');
  }
};

export const updateBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, order, isActive } = req.body;
    await boardService.updateBoard(id, { name, description, order, isActive });
    logAudit(req, 'update_board', {
      targetType: 'board',
      targetId: id,
      afterValue: { name, description, order, isActive },
    });
    sendSuccess(res, null, '게시판 수정 완료');
  } catch (error: unknown) {
    logError('게시판 수정 실패', error);
    sendError(res, 500, toAppError(error)?.message ?? '게시판 수정 실패');
  }
};

export const deleteBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await boardService.deleteBoard(id);
    logAudit(req, 'delete_board', { targetType: 'board', targetId: id });
    sendSuccess(res, null, '게시판 삭제 완료');
  } catch (error: unknown) {
    logError('게시판 삭제 실패', error);
    sendError(res, 500, toAppError(error)?.message ?? '게시판 삭제 실패');
  }
};

// ===== 역할 관리 =====
export const getAllRoles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const roles = await roleService.getAllRoles();
    sendSuccess(res, roles);
  } catch (error) {
    logError('역할 조회 실패', error);
    sendError(res, 500, '역할 조회 실패');
  }
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, description } = req.body;
    await roleService.createRole({ id, name, description });
    sendSuccess(res, null, '역할 생성 완료', 201);
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('역할 생성 실패', error);
    sendError(res, appErr?.statusCode ?? 500, appErr?.message ?? '역할 생성 실패');
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    await roleService.updateRole(id, { name, description, isActive });
    sendSuccess(res, null, '역할 수정 완료');
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('역할 수정 실패', error);
    sendError(res, appErr?.statusCode ?? 500, appErr?.message ?? '역할 수정 실패');
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await roleService.deleteRole(id);
    sendSuccess(res, null, '역할 삭제 완료');
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('역할 삭제 실패', error);
    sendError(res, appErr?.statusCode ?? 500, appErr?.message ?? '역할 삭제 실패');
  }
};

// ===== 게시판 권한 관리 =====
export const getBoardAccessPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    const permissions = await roleService.getBoardAccessPermissions(boardId);
    sendSuccess(res, permissions);
  } catch (error) {
    logError('권한 조회 실패', error);
    sendError(res, 500, '권한 조회 실패');
  }
};

export const setBoardAccessPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardId } = req.params;
    const { permissions } = req.body;
    await roleService.setBoardAccessPermissions(boardId, permissions);
    logAudit(req, 'update_permission', {
      targetType: 'board',
      targetId: boardId,
      afterValue: { permissions },
    });
    sendSuccess(res, null, '권한 설정 완료');
  } catch (error) {
    logError('권한 설정 실패', error);
    sendError(res, 500, '권한 설정 실패');
  }
};

// ===== 이벤트 관리 =====
export const getAllEvents = async (_req: Request, res: Response): Promise<void> => {
  try {
    const events = await eventService.getAllEvents();
    sendSuccess(res, events);
  } catch (error) {
    logError('이벤트 조회 실패', error);
    sendError(res, 500, '이벤트 조회 실패');
  }
};

export const deleteEventAsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await eventService.deleteEvent(id);
    logAudit(req, 'delete_event', { targetType: 'event', targetId: id });
    sendSuccess(res, null, '이벤트 삭제 완료');
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('이벤트 삭제 실패', error);
    sendError(res, appErr?.statusCode ?? 500, appErr?.message ?? '이벤트 삭제 실패');
  }
};

export const updateEventAsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await eventService.updateEvent(id, req.body);
    sendSuccess(res, event, '이벤트 수정 완료');
  } catch (error: unknown) {
    const appErr = toAppError(error);
    logError('이벤트 수정 실패', error);
    sendError(res, appErr?.statusCode ?? 500, appErr?.message ?? '이벤트 수정 실패');
  }
};

// ===== 이벤트 권한 관리 =====
export const getEventPermissionsByRole = async (_req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await eventService.getEventPermissionsByRole();
    sendSuccess(res, permissions);
  } catch (error) {
    logError('이벤트 권한 조회 실패', error);
    sendError(res, 500, '이벤트 권한 조회 실패');
  }
};

export const setEventPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      sendError(res, 400, '권한 배열이 필요합니다.');
      return;
    }
    await eventService.setEventPermissions(permissions);
    sendSuccess(res, null, '이벤트 권한 설정 완료');
  } catch (error) {
    logError('이벤트 권한 설정 실패', error);
    sendError(res, 500, '이벤트 권한 설정 실패');
  }
};

// ===== 엑셀 내보내기 헬퍼 =====

interface SheetColumn {
  label: string;
  key: string;
  width: number;
}

function xlsxHeaderCell(value: string, rgb: string): XLSX.CellObject {
  return {
    v: value,
    t: 's',
    s: {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb } },
    },
  };
}

function buildXlsxSheet(
  columns: SheetColumn[],
  rows: Record<string, string>[],
  headerRgb: string
): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};

  columns.forEach(({ label }, ci) => {
    ws[XLSX.utils.encode_cell({ r: 0, c: ci })] = xlsxHeaderCell(label, headerRgb);
  });

  rows.forEach((row, ri) => {
    columns.forEach(({ key }, ci) => {
      ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })] = { v: row[key] ?? '-', t: 's' };
    });
  });

  ws['!cols'] = columns.map(({ width }) => ({ wch: width }));
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: columns.length - 1 },
  });

  return ws;
}

function sendXlsx(res: Response, ws: XLSX.WorkSheet, sheetName: string, filename: string): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
}

// ===== 엑셀 내보내기 =====
export const exportUsersExcel = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.findAll({
      where: { isDeleted: false },
      attributes: ['id', 'name', 'email', 'roleId', 'isActive', 'lastLoginAt', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    const columns: SheetColumn[] = [
      { label: 'ID', key: 'id', width: 15 },
      { label: '이름', key: 'name', width: 20 },
      { label: '이메일', key: 'email', width: 30 },
      { label: '역할', key: 'roleId', width: 12 },
      { label: '활성', key: 'isActive', width: 8 },
      { label: '마지막 로그인', key: 'lastLoginAt', width: 22 },
      { label: '가입일', key: 'createdAt', width: 22 },
    ];

    const rows = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email ?? '-',
      roleId: user.roleId,
      isActive: user.isActive ? '활성' : '비활성',
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ko-KR') : '-',
      createdAt: new Date(user.createdAt).toLocaleString('ko-KR'),
    }));

    const ws = buildXlsxSheet(columns, rows, '4F46E5');
    sendXlsx(res, ws, '사용자 목록', `users-${Date.now()}.xlsx`);
  } catch (err) {
    logError('사용자 엑셀 내보내기 실패', err);
    sendError(res, 500, '엑셀 내보내기 실패');
  }
};

export const exportSecurityLogsExcel = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await SecurityLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10000,
    });

    const columns: SheetColumn[] = [
      { label: 'ID', key: 'id', width: 36 },
      { label: '사용자 ID', key: 'userId', width: 15 },
      { label: 'IP 주소', key: 'ipAddress', width: 18 },
      { label: '액션', key: 'action', width: 20 },
      { label: '메서드', key: 'method', width: 10 },
      { label: '경로', key: 'route', width: 40 },
      { label: '상태', key: 'status', width: 12 },
      { label: '일시', key: 'createdAt', width: 22 },
    ];

    const rows = logs.map(log => ({
      id: log.id,
      userId: log.userId ?? '-',
      ipAddress: log.ipAddress ?? '-',
      action: log.action,
      method: log.method,
      route: log.route,
      status: log.status,
      createdAt: log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-',
    }));

    const ws = buildXlsxSheet(columns, rows, '1E40AF');
    sendXlsx(res, ws, '보안 로그', `security-logs-${Date.now()}.xlsx`);
  } catch (err) {
    logError('보안 로그 엑셀 내보내기 실패', err);
    sendError(res, 500, '엑셀 내보내기 실패');
  }
};
