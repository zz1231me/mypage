import { Board } from '../models/Board';
import { BoardAccess } from '../models/BoardAccess';
import { BaseService } from './base.service';
import { AppError } from '../middlewares/error.middleware';
import { sequelize } from '../config/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { AccessibleBoard, PersonalFolderResult } from '../types/auth-request';
import crypto from 'crypto';
import { logInfo, logError, logSuccess } from '../utils/logger';
import { RESERVED_BOARD_IDS } from '../config/constants';

export interface PermissionCheckResult {
  hasAccess: boolean;
  reason?: string;
  board?: Board;
  permissions?: { canRead: boolean; canWrite: boolean; canDelete: boolean };
}

export class BoardService extends BaseService {
  // ✅ 모든 게시판 목록 조회 (관리자용 포함)
  async getAllBoards() {
    return await Board.findAll({
      order: [['order', 'ASC']],
      where: {
        isPersonal: false, // 개인 폴더 제외
      },
      limit: 100,
    });
  }

  // ✅ 사용자가 접근 가능한 게시판 목록 조회
  async getAccessibleBoards(userRole: string): Promise<Board[]> {
    // 1. 역할에 부여된 게시판 접근 권한 조회
    const accesses = await BoardAccess.findAll({
      where: {
        roleId: userRole,
        canRead: true,
      },
      include: [
        {
          model: Board,
          as: 'board',
          where: {
            isActive: true,
            isPersonal: false,
          },
          required: true,
        },
      ],
      order: [[{ model: Board, as: 'board' }, 'order', 'ASC']],
    });

    return accesses.map(access => access.board).filter((board): board is Board => !!board);
  }

  // ✅ 특정 게시판 정보 조회
  async getBoardById(boardId: string) {
    return await Board.findByPk(boardId);
  }

  // ✅ 게시판 생성 (관리자용)
  async createBoard(data: { id: string; name: string; description?: string; order?: number }) {
    // 예약된 시스템 경로와 충돌 방지
    if (RESERVED_BOARD_IDS.includes(data.id.toLowerCase())) {
      throw new AppError(400, `'${data.id}'는 시스템에서 예약된 ID입니다. 다른 ID를 사용해주세요.`);
    }

    // ID 중복 체크
    const existing = await Board.findByPk(data.id);
    if (existing) {
      throw new AppError(409, '이미 존재하는 게시판 ID입니다.');
    }

    const board = await sequelize.transaction(async t => {
      const newBoard = await Board.create(
        {
          id: data.id,
          name: data.name,
          description: data.description,
          order: data.order || 0,
          isActive: true,
          isPersonal: false,
        },
        { transaction: t }
      );

      // 기본적으로 관리자에게 모든 권한 부여
      await BoardAccess.create(
        {
          boardId: newBoard.id,
          roleId: 'admin',
          canRead: true,
          canWrite: true,
          canDelete: true,
        },
        { transaction: t }
      );

      return newBoard;
    });

    return board;
  }

  // ✅ 게시판 수정
  async updateBoard(
    boardId: string,
    updates: { name?: string; description?: string; order?: number; isActive?: boolean }
  ) {
    const board = await Board.findByPk(boardId);
    if (!board) {
      throw new AppError(404, '게시판을 찾을 수 없습니다.');
    }

    await board.update(updates);
    return board;
  }

  // ✅ 게시판 삭제
  async deleteBoard(boardId: string) {
    const board = await Board.findByPk(boardId);
    if (!board) {
      throw new AppError(404, '게시판을 찾을 수 없습니다.');
    }

    if (board.isPersonal) {
      throw new AppError(403, '개인 폴더는 일반 삭제로 제거할 수 없습니다.');
    }

    await board.destroy();
  }

  // ✅ 개인 폴더 안전한 생성/조회
  private async findOrCreatePersonalFolder(
    userId: string,
    userName: string
  ): Promise<PersonalFolderResult> {
    try {
      const [board, created] = await sequelize.transaction(async t => {
        return Board.findOrCreate({
          where: { isPersonal: true, ownerId: userId, isActive: true },
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
      if (error instanceof UniqueConstraintError) {
        const existing = await Board.findOne({
          where: { isPersonal: true, ownerId: userId, isActive: true },
        });
        if (existing) return { board: existing, created: false };
      }
      logError('개인 폴더 생성/조회 실패', error, { userId, userName });
      throw error;
    }
  }

  // ✅ 사용자가 접근 가능한 모든 게시판 조회 (일반 게시판 + 개인 폴더)
  async getUserAccessibleBoards(
    userId: string,
    userRole: string,
    userName: string
  ): Promise<AccessibleBoard[]> {
    logInfo('사용자 접근 가능한 게시판 조회', { userId, userName, userRole });

    // 1. 일반 게시판 조회 (역할 기반 권한)
    const generalBoards = await BoardAccess.findAll({
      where: { roleId: userRole, canRead: true },
      include: [
        {
          model: Board,
          as: 'board',
          where: { isActive: true, isPersonal: false },
          required: true,
        },
      ],
    });

    // 2. 개인 폴더 처리
    let personalFolderResult: PersonalFolderResult | null = null;
    try {
      personalFolderResult = await this.findOrCreatePersonalFolder(userId, userName);
      if (personalFolderResult.created) {
        logSuccess('개인 폴더 자동 생성됨', {
          userId,
          userName,
          boardId: personalFolderResult.board.id,
        });
      }
    } catch (error) {
      logError('개인 폴더 생성/조회 실패', error, { userId, userName });
      // 개인 폴더 실패해도 일반 게시판은 반환
    }

    const result: AccessibleBoard[] = [
      ...generalBoards
        .filter(access => access.board)
        .map(access => ({
          id: access.board!.id,
          name: access.board!.name,
          description: access.board!.description,
          order: access.board!.order,
          isPersonal: false,
          permissions: {
            canRead: access.canRead,
            canWrite: access.canWrite,
            canDelete: access.canDelete,
          },
        })),
    ];

    if (personalFolderResult?.board) {
      result.push({
        id: personalFolderResult.board.id,
        name: personalFolderResult.board.name,
        description: personalFolderResult.board.description,
        order: personalFolderResult.board.order,
        isPersonal: true,
        ownerId: userId,
        permissions: { canRead: true, canWrite: true, canDelete: true },
      });
    }

    result.sort((a, b) => {
      if (a.isPersonal && !b.isPersonal) return 1;
      if (!a.isPersonal && b.isPersonal) return -1;
      return a.order - b.order;
    });

    return result;
  }

  // ✅ 사용자별 게시판 권한 확인 (Helper Logic moved here)
  async checkPermission(
    userId: string,
    userRole: string,
    boardId: string,
    action: 'canRead' | 'canWrite' | 'canDelete'
  ): Promise<PermissionCheckResult> {
    const isAdmin = userRole === 'admin';

    // Board + BoardAccess 쿼리 병렬 실행 (관리자는 BoardAccess 조회 불필요)
    const [board, access] = await Promise.all([
      Board.findByPk(boardId),
      isAdmin
        ? Promise.resolve(null)
        : BoardAccess.findOne({ where: { boardId, roleId: userRole } }),
    ]);

    // 0. 존재하지 않는 게시판 체크
    if (!board) {
      return { hasAccess: false, reason: '존재하지 않는 게시판입니다.' };
    }

    const allPermissions = { canRead: true, canWrite: true, canDelete: true };

    // 1. 개인 폴더 체크
    if (board?.isPersonal) {
      // 개인 폴더는 소유자만 모든 권한 가짐
      const hasAccess = board.ownerId === userId;
      return {
        hasAccess,
        reason: hasAccess ? undefined : '개인 공간에는 접근할 수 없습니다.',
        board,
        permissions: hasAccess ? allPermissions : undefined,
      };
    }

    // 2. 비활성 게시판 접근 차단 (관리자 제외)
    if (board && !board.isPersonal && !board.isActive && !isAdmin) {
      return { hasAccess: false, reason: '비활성화된 게시판입니다.', board };
    }

    // 3. 관리자는 프리패스
    if (isAdmin) {
      return { hasAccess: true, board: board || undefined, permissions: allPermissions };
    }

    // 4. 일반 게시판 권한 체크
    if (!access) {
      return {
        hasAccess: false,
        reason: '접근 권한이 설정되지 않았습니다.',
        board: board || undefined,
      };
    }

    if (!access.canRead) {
      // 읽기 권한이 없으면 아예 접근 불가
      return {
        hasAccess: false,
        reason: '게시판 읽기 권한이 없습니다.',
        board: board || undefined,
      };
    }

    // 요청된 액션 확인
    if (!access[action]) {
      return {
        hasAccess: false,
        reason: `게시판 ${action === 'canWrite' ? '쓰기' : '삭제'} 권한이 없습니다.`,
        board: board || undefined,
      };
    }

    return {
      hasAccess: true,
      board: board || undefined,
      permissions: {
        canRead: access.canRead,
        canWrite: access.canWrite,
        canDelete: access.canDelete,
      },
    };
  }
}

export const boardService = new BoardService();
