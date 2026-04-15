// server/src/middlewares/upload/utils.ts
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { BLOCKED_EXTENSIONS, UPLOAD_DIRS, getDynamicAllAllowedExtensions } from './config';
import { logInfo } from '../../utils/logger';

/**
 * 안전한 파일명 생성 (확장자 포함)
 */
export function generateSecureFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(6).toString('hex'); // 12자

  return `${timestamp}_${randomBytes}${ext}`;
}

/**
 * 파일 확장자 검증
 */
export function validateExtension(filename: string): {
  isValid: boolean;
  extension: string;
  error?: string;
} {
  const ext = path.extname(filename).toLowerCase();

  // 확장자 없음
  if (!ext) {
    return {
      isValid: false,
      extension: '',
      error: '확장자가 없는 파일은 업로드할 수 없습니다.',
    };
  }

  // 위험한 확장자 (항상 차단 — DB 설정으로 변경 불가)
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      extension: ext,
      error: `보안상 위험한 파일 형식입니다: ${ext}`,
    };
  }

  // 허용되지 않은 확장자 (관리자 설정 반영)
  if (!getDynamicAllAllowedExtensions().includes(ext)) {
    return {
      isValid: false,
      extension: ext,
      error: `지원하지 않는 파일 형식입니다: ${ext}`,
    };
  }

  return { isValid: true, extension: ext };
}

/**
 * MIME 타입 검증
 */
export function validateMimeType(
  mimetype: string,
  extension: string,
  mimeMap: { [key: string]: string[] }
): boolean {
  const expectedExts = mimeMap[mimetype];
  if (!expectedExts) {
    return true; // 매핑에 없으면 통과
  }
  return expectedExts.includes(extension);
}

/**
 * 파일명 특수문자 검증
 */
export function validateFilename(filename: string): boolean {
  // 경로 조작 시도 차단
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }

  // 특수문자 차단
  if (/[<>:"|?*]/.test(filename)) {
    return false;
  }

  // 길이 제한
  if (filename.length > 255) {
    return false;
  }

  return true;
}

/**
 * 업로드 디렉토리 생성
 */
export async function ensureUploadDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    logInfo('업로드 디렉토리 생성', { dir });
  }
}

/**
 * 모든 업로드 디렉토리 초기화
 */
export async function initializeUploadDirs(): Promise<void> {
  await Promise.all([
    ensureUploadDir(UPLOAD_DIRS.BASE),
    ensureUploadDir(UPLOAD_DIRS.FILES),
    ensureUploadDir(UPLOAD_DIRS.IMAGES),
    ensureUploadDir(UPLOAD_DIRS.AVATARS),
  ]);
}

/**
 * 파일 삭제
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    logInfo('파일 삭제', { filePath });
    return true;
  } catch {
    logInfo('삭제할 파일 없음', { filePath });
    return false;
  }
}
