// ============================================================================
// server/src/middlewares/auth.middleware.ts
// JWT 쿠키 기반 인증 미들웨어
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/auth-request';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { logInfo, logWarning, logError } from '../utils/logger';
import { sendUnauthorized, sendForbidden, sendError } from '../utils/response';
import { env } from '../config/env';
import { JWT_ALGORITHM } from '../config/constants';

// ✅ 인증 미들웨어 캐시 (DB 조회 부하 감소)
// TTL: 30초 — 로그아웃 무효화는 최대 30초 내에 반영됨
const USER_CACHE_TTL_MS = 30_000;
interface CachedUser {
  id: string;
  name: string;
  roleId: string;
  isActive: boolean;
  isDeleted: boolean;
  tokenVersion: number;
  roleInfo: { id: string; name: string; description: string | null; isActive: boolean } | null;
  cachedAt: number;
}
const userCache = new Map<string, CachedUser>();

function getCachedUser(userId: string): CachedUser | null {
  const entry = userCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > USER_CACHE_TTL_MS) {
    userCache.delete(userId);
    return null;
  }
  return entry;
}

export function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { access_token } = req.cookies;

    if (!access_token) {
      logWarning('인증 실패: access_token 쿠키 없음');
      sendUnauthorized(res, '인증 토큰이 없습니다.');
      return;
    }

    const decoded = jwt.verify(access_token, env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    }) as { id: string; tv?: number };

    if (env.NODE_ENV === 'development') {
      logInfo(`디코딩된 사용자 ID: ${decoded.id}`);
    }

    // ✅ 캐시 우선 조회 (DB 부하 감소)
    let cachedUser = getCachedUser(decoded.id);

    if (!cachedUser) {
      const dbUser = await User.findByPk(decoded.id, {
        paranoid: false, // ✅ deletedAt 컬럼 마이그레이션 전에도 쿼리 가능 (isDeleted로 체크)
        include: [
          {
            model: Role,
            as: 'roleInfo',
            attributes: ['id', 'name', 'description', 'isActive'],
          },
        ],
        attributes: ['id', 'name', 'roleId', 'email', 'isActive', 'isDeleted', 'tokenVersion'],
      });

      if (!dbUser) {
        logWarning('인증 실패: 존재하지 않는 사용자');
        sendUnauthorized(res, '존재하지 않는 사용자입니다.');
        return;
      }

      // DB 조회 결과를 캐시에 저장
      cachedUser = {
        id: dbUser.id,
        name: dbUser.name,
        roleId: dbUser.roleId,
        isActive: dbUser.isActive,
        isDeleted: dbUser.isDeleted,
        tokenVersion: dbUser.tokenVersion ?? 0,
        roleInfo: dbUser.roleInfo
          ? {
              id: dbUser.roleInfo.id,
              name: dbUser.roleInfo.name,
              description: dbUser.roleInfo.description,
              isActive: dbUser.roleInfo.isActive,
            }
          : null,
        cachedAt: Date.now(),
      };
      userCache.set(decoded.id, cachedUser);
    }

    if (cachedUser.isDeleted) {
      logWarning(`인증 실패: 삭제된 계정 (userId: ${cachedUser.id})`);
      sendForbidden(res, '삭제된 계정입니다.');
      return;
    }

    // tokenVersion 검증: 로그아웃 후 기존 토큰 무효화
    if (decoded.tv !== undefined && decoded.tv !== cachedUser.tokenVersion) {
      logWarning(`인증 실패: 무효화된 토큰 (userId: ${cachedUser.id})`);
      sendUnauthorized(res, '만료된 토큰입니다. 다시 로그인해주세요.');
      return;
    }

    if (!cachedUser.isActive) {
      logWarning(`인증 실패: 비활성화된 계정 (userId: ${cachedUser.id})`);
      sendForbidden(res, '비활성화된 계정입니다.');
      return;
    }

    if (!cachedUser.roleInfo) {
      logError(`역할 정보 없음 - userId: ${cachedUser.id}, roleId: ${cachedUser.roleId}`);
      sendForbidden(res, '역할 정보가 없습니다. 관리자에게 문의하세요.');
      return;
    }

    if (!cachedUser.roleInfo.isActive) {
      logWarning(`인증 실패: 비활성화된 역할 (role: ${cachedUser.roleInfo.name})`);
      sendForbidden(res, '비활성화된 역할입니다.');
      return;
    }

    (req as AuthRequest).user = {
      id: cachedUser.id,
      name: cachedUser.name,
      role: cachedUser.roleInfo.id,
    };

    if (env.NODE_ENV === 'development') {
      logInfo(`인증 성공 - userId: ${cachedUser.id}, role: ${cachedUser.roleInfo.name}`);
    }

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendError(res, 419, '토큰이 만료되었습니다.');
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      logWarning('JWT 검증 실패: 유효하지 않은 토큰');
      sendUnauthorized(res, '유효하지 않은 토큰입니다.');
      return;
    }

    logError('JWT 인증 처리 중 예기치 못한 오류', err);
    sendError(res, 500, '인증 처리 중 오류가 발생했습니다.');
  }
};

// 선택적 인증 미들웨어 (토큰이 있으면 사용자 정보 주입, 없어도 통과)
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { access_token } = req.cookies;

    if (!access_token) {
      next();
      return;
    }

    const decoded = jwt.verify(access_token, env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    }) as { id: string; tv?: number };

    // ✅ authenticate와 동일하게 캐시 우선 조회 (DB 부하 감소)
    let cachedUser = getCachedUser(decoded.id);

    if (!cachedUser) {
      const dbUser = await User.findByPk(decoded.id, {
        paranoid: false,
        include: [
          {
            model: Role,
            as: 'roleInfo',
            attributes: ['id', 'name', 'description', 'isActive'],
          },
        ],
        attributes: ['id', 'name', 'roleId', 'isActive', 'isDeleted', 'tokenVersion'],
      });

      if (dbUser) {
        cachedUser = {
          id: dbUser.id,
          name: dbUser.name,
          roleId: dbUser.roleId,
          isActive: dbUser.isActive,
          isDeleted: dbUser.isDeleted,
          tokenVersion: dbUser.tokenVersion ?? 0,
          roleInfo: dbUser.roleInfo
            ? {
                id: dbUser.roleInfo.id,
                name: dbUser.roleInfo.name,
                description: dbUser.roleInfo.description,
                isActive: dbUser.roleInfo.isActive,
              }
            : null,
          cachedAt: Date.now(),
        };
        userCache.set(decoded.id, cachedUser);
      }
    }

    if (!cachedUser) {
      next();
      return;
    }

    // tokenVersion 불일치 시 로그아웃된 토큰으로 간주하여 비인증 상태로 처리
    const tokenVersionValid = decoded.tv === undefined || decoded.tv === cachedUser.tokenVersion;

    if (
      !cachedUser.isDeleted &&
      cachedUser.isActive &&
      cachedUser.roleInfo?.isActive &&
      tokenVersionValid
    ) {
      (req as AuthRequest).user = {
        id: cachedUser.id,
        name: cachedUser.name,
        role: cachedUser.roleInfo.id,
      };
    }

    next();
  } catch {
    // 선택적 인증은 실패해도 그냥 통과
    next();
  }
};
