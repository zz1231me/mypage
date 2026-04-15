// server/src/controllers/board.controller.ts - Service Layer 적용 버전
import { Response } from 'express';
import { UniqueConstraintError } from 'sequelize';
import { AuthRequest, PersonalFolderResult } from '../types/auth-request';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendForbidden,
  sendValidationError,
} from '../utils/response';
import { logInfo, logError, logSuccess, logWarning } from '../utils/logger';
import { boardService } from '../services/board.service';
import { sequelize } from '../config/sequelize';
import { Board } from '../models/Board';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { RESERVED_BOARD_IDS } from '../config/constants';
import { AppError } from '../middlewares/error.middleware';
import crypto from 'crypto';

function toAppError(err: unknown): AppError | null {
  return err instanceof AppError ? err : null;
}

// ✅ 게시판 목록 조회
// 관리자: 모든 게시판 (설정용)
// 일반 사용자: 읽기 권한이 있는 게시판만 (사이드바용)
export const getBoards = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role: userRole } = req.user;
  const mode = req.query.mode as string; // 'admin' | 'sidebar'

  try {
    if (userRole === 'admin' && mode === 'admin') {
      const allBoards = await boardService.getAllBoards();
      sendSuccess(res, allBoards);
    } else {
      const accessibleBoards = await boardService.getAccessibleBoards(userRole);
      sendSuccess(res, accessibleBoards);
    }
  } catch (err) {
    logError('게시판 목록 조회 실패', err, { userRole });
    sendError(res, 500, '게시판 목록을 불러오는데 실패했습니다.');
  }
};

// ✅ 특정 게시판 정보 조회
export const getBoardById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const board = await boardService.getBoardById(id);
    if (!board) {
      return sendNotFound(res, '게시판');
    }

    sendSuccess(res, board);
  } catch (err) {
    logError('게시판 상세 조회 실패', err, { boardId: id });
    sendError(res, 500, '게시판 정보를 불러오는데 실패했습니다.');
  }
};

// ✅ 게시판 생성 (관리자 전용)
export const createBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id, name, description, order } = req.body;
  const { id: userId, role: userRole } = req.user;

  if (userRole !== 'admin') {
    return sendForbidden(res, '관리자만 게시판을 생성할 수 있습니다.');
  }

  if (!id || !name) {
    return sendValidationError(res, 'id', '게시판 ID와 이름은 필수입니다.');
  }

  if (!/^[a-zA-Z0-9_-]{2,50}$/.test(id)) {
    return sendValidationError(
      res,
      'id',
      '게시판 ID는 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능하며 2~50자여야 합니다.'
    );
  }

  // ✅ 예약된 시스템 ID 차단 (라우팅 충돌 방지)
  if (RESERVED_BOARD_IDS.includes(id.toLowerCase())) {
    return sendValidationError(res, 'id', `'${id}'는 시스템에서 사용 중인 예약된 ID입니다.`);
  }

  try {
    const newBoard = await boardService.createBoard({ id, name, description, order });

    logSuccess('게시판 생성 완료', { userId, boardId: id });
    sendSuccess(res, newBoard, '게시판이 생성되었습니다.', 201);
  } catch (err: unknown) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 409) {
      return sendValidationError(res, 'id', appErr.message);
    }
    logError('게시판 생성 실패', err, { userId, boardId: id });
    sendError(res, 500, '게시판 생성 실패');
  }
};

// ✅ 게시판 수정 (관리자 전용)
export const updateBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description, order, isActive } = req.body;
  const { id: userId, role: userRole } = req.user;

  if (userRole !== 'admin') {
    return sendForbidden(res, '관리자만 게시판을 수정할 수 있습니다.');
  }

  try {
    const updatedBoard = await boardService.updateBoard(id, { name, description, order, isActive });

    logSuccess('게시판 수정 완료', { userId, boardId: id });
    sendSuccess(res, updatedBoard, '게시판이 수정되었습니다.');
  } catch (err) {
    logError('게시판 수정 실패', err, { userId, boardId: id });
    sendError(res, 500, '게시판 수정 실패');
  }
};

// ✅ 게시판 삭제 (관리자 전용)
export const deleteBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { id: userId, role: userRole } = req.user;

  if (userRole !== 'admin') {
    return sendForbidden(res, '관리자만 게시판을 삭제할 수 있습니다.');
  }

  try {
    await boardService.deleteBoard(id);

    logSuccess('게시판 삭제 완료', { userId, boardId: id });
    sendSuccess(res, null, '게시판이 삭제되었습니다.');
  } catch (err: unknown) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 400) {
      return sendValidationError(res, 'id', appErr.message);
    }
    logError('게시판 삭제 실패', err, { userId, boardId: id });
    sendError(res, 500, '게시판 삭제 실패');
  }
};

// ✅ 게시판 권한 확인 (User Role 기반) - Helper Function
export const checkUserBoardPermission = async (
  userId: string,
  userRole: string,
  boardId: string,
  action: 'canRead' | 'canWrite' | 'canDelete'
) => {
  return await boardService.checkPermission(userId, userRole, boardId, action);
};

// ✅ 개인 폴더 안전한 생성/조회 (Helper Function preserved for local usage if needed)
const findOrCreatePersonalFolder = async (
  userId: string,
  userName: string
): Promise<PersonalFolderResult> => {
  try {
    const [board, created] = await sequelize.transaction(async t => {
      return Board.findOrCreate({
        where: {
          isPersonal: true,
          ownerId: userId,
          isActive: true,
        },
        defaults: {
          id: `personal_${crypto.randomUUID().split('-').join('')}`,
          name: `${userName}님의 개인공간`,
          description: '본인만 접근 가능한 개인 공간입니다.',
          isPersonal: true,
          ownerId: userId,
          isActive: true,
          order: 999,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
    });

    return { board, created };
  } catch (error) {
    // 동시 요청으로 인한 UniqueConstraintError 처리 — 이미 생성된 폴더 반환
    if (error instanceof UniqueConstraintError) {
      const existing = await Board.findOne({
        where: { isPersonal: true, ownerId: userId, isActive: true },
      });
      if (existing) return { board: existing, created: false };
    }
    logError('개인 폴더 생성/조회 실패', error, { userId, userName });
    throw error;
  }
};

// ✅ 사용자가 접근 가능한 게시판 목록 조회 (일반 게시판 + 개인 폴더)
export const getUserAccessibleBoards = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role: userRole, id: userId, name: userName } = req.user;

  try {
    const result = await boardService.getUserAccessibleBoards(userId, userRole, userName);
    sendSuccess(res, result);
  } catch (err) {
    logError('getUserAccessibleBoards 실패', err, { userId, userName, userRole });
    sendError(res, 500, '접근 가능한 게시판 조회 실패');
  }
};

// ✅ 사용자의 특정 게시판 접근 권한 확인 (디버깅 로그 강화)
export const checkUserBoardAccess = async (req: AuthRequest, res: Response): Promise<void> => {
  const { boardType } = req.params;
  const { role: userRole, id: userId, name: userName } = req.user;

  try {
    const permissionCheck = await boardService.checkPermission(
      userId,
      userRole,
      boardType,
      'canRead'
    );

    if (!permissionCheck.hasAccess) {
      logWarning('게시판 접근 거부', {
        userId,
        userName,
        boardType,
        reason: permissionCheck.reason,
      });
      return sendForbidden(res, permissionCheck.reason || '접근 권한이 없습니다.');
    }

    const board = permissionCheck.board;
    if (!board) {
      return sendError(res, 500, '게시판 정보를 가져올 수 없습니다.');
    }

    // checkPermission이 이미 BoardAccess를 조회하고 permissions를 반환하므로 재사용
    const permissions = permissionCheck.permissions ?? {
      canRead: false,
      canWrite: false,
      canDelete: false,
    };

    const responseData = {
      hasAccess: true,
      board: {
        id: board.id,
        name: board.name,
        description: board.description,
        isPersonal: board.isPersonal,
        ownerId: board.isPersonal ? board.ownerId : undefined,
      },
      permissions,
    };

    sendSuccess(res, responseData);
  } catch (err) {
    logError('checkUserBoardAccess 실패', err, { userId, userName, userRole, boardType });
    sendError(res, 500, '권한 확인 실패');
  }
};

// ✅ 개인 폴더 수동 생성 API
export const createPersonalFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: userId, name: userName } = req.user;

  try {
    const existingBoard = await Board.findOne({
      where: {
        isPersonal: true,
        ownerId: userId,
        isActive: true,
      },
    });

    if (existingBoard) {
      return sendError(res, 400, '이미 개인 폴더가 존재합니다.');
    }

    const result = await findOrCreatePersonalFolder(userId, userName);

    logSuccess('개인 폴더 수동 생성 완료', { userId, userName, boardId: result.board.id });

    sendSuccess(
      res,
      {
        personalBoard: {
          id: result.board.id,
          name: result.board.name,
          description: result.board.description,
          ownerId: userId,
        },
      },
      '개인 폴더가 생성되었습니다.'
    );
  } catch (err) {
    logError('createPersonalFolder 실패', err, { userId, userName });
    sendError(res, 500, '개인 폴더 생성 실패');
  }
};

// ✅ 모든 사용자 개인 폴더 일괄 생성 (관리자 전용)
export const createAllUserPersonalFolders = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const allUsers = await User.findAll({
      where: {
        isActive: true,
        isDeleted: false,
      },
      attributes: ['id', 'name'],
    });

    const results = {
      total: allUsers.length,
      created: 0,
      exists: 0,
      errors: 0,
    };

    const batchSize = 10;
    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async user => {
          try {
            const result = await findOrCreatePersonalFolder(user.id, user.name);
            if (result.created) {
              results.created++;
            } else {
              results.exists++;
            }
          } catch (error) {
            results.errors++;
            logError('개인 폴더 생성 실패', error, { userId: user.id });
          }
        })
      );
    }

    sendSuccess(res, { results }, '모든 사용자 개인 폴더 일괄 생성 완료');
  } catch (err) {
    logError('createAllUserPersonalFolders 실패', err);
    sendError(res, 500, '일괄 생성 실패');
  }
};

// ✅ 더미 데이터 설정 API (개발 환경 전용)
export const setupDummyData = async (_req: AuthRequest, res: Response): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    sendError(res, 403, '개발 환경에서만 사용할 수 있습니다.');
    return;
  }
  try {
    logInfo('더미 데이터 설정 시작');

    // 역할 생성
    await Role.findOrCreate({
      where: { id: 'admin' },
      defaults: { id: 'admin', name: '관리자', description: 'desc', isActive: true },
    });
    await Role.findOrCreate({
      where: { id: 'user' },
      defaults: { id: 'user', name: '일반사용자', description: 'desc', isActive: true },
    });

    // 일반 게시판 생성
    const boardsData = [
      { id: 'notice', name: '공지사항' },
      { id: 'general', name: '자유게시판' },
      { id: 'qna', name: '질문과 답변' },
    ];

    await Promise.all(
      boardsData.map(data =>
        Board.findOrCreate({
          where: { id: data.id },
          defaults: { ...data, description: 'desc', isPersonal: false, isActive: true, order: 0 },
        })
      )
    );

    sendSuccess(res, { message: 'Dummy data created' });
  } catch (err) {
    logError('setupDummyData 실패', err);
    sendError(res, 500, '더미 데이터 설정 실패');
  }
};
