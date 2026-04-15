import { BaseService } from './base.service';
import { User, UserInstance } from '../models/User';
import { Role } from '../models/Role';
import { AppError } from '../middlewares/error.middleware';
import bcrypt from 'bcrypt';
import { getBcryptRounds, getSettings } from '../utils/settingsCache';
import jwt from 'jsonwebtoken';
import Board from '../models/Board';
import BoardAccess from '../models/BoardAccess';
import EventPermission from '../models/EventPermission';
import { Op } from 'sequelize';
import crypto from 'crypto';
import { securityLogService } from './securityLog.service';
import { loginHistoryService } from './loginHistory.service';
import { userSessionService } from './userSession.service';
import { notificationService } from './notification.service';
import { logWarning } from '../utils/logger';

// Types
export interface UserPayload {
  id: string;
  name: string;
  role: string;
  permissions: {
    events: {
      canCreate: boolean;
      canRead: boolean;
      canUpdate: boolean;
      canDelete: boolean;
    };
    boards: Array<{
      boardId: string;
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
    }>;
    personalBoard: {
      boardId: string;
      boardName: string;
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
    } | null;
  };
}

interface LoginResult {
  user: UserInstance;
  accessToken: string;
  refreshToken: string;
  payload: UserPayload | null;
  requires2FA?: boolean;
  tempToken?: string;
}

interface RegisterDTO {
  id: string;
  password: string;
  name: string;
  email?: string;
}

export class AuthService extends BaseService {
  public async generateUserPayload(user: UserInstance): Promise<UserPayload> {
    const [eventPermission, boardPermissions, personalBoard] = await Promise.all([
      EventPermission.findOne({
        where: { roleId: user.roleId },
      }),
      BoardAccess.findAll({
        where: { roleId: user.roleId },
      }),
      Board.findOne({
        where: {
          isPersonal: true,
          ownerId: user.id,
          isActive: true,
        },
      }),
    ]);

    return {
      id: user.id,
      name: user.name,
      role: user.roleId, // Consistent with payload structure
      permissions: {
        events: eventPermission
          ? {
              canCreate: eventPermission.canCreate,
              canRead: eventPermission.canRead,
              canUpdate: eventPermission.canUpdate,
              canDelete: eventPermission.canDelete,
            }
          : {
              canCreate: false,
              canRead: true,
              canUpdate: false,
              canDelete: false,
            },
        boards: boardPermissions.map(bp => ({
          boardId: bp.boardId,
          canRead: bp.canRead,
          canWrite: bp.canWrite,
          canDelete: bp.canDelete,
        })),
        personalBoard: personalBoard
          ? {
              boardId: personalBoard.id,
              boardName: personalBoard.name,
              canRead: true, // Personal board always full access for owner
              canWrite: true,
              canDelete: true,
            }
          : null,
      },
    };
  }

  async login(
    id: string,
    password: string,
    ipAddress: string,
    fingerprint?: string,
    userAgent?: string | null
  ): Promise<LoginResult> {
    const user = await User.findOne({
      where: { id },
      paranoid: false, // ✅ deletedAt 컬럼 마이그레이션 전에도 쿼리 가능 (isDeleted로 따로 체크)
      include: [
        {
          model: Role,
          as: 'roleInfo',
          attributes: ['id', 'name', 'description', 'isActive'],
        },
      ],
    });

    if (!user) throw new AppError(401, '아이디 및 비밀번호가 틀렸습니다.');

    if (!user.isActive)
      throw new AppError(403, '관리자 승인 대기 중인 계정입니다. 승인 후 다시 시도해주세요.');
    if (user.isDeletedAccount()) throw new AppError(401, '삭제된 계정입니다.');
    if (!user.roleInfo) throw new AppError(401, '역할 정보가 없습니다.');
    if (!user.roleInfo.isActive) throw new AppError(403, '비활성화된 역할입니다.');
    if (user.isLocked()) {
      securityLogService
        .createLog({
          userId: user.id,
          ipAddress,
          action: 'LOGIN_BLOCKED',
          method: 'POST',
          route: '/api/auth/login',
          status: 'FAILURE',
          details: { reason: 'Account locked' },
        })
        .catch(() => {});
      loginHistoryService
        .createLoginRecord({
          userId: user.id,
          userName: user.name,
          userRole: user.roleId,
          ipAddress,
          userAgent,
          status: 'locked',
          failureReason: '계정 잠금 상태',
        })
        .catch(() => {});
      throw new AppError(403, '계정이 잠겨있습니다. 나중에 다시 시도해주세요.');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // ✅ DB 컬럼 누락(기존 DB 마이그레이션 중) 시 save() 실패해도 로그인 흐름 유지
      try {
        await user.incrementFailedAttempts();
      } catch (err) {
        logWarning('로그인 실패 카운터 증가 실패 (마이그레이션 중일 수 있음)', {
          userId: user.id,
          err,
        });
      }
      securityLogService
        .createLog({
          userId: user.id,
          ipAddress,
          action: 'LOGIN_FAILED',
          method: 'POST',
          route: '/api/auth/login',
          status: 'FAILURE',
          details: { reason: 'Invalid password' },
        })
        .catch(() => {});
      loginHistoryService
        .createLoginRecord({
          userId: user.id,
          userName: user.name,
          userRole: user.roleId,
          ipAddress,
          userAgent,
          status: 'failed',
          failureReason: '비밀번호 불일치',
        })
        .catch(() => {});
      // 계정이 잠긴 경우에만 알림 (매 실패마다 알림 스팸 방지)
      if (user.isLocked()) {
        notificationService
          .create({
            userId: user.id,
            type: 'SYSTEM',
            message: `🔒 비밀번호 오류 5회 초과로 계정이 30분 동안 잠겼습니다. 본인이 아닌 경우 비밀번호를 변경하세요.`,
            link: '/profile',
          })
          .catch(() => {});
      }
      throw new AppError(401, '아이디 및 비밀번호가 틀렸습니다.');
    }

    // 새 IP 감지를 위해 업데이트 전 이전 IP 보존
    const previousLoginIp = user.lastLoginIp ?? null;

    // ✅ DB 컬럼 누락 시 save() 실패해도 로그인은 계속 진행
    try {
      await user.resetFailedAttempts(ipAddress);
    } catch (err) {
      logWarning('로그인 성공 후 실패 카운터 리셋 실패 (마이그레이션 중일 수 있음)', {
        userId: user.id,
        err,
      });
    }

    // ✅ 2FA 체크: 2FA가 활성화된 사용자는 추가 인증 필요
    if (user.twoFactorEnabled) {
      // 임시 토큰 생성 (2FA 검증용, 짧은 만료시간)
      const tempToken = jwt.sign({ id: user.id, type: '2fa_pending' }, process.env.JWT_SECRET!, {
        expiresIn: '5m',
        algorithm: 'HS256',
      });

      return {
        user,
        accessToken: '',
        refreshToken: '',
        payload: null,
        requires2FA: true,
        tempToken,
      };
    }

    const payload = await this.generateUserPayload(user);

    // Add simple role/id to payload root for middleware convenience
    const jwtPayload = {
      ...payload,
      roleId: user.roleId,
    };

    const { jwtAccessTokenHours, jwtRefreshTokenDays } = getSettings();

    const accessToken = jwt.sign(
      { ...jwtPayload, tv: user.tokenVersion ?? 0 },
      process.env.JWT_SECRET!,
      { expiresIn: `${jwtAccessTokenHours}h`, algorithm: 'HS256' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, tokenType: 'refresh', tv: user.tokenVersion ?? 0 },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: `${jwtRefreshTokenDays}d`, algorithm: 'HS256' }
    );

    // 새 IP 로그인 감지: 이전 로그인 IP(업데이트 전 보존)와 비교
    if (previousLoginIp !== null && previousLoginIp !== ipAddress) {
      notificationService
        .create({
          userId: user.id,
          type: 'SYSTEM',
          message: `🔔 새로운 IP(${ipAddress})에서 로그인이 감지되었습니다. 본인이 아닌 경우 즉시 비밀번호를 변경하세요.`,
          link: '/profile',
        })
        .catch(() => {});
    }

    securityLogService
      .createLog({
        userId: user.id,
        ipAddress,
        action: 'LOGIN_SUCCESS',
        method: 'POST',
        route: '/api/auth/login',
        status: 'SUCCESS',
        details: fingerprint ? { fingerprint } : undefined,
      })
      .catch(() => {});

    loginHistoryService
      .createLoginRecord({
        userId: user.id,
        userName: user.name,
        userRole: user.roleId,
        ipAddress,
        userAgent,
        status: 'success',
      })
      .catch(() => {});

    userSessionService
      .createSession({
        userId: user.id,
        rawToken: refreshToken,
        ipAddress,
        userAgent,
      })
      .catch(() => {});

    return { user, accessToken, refreshToken, payload };
  }

  async refreshToken(token: string): Promise<LoginResult> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
        id: string;
        tokenType: string;
        tv?: number;
      };

      if (decoded.tokenType !== 'refresh') {
        throw new AppError(401, '잘못된 토큰 타입입니다.');
      }

      const user = await User.findOne({
        where: {
          id: decoded.id,
          isActive: true,
        },
        paranoid: false, // ✅ deletedAt 컬럼 마이그레이션 전에도 쿼리 가능
        include: [
          {
            model: Role,
            as: 'roleInfo',
            attributes: ['id', 'name', 'description', 'isActive'],
          },
        ],
      });

      if (!user) throw new AppError(401, '사용자를 찾을 수 없습니다.');
      if (user.isDeletedAccount()) throw new AppError(401, '삭제된 계정입니다.');
      if (!user.roleInfo?.isActive) throw new AppError(403, '비활성화된 역할입니다.');

      // tokenVersion 검증: 로그아웃 후 기존 토큰 무효화
      if (decoded.tv !== undefined && decoded.tv !== (user.tokenVersion ?? 0)) {
        throw new AppError(401, '만료된 토큰입니다. 다시 로그인해주세요.');
      }

      const payload = await this.generateUserPayload(user);
      const jwtPayload = { ...payload, roleId: user.roleId };

      const { jwtAccessTokenHours: accessHours, jwtRefreshTokenDays: refreshDays } = getSettings();

      const newAccessToken = jwt.sign(
        { ...jwtPayload, tv: user.tokenVersion ?? 0 },
        process.env.JWT_SECRET!,
        { expiresIn: `${accessHours}h`, algorithm: 'HS256' }
      );

      const newRefreshToken = jwt.sign(
        { id: user.id, tokenType: 'refresh', tv: user.tokenVersion ?? 0 },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: `${refreshDays}d`, algorithm: 'HS256' }
      );

      // 세션 토큰 교체 + 활동 시각 갱신 (fire-and-forget)
      // 구 refresh token → 신 refresh token 으로 DB 세션을 교체해야 다음 갱신에서도 추적 가능
      userSessionService.rotateSession(token, newRefreshToken).catch(() => {});

      return {
        user,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        payload,
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err; // AppError는 그대로 재전파 (상태코드/메시지 유지)
      }
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError(401, '리프레시 토큰이 만료되었습니다.');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new AppError(401, '유효하지 않은 토큰입니다.');
      }
      throw new AppError(401, '토큰 갱신 실패');
    }
  }

  async register(data: RegisterDTO): Promise<UserInstance> {
    // Validate ID/Password complexity (Assuming Controller or specific method handles detailed validation messages,
    // but service should enforce core rules)
    // Keep simple rules consistent with controller

    let defaultRole = await Role.findOne({
      where: { id: 'guest', isActive: true },
    });

    if (!defaultRole) {
      defaultRole = await Role.create({
        id: 'guest',
        name: '방문자',
        description: '승인 대기 중인 신규 사용자',
        isActive: true,
      });
    }

    const existing = await User.findByPk(data.id);
    if (existing) throw new AppError(409, '이미 존재하는 아이디입니다.');

    if (data.email) {
      const existingEmail = await User.findOne({ where: { email: data.email } });
      if (existingEmail) throw new AppError(409, '이미 사용 중인 이메일입니다.');
    }

    return User.create({
      id: data.id,
      password: data.password, // Hook hashes
      name: data.name,
      email: data.email || null,
      roleId: 'guest',
      isActive: false,
    });
  }

  // 비밀번호 재설정 토큰 생성 및 저장
  async forgotPassword(email: string): Promise<{ token: string; user: UserInstance } | null> {
    const user = await User.findOne({ where: { email, isActive: true, isDeleted: false } });
    if (!user) return null; // 보안상 사용자 존재 여부 숨김

    const token = await user.generatePasswordResetToken(); // 평문 토큰 반환, 내부에서 save() 호출
    return { token, user };
  }

  // 토큰 검증 후 비밀번호 변경
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // DB에는 SHA-256 해시가 저장되므로 입력 토큰을 해싱 후 비교
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [Op.gt]: new Date() },
        isActive: true,
        isDeleted: false,
      },
    });

    if (!user) return false;

    const hashedPassword = await bcrypt.hash(newPassword, getBcryptRounds());
    user.password = hashedPassword;
    user.passwordResetToken = null as any;
    user.passwordResetExpires = null as any;
    // ✅ 이미 해싱된 값이므로 beforeUpdate 훅에서 재해싱 건너뜀 (hooks: false 대신 플래그 사용)
    user._skipPasswordHash = true;
    await user.save();
    return true;
  }

  async getUserPermissions(
    userId: string,
    roleId: string
  ): Promise<{
    role: string;
    eventPermissions: {
      canCreate: boolean;
      canRead: boolean;
      canUpdate: boolean;
      canDelete: boolean;
    };
    boardPermissions: {
      boardId: string;
      boardName: string;
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
    }[];
    personalBoard: {
      boardId: string;
      boardName: string;
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
    } | null;
  }> {
    // Re-use logic for getting permissions object
    // This is basically generateUserPayload logic without full user object requirement if we have roleId
    // But we need userId for personal board check.

    const eventPermission = await EventPermission.findOne({ where: { roleId } });

    const boardPermissionsWithBoard = await BoardAccess.findAll({
      where: { roleId, canRead: true },
      include: [
        {
          model: Board,
          as: 'board',
          attributes: ['id', 'name'],
          where: { isActive: true, isPersonal: false },
        },
      ],
    });

    const personalBoard = await Board.findOne({
      where: { isPersonal: true, ownerId: userId, isActive: true },
    });

    return {
      role: roleId,
      eventPermissions: eventPermission
        ? {
            canCreate: eventPermission.canCreate,
            canRead: eventPermission.canRead,
            canUpdate: eventPermission.canUpdate,
            canDelete: eventPermission.canDelete,
          }
        : {
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          },
      boardPermissions: boardPermissionsWithBoard.map(bp => ({
        boardId: bp.boardId,
        boardName: bp.board ? bp.board.name : 'Unknown',
        canRead: bp.canRead,
        canWrite: bp.canWrite,
        canDelete: bp.canDelete,
      })),
      personalBoard: personalBoard
        ? {
            boardId: personalBoard.id,
            boardName: personalBoard.name,
            canRead: true,
            canWrite: true,
            canDelete: true,
          }
        : null,
    };
  }
}

export const authService = new AuthService();
