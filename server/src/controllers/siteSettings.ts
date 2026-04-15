// src/controllers/siteSettings.ts
import { Request, Response } from 'express';
import { SiteSettings } from '../models';
import { logInfo, logError } from '../utils/logger';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types/auth-request';
import { refreshMaintenanceCache } from '../middlewares/maintenance.middleware';
import {
  refreshSettingsCache,
  SETTINGS_DEFAULTS,
  DEFAULT_ALLOWED_EXTENSIONS,
} from '../utils/settingsCache';
import { refreshUploaders } from '../middlewares/upload/refresh';

/** All fields we expose / accept */
const DEFAULTS = {
  siteName: '마이홈',
  siteTitle: 'Secure Board App',
  faviconUrl: null as string | null,
  logoUrl: null as string | null,
  description: null as string | null,
  allowRegistration: true,
  requireApproval: false,
  maintenanceMode: false,
  maintenanceMessage: null as string | null,
  loginMessage: null as string | null,
  // ✅ 숫자/불리언 설정은 settingsCache.ts의 SETTINGS_DEFAULTS를 단일 소스로 사용
  ...SETTINGS_DEFAULTS,
  // ✅ 허용 확장자는 Sequelize TEXT 컬럼에 저장되므로 JSON 문자열로 직렬화
  allowedImageExtensions: JSON.stringify(SETTINGS_DEFAULTS.allowedImageExtensions),
  allowedDocumentExtensions: JSON.stringify(SETTINGS_DEFAULTS.allowedDocumentExtensions),
  allowedArchiveExtensions: JSON.stringify(SETTINGS_DEFAULTS.allowedArchiveExtensions),
  allowedMediaExtensions: JSON.stringify(SETTINGS_DEFAULTS.allowedMediaExtensions),
};

// ─── 허용 확장자 유효성 검사 ────────────────────────────────────────────────────

function validateExtensionList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${field}은 배열이어야 합니다.`);
  for (const ext of value) {
    if (typeof ext !== 'string' || !ext.startsWith('.')) {
      throw new Error(`${field}의 각 항목은 '.'으로 시작하는 문자열이어야 합니다. (예: .jpg)`);
    }
  }
  return (value as string[]).map(e => e.toLowerCase().trim());
}

// ─── DB → 응답 페이로드 변환 ─────────────────────────────────────────────────────

function parseExtensionField(raw: string | null | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function toPayload(s: SiteSettings) {
  return {
    siteName: s.siteName,
    siteTitle: s.siteTitle,
    faviconUrl: s.faviconUrl,
    logoUrl: s.logoUrl,
    description: s.description,
    allowRegistration: s.allowRegistration,
    requireApproval: s.requireApproval,
    maintenanceMode: s.maintenanceMode,
    maintenanceMessage: s.maintenanceMessage,
    loginMessage: s.loginMessage,
    maxLoginAttempts: s.maxLoginAttempts ?? DEFAULTS.maxLoginAttempts,
    accountLockMinutes: s.accountLockMinutes ?? DEFAULTS.accountLockMinutes,
    maxFileCount: s.maxFileCount ?? DEFAULTS.maxFileCount,
    maxFileSizeMb: s.maxFileSizeMb ?? DEFAULTS.maxFileSizeMb,
    maxImageSizeMb: s.maxImageSizeMb ?? DEFAULTS.maxImageSizeMb,
    maxAvatarSizeMb: s.maxAvatarSizeMb ?? DEFAULTS.maxAvatarSizeMb,
    maxArchiveSizeMb: s.maxArchiveSizeMb ?? DEFAULTS.maxArchiveSizeMb,
    maxImageCount: s.maxImageCount ?? DEFAULTS.maxImageCount,
    bcryptRounds: s.bcryptRounds ?? DEFAULTS.bcryptRounds,
    allowedImageExtensions: parseExtensionField(
      s.allowedImageExtensions,
      DEFAULT_ALLOWED_EXTENSIONS.IMAGE
    ),
    allowedDocumentExtensions: parseExtensionField(
      s.allowedDocumentExtensions,
      DEFAULT_ALLOWED_EXTENSIONS.DOCUMENT
    ),
    allowedArchiveExtensions: parseExtensionField(
      s.allowedArchiveExtensions,
      DEFAULT_ALLOWED_EXTENSIONS.ARCHIVE
    ),
    allowedMediaExtensions: parseExtensionField(
      s.allowedMediaExtensions,
      DEFAULT_ALLOWED_EXTENSIONS.MEDIA
    ),
    defaultPageSize: s.defaultPageSize ?? DEFAULTS.defaultPageSize,
    securityLogRetentionDays: s.securityLogRetentionDays ?? DEFAULTS.securityLogRetentionDays,
    errorLogRetentionDays: s.errorLogRetentionDays ?? DEFAULTS.errorLogRetentionDays,
    jwtAccessTokenHours: s.jwtAccessTokenHours ?? DEFAULTS.jwtAccessTokenHours,
    jwtRefreshTokenDays: s.jwtRefreshTokenDays ?? DEFAULTS.jwtRefreshTokenDays,
    postTitleMaxLength: s.postTitleMaxLength ?? DEFAULTS.postTitleMaxLength,
    postContentMaxLength: s.postContentMaxLength ?? DEFAULTS.postContentMaxLength,
    postSecretPasswordMinLength:
      s.postSecretPasswordMinLength ?? DEFAULTS.postSecretPasswordMinLength,
    globalSearchLimit: s.globalSearchLimit ?? DEFAULTS.globalSearchLimit,
    allowGuestComment: s.allowGuestComment ?? DEFAULTS.allowGuestComment,
    minPasswordLength: s.minPasswordLength ?? DEFAULTS.minPasswordLength,
    commentMaxDepth: s.commentMaxDepth ?? DEFAULTS.commentMaxDepth,
    commentMaxCount: s.commentMaxCount ?? DEFAULTS.commentMaxCount,
    avatarSizePx: s.avatarSizePx ?? DEFAULTS.avatarSizePx,
    avatarQuality: s.avatarQuality ?? DEFAULTS.avatarQuality,
    passwordResetTokenHours: s.passwordResetTokenHours ?? DEFAULTS.passwordResetTokenHours,
    rateLimitApiMax: s.rateLimitApiMax ?? DEFAULTS.rateLimitApiMax,
    rateLimitAuthMax: s.rateLimitAuthMax ?? DEFAULTS.rateLimitAuthMax,
    rateLimitUploadMax: s.rateLimitUploadMax ?? DEFAULTS.rateLimitUploadMax,
    rateLimitDownloadMax: s.rateLimitDownloadMax ?? DEFAULTS.rateLimitDownloadMax,
    autoSaveIntervalSeconds: s.autoSaveIntervalSeconds ?? DEFAULTS.autoSaveIntervalSeconds,
    draftExpiryMinutes: s.draftExpiryMinutes ?? DEFAULTS.draftExpiryMinutes,
  };
}

/** GET /api/site-settings — public */
export const getSiteSettings = async (_req: Request, res: Response) => {
  try {
    let settings = await SiteSettings.findByPk(1);
    if (!settings) {
      settings = await SiteSettings.create(DEFAULTS);
    }
    sendSuccess(res, toPayload(settings));
  } catch (error) {
    logError('사이트 설정 조회 실패', error);
    sendError(res, 500, '사이트 설정을 불러오는데 실패했습니다.');
  }
};

/** PUT /api/site-settings — admin only */
export const updateSiteSettings = async (req: Request, res: Response) => {
  try {
    const {
      siteName,
      siteTitle,
      faviconUrl,
      logoUrl,
      description,
      allowRegistration,
      requireApproval,
      maintenanceMode,
      maintenanceMessage,
      loginMessage,
      maxLoginAttempts,
      accountLockMinutes,
      maxFileCount,
      maxFileSizeMb,
      maxImageSizeMb,
      maxAvatarSizeMb,
      maxArchiveSizeMb,
      maxImageCount,
      bcryptRounds,
      allowedImageExtensions,
      allowedDocumentExtensions,
      allowedArchiveExtensions,
      allowedMediaExtensions,
      defaultPageSize,
      securityLogRetentionDays,
      errorLogRetentionDays,
      jwtAccessTokenHours,
      jwtRefreshTokenDays,
      postTitleMaxLength,
      postContentMaxLength,
      postSecretPasswordMinLength,
      globalSearchLimit,
      allowGuestComment,
      minPasswordLength,
      commentMaxDepth,
      commentMaxCount,
      avatarSizePx,
      avatarQuality,
      passwordResetTokenHours,
      rateLimitApiMax,
      rateLimitAuthMax,
      rateLimitUploadMax,
      rateLimitDownloadMax,
      autoSaveIntervalSeconds,
      draftExpiryMinutes,
    } = req.body;

    // ── 입력 유효성 검사 ──────────────────────────────────────────────────────
    if (bcryptRounds !== undefined) {
      const rounds = Number(bcryptRounds);
      if (!Number.isInteger(rounds) || rounds < 10 || rounds > 14) {
        return sendError(res, 400, 'bcryptRounds는 10~14 사이의 정수여야 합니다.');
      }
    }

    // 숫자 범위 검증 헬퍼
    function validateInt(value: unknown, field: string, min: number, max: number): string | null {
      const v = Number(value);
      if (!Number.isInteger(v) || v < min || v > max) {
        return `${field}는 ${min}~${max} 사이의 정수여야 합니다.`;
      }
      return null;
    }

    const numericChecks: Array<[unknown, string, number, number]> = [
      // 계정 보안
      [maxLoginAttempts, 'maxLoginAttempts', 1, 20],
      [accountLockMinutes, 'accountLockMinutes', 1, 1440],
      [minPasswordLength, 'minPasswordLength', 4, 32],
      // 파일 업로드
      [maxFileCount, 'maxFileCount', 1, 20],
      [maxFileSizeMb, 'maxFileSizeMb', 1, 1000],
      [maxImageSizeMb, 'maxImageSizeMb', 1, 500],
      [maxAvatarSizeMb, 'maxAvatarSizeMb', 1, 100],
      [maxArchiveSizeMb, 'maxArchiveSizeMb', 1, 1000],
      [maxImageCount, 'maxImageCount', 1, 20],
      // 게시글 설정
      [defaultPageSize, 'defaultPageSize', 5, 100],
      [postTitleMaxLength, 'postTitleMaxLength', 10, 500],
      [postContentMaxLength, 'postContentMaxLength', 1000, 2000000],
      [postSecretPasswordMinLength, 'postSecretPasswordMinLength', 4, 20],
      [globalSearchLimit, 'globalSearchLimit', 10, 200],
      // 로그 보존
      [securityLogRetentionDays, 'securityLogRetentionDays', 7, 365],
      [errorLogRetentionDays, 'errorLogRetentionDays', 7, 365],
      // JWT 토큰 유효시간
      [jwtAccessTokenHours, 'jwtAccessTokenHours', 1, 168],
      [jwtRefreshTokenDays, 'jwtRefreshTokenDays', 1, 30],
      // 댓글 설정
      [commentMaxDepth, 'commentMaxDepth', 1, 5],
      [commentMaxCount, 'commentMaxCount', 100, 5000],
      // 아바타 처리
      [avatarSizePx, 'avatarSizePx', 50, 500],
      [avatarQuality, 'avatarQuality', 50, 100],
      // 비밀번호 재설정
      [passwordResetTokenHours, 'passwordResetTokenHours', 1, 48],
      // Rate limit
      [rateLimitApiMax, 'rateLimitApiMax', 50, 1000],
      [rateLimitAuthMax, 'rateLimitAuthMax', 3, 100],
      [rateLimitUploadMax, 'rateLimitUploadMax', 5, 200],
      [rateLimitDownloadMax, 'rateLimitDownloadMax', 10, 500],
      // 에디터
      [autoSaveIntervalSeconds, 'autoSaveIntervalSeconds', 10, 300],
      [draftExpiryMinutes, 'draftExpiryMinutes', 10, 1440],
    ];

    for (const [value, field, min, max] of numericChecks) {
      if (value !== undefined) {
        const err = validateInt(value, field, min, max);
        if (err) return sendError(res, 400, err);
      }
    }

    let parsedAllowedImage: string[] | undefined;
    let parsedAllowedDocument: string[] | undefined;
    let parsedAllowedArchive: string[] | undefined;
    let parsedAllowedMedia: string[] | undefined;

    try {
      if (allowedImageExtensions !== undefined) {
        parsedAllowedImage = validateExtensionList(allowedImageExtensions, '이미지 허용 확장자');
      }
      if (allowedDocumentExtensions !== undefined) {
        parsedAllowedDocument = validateExtensionList(
          allowedDocumentExtensions,
          '문서 허용 확장자'
        );
      }
      if (allowedArchiveExtensions !== undefined) {
        parsedAllowedArchive = validateExtensionList(
          allowedArchiveExtensions,
          '압축파일 허용 확장자'
        );
      }
      if (allowedMediaExtensions !== undefined) {
        parsedAllowedMedia = validateExtensionList(allowedMediaExtensions, '미디어 허용 확장자');
      }
    } catch (validationError) {
      const msg = validationError instanceof Error ? validationError.message : '확장자 형식 오류';
      return sendError(res, 400, msg);
    }

    // ── DB 저장 ───────────────────────────────────────────────────────────────
    let settings = await SiteSettings.findByPk(1);

    if (!settings) {
      settings = await SiteSettings.create({
        siteName: siteName ?? DEFAULTS.siteName,
        siteTitle: siteTitle ?? DEFAULTS.siteTitle,
        faviconUrl: faviconUrl ?? null,
        logoUrl: logoUrl ?? null,
        description: description ?? null,
        allowRegistration: allowRegistration ?? true,
        requireApproval: requireApproval ?? false,
        maintenanceMode: maintenanceMode ?? false,
        maintenanceMessage: maintenanceMessage ?? null,
        loginMessage: loginMessage ?? null,
        maxLoginAttempts: maxLoginAttempts ?? DEFAULTS.maxLoginAttempts,
        accountLockMinutes: accountLockMinutes ?? DEFAULTS.accountLockMinutes,
        maxFileCount: maxFileCount ?? DEFAULTS.maxFileCount,
        maxFileSizeMb: maxFileSizeMb ?? DEFAULTS.maxFileSizeMb,
        maxImageSizeMb: maxImageSizeMb ?? DEFAULTS.maxImageSizeMb,
        maxAvatarSizeMb: maxAvatarSizeMb ?? DEFAULTS.maxAvatarSizeMb,
        maxArchiveSizeMb: maxArchiveSizeMb ?? DEFAULTS.maxArchiveSizeMb,
        maxImageCount: maxImageCount ?? DEFAULTS.maxImageCount,
        bcryptRounds: bcryptRounds ?? DEFAULTS.bcryptRounds,
        allowedImageExtensions: JSON.stringify(
          parsedAllowedImage ?? DEFAULT_ALLOWED_EXTENSIONS.IMAGE
        ),
        allowedDocumentExtensions: JSON.stringify(
          parsedAllowedDocument ?? DEFAULT_ALLOWED_EXTENSIONS.DOCUMENT
        ),
        allowedArchiveExtensions: JSON.stringify(
          parsedAllowedArchive ?? DEFAULT_ALLOWED_EXTENSIONS.ARCHIVE
        ),
        allowedMediaExtensions: JSON.stringify(
          parsedAllowedMedia ?? DEFAULT_ALLOWED_EXTENSIONS.MEDIA
        ),
        defaultPageSize: defaultPageSize ?? DEFAULTS.defaultPageSize,
        securityLogRetentionDays: securityLogRetentionDays ?? DEFAULTS.securityLogRetentionDays,
        errorLogRetentionDays: errorLogRetentionDays ?? DEFAULTS.errorLogRetentionDays,
        jwtAccessTokenHours: jwtAccessTokenHours ?? DEFAULTS.jwtAccessTokenHours,
        jwtRefreshTokenDays: jwtRefreshTokenDays ?? DEFAULTS.jwtRefreshTokenDays,
        postTitleMaxLength: postTitleMaxLength ?? DEFAULTS.postTitleMaxLength,
        postContentMaxLength: postContentMaxLength ?? DEFAULTS.postContentMaxLength,
        postSecretPasswordMinLength:
          postSecretPasswordMinLength ?? DEFAULTS.postSecretPasswordMinLength,
        globalSearchLimit: globalSearchLimit ?? DEFAULTS.globalSearchLimit,
        allowGuestComment: allowGuestComment ?? DEFAULTS.allowGuestComment,
        minPasswordLength: minPasswordLength ?? DEFAULTS.minPasswordLength,
        commentMaxDepth: commentMaxDepth ?? DEFAULTS.commentMaxDepth,
        commentMaxCount: commentMaxCount ?? DEFAULTS.commentMaxCount,
        avatarSizePx: avatarSizePx ?? DEFAULTS.avatarSizePx,
        avatarQuality: avatarQuality ?? DEFAULTS.avatarQuality,
        passwordResetTokenHours: passwordResetTokenHours ?? DEFAULTS.passwordResetTokenHours,
        rateLimitApiMax: rateLimitApiMax ?? DEFAULTS.rateLimitApiMax,
        rateLimitAuthMax: rateLimitAuthMax ?? DEFAULTS.rateLimitAuthMax,
        rateLimitUploadMax: rateLimitUploadMax ?? DEFAULTS.rateLimitUploadMax,
        rateLimitDownloadMax: rateLimitDownloadMax ?? DEFAULTS.rateLimitDownloadMax,
        autoSaveIntervalSeconds: autoSaveIntervalSeconds ?? DEFAULTS.autoSaveIntervalSeconds,
        draftExpiryMinutes: draftExpiryMinutes ?? DEFAULTS.draftExpiryMinutes,
      });
    } else {
      await settings.update({
        siteName: siteName !== undefined ? siteName : settings.siteName,
        siteTitle: siteTitle !== undefined ? siteTitle : settings.siteTitle,
        faviconUrl: faviconUrl !== undefined ? faviconUrl : settings.faviconUrl,
        logoUrl: logoUrl !== undefined ? logoUrl : settings.logoUrl,
        description: description !== undefined ? description : settings.description,
        allowRegistration:
          allowRegistration !== undefined ? allowRegistration : settings.allowRegistration,
        requireApproval: requireApproval !== undefined ? requireApproval : settings.requireApproval,
        maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : settings.maintenanceMode,
        maintenanceMessage:
          maintenanceMessage !== undefined ? maintenanceMessage : settings.maintenanceMessage,
        loginMessage: loginMessage !== undefined ? loginMessage : settings.loginMessage,
        maxLoginAttempts:
          maxLoginAttempts !== undefined ? maxLoginAttempts : settings.maxLoginAttempts,
        accountLockMinutes:
          accountLockMinutes !== undefined ? accountLockMinutes : settings.accountLockMinutes,
        maxFileCount: maxFileCount !== undefined ? maxFileCount : settings.maxFileCount,
        maxFileSizeMb: maxFileSizeMb !== undefined ? maxFileSizeMb : settings.maxFileSizeMb,
        maxImageSizeMb: maxImageSizeMb !== undefined ? maxImageSizeMb : settings.maxImageSizeMb,
        maxAvatarSizeMb: maxAvatarSizeMb !== undefined ? maxAvatarSizeMb : settings.maxAvatarSizeMb,
        maxArchiveSizeMb:
          maxArchiveSizeMb !== undefined ? maxArchiveSizeMb : settings.maxArchiveSizeMb,
        maxImageCount: maxImageCount !== undefined ? maxImageCount : settings.maxImageCount,
        bcryptRounds: bcryptRounds !== undefined ? bcryptRounds : settings.bcryptRounds,
        allowedImageExtensions:
          parsedAllowedImage !== undefined
            ? JSON.stringify(parsedAllowedImage)
            : settings.allowedImageExtensions,
        allowedDocumentExtensions:
          parsedAllowedDocument !== undefined
            ? JSON.stringify(parsedAllowedDocument)
            : settings.allowedDocumentExtensions,
        allowedArchiveExtensions:
          parsedAllowedArchive !== undefined
            ? JSON.stringify(parsedAllowedArchive)
            : settings.allowedArchiveExtensions,
        allowedMediaExtensions:
          parsedAllowedMedia !== undefined
            ? JSON.stringify(parsedAllowedMedia)
            : settings.allowedMediaExtensions,
        defaultPageSize: defaultPageSize !== undefined ? defaultPageSize : settings.defaultPageSize,
        securityLogRetentionDays:
          securityLogRetentionDays !== undefined
            ? securityLogRetentionDays
            : settings.securityLogRetentionDays,
        errorLogRetentionDays:
          errorLogRetentionDays !== undefined
            ? errorLogRetentionDays
            : settings.errorLogRetentionDays,
        jwtAccessTokenHours:
          jwtAccessTokenHours !== undefined ? jwtAccessTokenHours : settings.jwtAccessTokenHours,
        jwtRefreshTokenDays:
          jwtRefreshTokenDays !== undefined ? jwtRefreshTokenDays : settings.jwtRefreshTokenDays,
        postTitleMaxLength:
          postTitleMaxLength !== undefined ? postTitleMaxLength : settings.postTitleMaxLength,
        postContentMaxLength:
          postContentMaxLength !== undefined ? postContentMaxLength : settings.postContentMaxLength,
        postSecretPasswordMinLength:
          postSecretPasswordMinLength !== undefined
            ? postSecretPasswordMinLength
            : settings.postSecretPasswordMinLength,
        globalSearchLimit:
          globalSearchLimit !== undefined ? globalSearchLimit : settings.globalSearchLimit,
        allowGuestComment:
          allowGuestComment !== undefined ? allowGuestComment : settings.allowGuestComment,
        minPasswordLength:
          minPasswordLength !== undefined ? minPasswordLength : settings.minPasswordLength,
        commentMaxDepth: commentMaxDepth !== undefined ? commentMaxDepth : settings.commentMaxDepth,
        commentMaxCount: commentMaxCount !== undefined ? commentMaxCount : settings.commentMaxCount,
        avatarSizePx: avatarSizePx !== undefined ? avatarSizePx : settings.avatarSizePx,
        avatarQuality: avatarQuality !== undefined ? avatarQuality : settings.avatarQuality,
        passwordResetTokenHours:
          passwordResetTokenHours !== undefined
            ? passwordResetTokenHours
            : settings.passwordResetTokenHours,
        rateLimitApiMax: rateLimitApiMax !== undefined ? rateLimitApiMax : settings.rateLimitApiMax,
        rateLimitAuthMax:
          rateLimitAuthMax !== undefined ? rateLimitAuthMax : settings.rateLimitAuthMax,
        rateLimitUploadMax:
          rateLimitUploadMax !== undefined ? rateLimitUploadMax : settings.rateLimitUploadMax,
        rateLimitDownloadMax:
          rateLimitDownloadMax !== undefined ? rateLimitDownloadMax : settings.rateLimitDownloadMax,
        autoSaveIntervalSeconds:
          autoSaveIntervalSeconds !== undefined
            ? autoSaveIntervalSeconds
            : settings.autoSaveIntervalSeconds,
        draftExpiryMinutes:
          draftExpiryMinutes !== undefined ? draftExpiryMinutes : settings.draftExpiryMinutes,
      });
    }

    // ── 캐시 갱신 ─────────────────────────────────────────────────────────────
    refreshMaintenanceCache();
    await refreshSettingsCache();
    // 파일 크기·허용 확장자·이미지 개수가 변경될 수 있으므로 multer 인스턴스 재빌드
    refreshUploaders();

    logInfo('사이트 설정 업데이트', { siteName: settings.siteName });
    sendSuccess(res, toPayload(settings), '사이트 설정이 업데이트되었습니다.');
  } catch (error) {
    logError('사이트 설정 업데이트 실패', error);
    sendError(res, 500, '사이트 설정 업데이트에 실패했습니다.');
  }
};

/** POST /api/site-settings/upload-asset — admin only, multer applied in route */
export const uploadSiteAsset = async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return sendError(res, 400, '파일을 선택해주세요.');
  }
  const assetUrl = `/uploads/images/${req.file.filename}`;
  sendSuccess(res, { url: assetUrl }, '파일이 업로드되었습니다.');
};
