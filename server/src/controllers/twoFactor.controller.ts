// server/src/controllers/twoFactor.controller.ts - 2FA 인증 컨트롤러
import { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { AuthRequest } from '../types/auth-request';
import { authService } from '../services/auth.service';
import { getSettings } from '../utils/settingsCache';
import { logError } from '../utils/logger';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendNotFound,
  sendValidationError,
} from '../utils/response';

/**
 * ✅ 2FA 비밀키 생성 및 QR 코드 반환
 */
export const generate2FASecret = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorized(res, '인증이 필요합니다.');
      return;
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      sendNotFound(res, '사용자');
      return;
    }

    if (user.twoFactorEnabled) {
      sendValidationError(res, 'twoFactor', '2FA가 이미 활성화되어 있습니다.');
      return;
    }

    const secret = speakeasy.generateSecret({
      name: `Myhome:${user.email}`,
      length: 20,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    user.twoFactorSecret = secret.base32;
    await user.save();

    sendSuccess(res, {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (error) {
    logError('2FA 비밀키 생성 실패', error);
    sendError(res, 500, '2FA 설정 생성에 실패했습니다.');
  }
};

/**
 * ✅ 2FA 활성화 (코드 검증 후)
 */
export const enable2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!req.user) {
      sendUnauthorized(res, '인증이 필요합니다.');
      return;
    }

    if (!token) {
      sendValidationError(res, 'token', '인증 코드를 입력해주세요.');
      return;
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      sendNotFound(res, '사용자');
      return;
    }

    const secret = user.twoFactorSecret;
    if (!secret) {
      sendValidationError(res, 'twoFactor', '먼저 2FA 설정을 생성해주세요.');
      return;
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      sendValidationError(res, 'token', '잘못된 인증 코드입니다.');
      return;
    }

    user.twoFactorEnabled = true;
    await user.save();

    sendSuccess(res, null, '2FA가 활성화되었습니다.');
  } catch (error) {
    logError('2FA 활성화 실패', error);
    sendError(res, 500, '2FA 활성화에 실패했습니다.');
  }
};

/**
 * ✅ 2FA 비활성화
 */
export const disable2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!req.user) {
      sendUnauthorized(res, '인증이 필요합니다.');
      return;
    }

    if (!token) {
      sendValidationError(res, 'token', '인증 코드를 입력해주세요.');
      return;
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      sendNotFound(res, '사용자');
      return;
    }

    if (!user.twoFactorEnabled) {
      sendValidationError(res, 'twoFactor', '2FA가 활성화되어 있지 않습니다.');
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      sendValidationError(res, 'token', '잘못된 인증 코드입니다.');
      return;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    sendSuccess(res, null, '2FA가 비활성화되었습니다.');
  } catch (error) {
    logError('2FA 비활성화 실패', error);
    sendError(res, 500, '2FA 비활성화에 실패했습니다.');
  }
};

/**
 * ✅ 2FA 로그인 검증 (토큰 발행)
 * 클라이언트가 data.user / data.tokenInfo 를 직접 참조하므로 구조 유지
 */
export const verify2FALogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tempToken, token } = req.body;

    if (!tempToken || !token) {
      sendValidationError(res, 'token', '필수 항목이 누락되었습니다.');
      return;
    }

    let decoded: { id: string; type: string };
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as { id: string; type: string };
      if (decoded.type !== '2fa_pending') {
        sendUnauthorized(res, '유효하지 않은 토큰입니다.');
        return;
      }
    } catch (_err) {
      sendUnauthorized(res, '임시 토큰이 만료되었습니다. 다시 로그인해주세요.');
      return;
    }

    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Role,
          as: 'roleInfo',
          attributes: ['id', 'name', 'description', 'isActive'],
        },
      ],
    });

    if (!user) {
      sendNotFound(res, '사용자');
      return;
    }

    // 일반 로그인과 동일하게 계정/역할 상태 검증 (비활성화된 계정의 2FA 우회 방지)
    if (!user.isActive) {
      sendError(res, 403, '비활성화된 계정입니다. 관리자에게 문의하세요.');
      return;
    }
    if (!user.roleInfo?.isActive) {
      sendError(res, 403, '비활성화된 역할입니다. 관리자에게 문의하세요.');
      return;
    }

    if (!user.twoFactorEnabled) {
      sendValidationError(res, 'twoFactor', '2FA가 활성화되어 있지 않습니다.');
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      sendValidationError(res, 'token', '잘못된 인증 코드입니다.');
      return;
    }

    // ✅ 로그인 완료 - authService로 payload 생성
    const payload = await authService.generateUserPayload(user);

    const { jwtAccessTokenHours, jwtRefreshTokenDays } = getSettings();

    const accessToken = jwt.sign(
      { ...payload, roleId: user.roleId, tv: user.tokenVersion ?? 0 },
      process.env.JWT_SECRET!,
      { expiresIn: `${jwtAccessTokenHours}h`, algorithm: 'HS256' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, tokenType: 'refresh', tv: user.tokenVersion ?? 0 },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: `${jwtRefreshTokenDays}d`, algorithm: 'HS256' }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: jwtAccessTokenHours * 60 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: jwtRefreshTokenDays * 24 * 60 * 60 * 1000,
    });

    sendSuccess(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          role: user.roleId,
          theme: user.theme,
          avatar: user.avatar,
          roleInfo: user.roleInfo,
          permissions: payload.permissions,
          createdAt: user.createdAt,
        },
        tokenInfo: {
          accessTokenExpiry: Date.now() + jwtAccessTokenHours * 60 * 60 * 1000,
          refreshTokenExpiry: Date.now() + jwtRefreshTokenDays * 24 * 60 * 60 * 1000,
        },
      },
      '로그인 성공'
    );
  } catch (error) {
    logError('2FA 로그인 검증 실패', error);
    sendError(res, 500, '2FA 검증에 실패했습니다.');
  }
};

/**
 * ✅ 2FA 상태 조회
 */
export const get2FAStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorized(res, '인증이 필요합니다.');
      return;
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      sendNotFound(res, '사용자');
      return;
    }

    sendSuccess(res, {
      enabled: user.twoFactorEnabled || false,
    });
  } catch (error) {
    logError('2FA 상태 조회 실패', error);
    sendError(res, 500, '2FA 상태 조회에 실패했습니다.');
  }
};
