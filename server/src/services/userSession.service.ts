import { BaseService } from './base.service';
import { UserSession } from '../models/UserSession';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { logError } from '../utils/logger';
import { getSettings } from '../utils/settingsCache';

const MAX_SESSIONS_PER_USER = 10;

export class UserSessionService extends BaseService {
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * 세션 생성 (로그인 시 호출)
   */
  async createSession(data: {
    userId: string;
    rawToken: string;
    ipAddress: string;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      const sessionToken = this.hashToken(data.rawToken);
      const expiresAt = new Date(
        Date.now() + getSettings().jwtRefreshTokenDays * 24 * 60 * 60 * 1000
      );

      // 동일 토큰 해시가 이미 있으면 upsert
      const existing = await UserSession.findOne({ where: { sessionToken } });
      if (existing) {
        await existing.update({ isActive: true, lastActiveAt: new Date(), expiresAt });
        return;
      }

      await UserSession.create({
        userId: data.userId,
        sessionToken,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent?.substring(0, 500) ?? null,
        lastActiveAt: new Date(),
        expiresAt,
        isActive: true,
      });

      // 사용자당 최대 세션 수 초과 시 가장 오래된 세션 비활성화
      await this.enforceSessionLimit(data.userId);
    } catch (error) {
      logError('세션 생성 실패', error);
    }
  }

  /**
   * 사용자당 최대 세션 수 제한 (초과 시 가장 오래된 활성 세션 만료)
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const activeSessions = await UserSession.findAll({
      where: { userId, isActive: true, expiresAt: { [Op.gt]: new Date() } },
      order: [['lastActiveAt', 'ASC']],
      attributes: ['id'],
    });

    if (activeSessions.length > MAX_SESSIONS_PER_USER) {
      const excess = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS_PER_USER);
      const ids = excess.map(s => s.id);
      await UserSession.update({ isActive: false }, { where: { id: ids } });
    }
  }

  /**
   * 세션 활동 갱신 + 토큰 교체 (refreshToken 시 호출)
   * 구 토큰 해시 → 신 토큰 해시로 sessionToken 교체 & lastActiveAt 갱신
   * 세션이 없거나 이미 만료된 경우 조용히 무시 (fire-and-forget 용도)
   */
  async rotateSession(oldRawToken: string, newRawToken: string): Promise<void> {
    try {
      const oldHash = this.hashToken(oldRawToken);
      const newHash = this.hashToken(newRawToken);
      await UserSession.update(
        { sessionToken: newHash, lastActiveAt: new Date() },
        { where: { sessionToken: oldHash, isActive: true } }
      );
    } catch (error) {
      logError('세션 토큰 교체 실패', error);
    }
  }

  /**
   * 세션 마지막 활동 시각 갱신 (레거시 — rotateSession 사용 권장)
   */
  async updateActivity(rawToken: string): Promise<void> {
    try {
      const sessionToken = this.hashToken(rawToken);
      await UserSession.update(
        { lastActiveAt: new Date() },
        { where: { sessionToken, isActive: true } }
      );
    } catch (error) {
      logError('세션 활동 갱신 실패', error);
    }
  }

  /**
   * 세션 만료 (로그아웃 시 호출)
   */
  async expireSession(rawToken: string): Promise<void> {
    try {
      const sessionToken = this.hashToken(rawToken);
      await UserSession.update({ isActive: false }, { where: { sessionToken } });
    } catch (error) {
      logError('세션 만료 처리 실패', error);
    }
  }

  /**
   * 사용자의 모든 세션 만료 (강제 전체 로그아웃)
   */
  async expireAllUserSessions(userId: string): Promise<void> {
    try {
      await UserSession.update({ isActive: false }, { where: { userId, isActive: true } });
    } catch (error) {
      logError('전체 세션 만료 처리 실패', error);
    }
  }

  /**
   * 사용자의 활성 세션 목록 조회 (sessionToken 제외)
   */
  async getActiveSessions(userId: string) {
    const sessions = await UserSession.findAll({
      where: {
        userId,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() },
      },
      attributes: [
        'id',
        'userId',
        'ipAddress',
        'userAgent',
        'lastActiveAt',
        'expiresAt',
        'createdAt',
      ],
      order: [['lastActiveAt', 'DESC']],
    });
    return sessions;
  }

  /**
   * 특정 세션 강제 종료 (관리자용)
   */
  async forceLogout(sessionId: string): Promise<boolean> {
    try {
      const session = await UserSession.findByPk(sessionId);
      if (!session) return false;
      await session.update({ isActive: false });
      return true;
    } catch (error) {
      logError('강제 세션 종료 실패', error);
      return false;
    }
  }

  /**
   * 만료된 세션 정리
   */
  async cleanExpiredSessions(): Promise<number> {
    const now = new Date();
    const graceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return UserSession.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lt]: now } },
          { isActive: false, createdAt: { [Op.lt]: graceDate } },
        ],
      },
    });
  }
}

export const userSessionService = new UserSessionService();
