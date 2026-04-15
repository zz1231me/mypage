// server/src/middlewares/upload/avatar.ts
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { UPLOAD_DIRS, getDynamicAllowedExtensions, getDynamicSizeLimits } from './config';
import { validateFilename, deleteFile } from './utils';
import { logInfo, logError } from '../../utils/logger';
import { getAvatarSettings } from '../../utils/settingsCache';

/**
 * 아바타 필터 함수 — 허용 확장자·크기는 런타임에 settingsCache에서 읽음
 */
function avatarFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  try {
    // 파일명 검증
    if (!validateFilename(file.originalname)) {
      return cb(new Error('허용되지 않는 파일명입니다.'));
    }

    // MIME 타입 검사
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('지원하지 않는 파일 형식입니다. (JPEG, PNG, WebP, GIF만 허용)'));
    }

    // 파일 확장자 검사 (관리자 설정 반영)
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!getDynamicAllowedExtensions().IMAGE.includes(fileExtension)) {
      return cb(new Error('지원하지 않는 파일 확장자입니다.'));
    }

    cb(null, true);
  } catch (error) {
    logError('아바타 필터 오류', error);
    cb(new Error('아바타 검증 중 오류가 발생했습니다.'));
  }
}

/**
 * 아바타 업로드 Multer 인스턴스 빌더
 * — fileSize는 호출 시점의 settingsCache 값을 사용
 */
function buildAvatarUploader(): multer.Multer {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: avatarFilter,
    limits: {
      fileSize: getDynamicSizeLimits().AVATAR,
      files: 1,
    },
  });
}

// ─── 캐시된 인스턴스 (설정 변경 시 refreshAvatarUploader()로 재빌드) ────────────

let _avatarUploader: multer.Multer = buildAvatarUploader();

export function refreshAvatarUploader(): void {
  _avatarUploader = buildAvatarUploader();
}

/**
 * 아바타 업로드 multer 인스턴스
 *
 * Proxy를 통해 항상 최신 _avatarUploader에 위임합니다.
 */
export const uploadAvatar: multer.Multer = new Proxy({} as multer.Multer, {
  get(_target, prop: string | symbol) {
    const target = _avatarUploader as unknown as Record<string | symbol, unknown>;
    const val = target[prop];
    return typeof val === 'function'
      ? (val as (...args: unknown[]) => unknown).bind(_avatarUploader)
      : val;
  },
});

/**
 * 아바타 이미지 처리 (Sharp 사용)
 */
export async function processAvatar(buffer: Buffer, userId: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const unique = randomUUID().replace(/-/g, '').substring(0, 12);
    const filename = `avatar_${userId}_${timestamp}_${unique}.jpg`;
    const filepath = path.join(UPLOAD_DIRS.AVATARS, filename);

    const { sizePx, quality } = getAvatarSettings();
    await sharp(buffer)
      .resize(sizePx, sizePx, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
      })
      .toFile(filepath);

    const relativePath = `/uploads/avatars/${filename}`;
    logInfo('아바타 처리 완료', { relativePath });

    return relativePath;
  } catch (error) {
    logError('아바타 이미지 처리 실패', error);
    throw new Error('이미지 처리 중 오류가 발생했습니다.');
  }
}

/**
 * 기존 아바타 파일 삭제
 */
export async function deleteAvatarFile(avatarUrl: string): Promise<void> {
  try {
    if (!avatarUrl || avatarUrl.startsWith('http')) {
      return; // 외부 URL이면 삭제하지 않음
    }

    // '/uploads/avatars/filename.jpg' → 'filename.jpg'
    const filename = path.basename(avatarUrl);

    // avatar_로 시작하는 파일만 삭제 (보안)
    if (!filename.startsWith('avatar_')) {
      logInfo('아바타 파일이 아님, 삭제 건너뜀', { filename });
      return;
    }

    const filepath = path.join(UPLOAD_DIRS.AVATARS, filename);
    await deleteFile(filepath);
  } catch (error) {
    logError('아바타 파일 삭제 실패', error);
    // 파일 삭제 실패는 전체 프로세스를 중단하지 않음
  }
}
