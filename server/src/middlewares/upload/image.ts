// server/src/middlewares/upload/image.ts
import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { generateRandomId } from '../../utils/generateId';
import {
  UPLOAD_DIRS,
  getDynamicAllowedExtensions,
  getDynamicSizeLimits,
  getDynamicMaxImageCount,
} from './config';
import { validateFilename } from './utils';
import { logInfo, logError } from '../../utils/logger';

/**
 * 이미지 업로드 Storage 설정 (에디터용 - 랜덤 ID)
 */
const imageStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOAD_DIRS.IMAGES);
  },
  filename: function (_req, file, cb) {
    try {
      const ext = path.extname(file.originalname);
      const randomId = generateRandomId(12); // 대문자+숫자 12자리
      const filename = `${randomId}${ext}`;

      logInfo(`이미지 저장: ${file.originalname} → ${filename}`);
      cb(null, filename);
    } catch (error) {
      logError('이미지 파일명 생성 오류', error);
      cb(new Error('이미지 저장 중 오류가 발생했습니다.'), '');
    }
  },
});

/**
 * 이미지 필터 함수 — 허용 확장자는 런타임에 settingsCache에서 읽음
 */
function imageFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  try {
    // 파일명 검증
    if (!validateFilename(file.originalname)) {
      return cb(new Error('허용되지 않는 파일명입니다.'));
    }

    // 이미지 확장자만 허용 (관리자 설정 반영)
    const ext = path.extname(file.originalname).toLowerCase();
    if (!getDynamicAllowedExtensions().IMAGE.includes(ext)) {
      return cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }

    // 이미지 MIME 타입 검증
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('이미지 파일이 아닙니다.'));
    }

    logInfo(`이미지 업로드 허용: ${file.originalname}`);
    cb(null, true);
  } catch (error) {
    logError('이미지 필터 오류', error);
    cb(new Error('이미지 검증 중 오류가 발생했습니다.'));
  }
}

/**
 * 이미지 업로드 Multer 인스턴스 빌더
 * — fileSize·files는 호출 시점의 settingsCache 값을 사용
 */
function buildImageUploader(): multer.Multer {
  const limits = getDynamicSizeLimits();
  return multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: {
      fileSize: limits.IMAGE,
      files: getDynamicMaxImageCount(),
    },
  });
}

// ─── 캐시된 인스턴스 (설정 변경 시 refreshImageUploader()로 재빌드) ─────────────

let _imageUploader: multer.Multer = buildImageUploader();

export function refreshImageUploader(): void {
  _imageUploader = buildImageUploader();
}

/**
 * 이미지 업로드 multer 인스턴스
 *
 * Proxy를 통해 항상 최신 _imageUploader에 위임하므로
 * routes는 기존 방식(uploadImages.single('file'))을 그대로 사용할 수 있습니다.
 */
export const uploadImages: multer.Multer = new Proxy({} as multer.Multer, {
  get(_target, prop: string | symbol) {
    const target = _imageUploader as unknown as Record<string | symbol, unknown>;
    const val = target[prop];
    return typeof val === 'function'
      ? (val as (...args: unknown[]) => unknown).bind(_imageUploader)
      : val;
  },
});
