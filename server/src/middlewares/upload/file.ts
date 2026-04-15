// server/src/middlewares/upload/file.ts
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { Request } from 'express';
import {
  UPLOAD_DIRS,
  BLOCKED_EXTENSIONS,
  MIME_TYPE_MAP,
  getDynamicAllAllowedExtensions,
  getDynamicSizeLimits,
} from './config';
import { validateFilename } from './utils';
import { logInfo, logError } from '../../utils/logger';
import { getSettings } from '../../utils/settingsCache';

/**
 * 일반 파일 업로드 Storage 설정
 */
const fileStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOAD_DIRS.FILES);
  },
  filename: function (_req, file, cb) {
    try {
      // ✅ 확장자 변경: 원본 확장자를 제거하고 순수 랜덤 ID만 사용 (실행 방지)
      const timestamp = Date.now();
      const randomBytes = crypto.randomBytes(8).toString('hex');
      const secureFilename = `${timestamp}_${randomBytes}`; // 확장자 없음!

      logInfo('파일 저장 (확장자 제거)', { original: file.originalname, secure: secureFilename });

      cb(null, secureFilename);
    } catch (error) {
      logError('파일명 생성 오류', error);
      cb(new Error('파일 저장 중 오류가 발생했습니다.'), '');
    }
  },
});

/**
 * 파일 필터 함수 — 크기·허용 확장자는 런타임에 settingsCache에서 읽음
 */
function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  try {
    // 파일명 검증 (경로 조작 등)
    if (!validateFilename(file.originalname)) {
      return cb(new Error('허용되지 않는 파일명입니다.'));
    }

    // 파일 크기 사전 체크 (관리자 설정 반영)
    const docLimit = getDynamicSizeLimits().DOCUMENT;
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > docLimit) {
      return cb(
        new Error(`파일 크기가 너무 큽니다. 최대 ${docLimit / 1024 / 1024}MB까지 가능합니다.`)
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();

    // ✅ 절대 차단 확장자 (DB 설정으로 변경 불가)
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`보안상 위험한 파일 형식입니다: ${ext}`));
    }

    // ✅ 확장자 화이트리스트 검사 (관리자 설정 반영)
    if (!ext || !getDynamicAllAllowedExtensions().includes(ext)) {
      return cb(new Error(`허용되지 않는 파일 형식입니다. (${ext || '확장자 없음'})`));
    }

    // ✅ MIME 타입 ↔ 확장자 일치 검사 (MIME_TYPE_MAP에 있는 타입만)
    const expectedExts = MIME_TYPE_MAP[file.mimetype];
    if (expectedExts !== undefined && !expectedExts.includes(ext)) {
      return cb(new Error(`파일 확장자와 내용이 일치하지 않습니다. (${file.mimetype} → ${ext})`));
    }

    logInfo('파일 업로드 허용', { originalname: file.originalname });
    cb(null, true);
  } catch (error) {
    logError('파일 필터 오류', error);
    cb(new Error('파일 검증 중 오류가 발생했습니다.'));
  }
}

/**
 * 파일 업로드 Multer 인스턴스 빌더
 * — fileSize·files는 호출 시점의 settingsCache 값을 사용
 */
function buildFileUploader(): multer.Multer {
  const limits = getDynamicSizeLimits();
  const maxFileCount = getSettings().maxFileCount;
  return multer({
    storage: fileStorage,
    fileFilter,
    limits: {
      fileSize: limits.DOCUMENT,
      files: maxFileCount,
      fields: 10,
      fieldNameSize: 100,
      fieldSize: 1024 * 1024, // 1MB
      headerPairs: 20,
    },
  });
}

// ─── 캐시된 인스턴스 (설정 변경 시 refreshFileUploader()로 재빌드) ─────────────

let _fileUploader: multer.Multer = buildFileUploader();

export function refreshFileUploader(): void {
  _fileUploader = buildFileUploader();
}

/**
 * 파일 업로드 multer 인스턴스
 *
 * Proxy를 통해 항상 최신 _fileUploader에 위임하므로
 * routes는 기존 방식(uploadFiles.array('files', 5))을 그대로 사용할 수 있습니다.
 */
export const uploadFiles: multer.Multer = new Proxy({} as multer.Multer, {
  get(_target, prop: string | symbol) {
    const target = _fileUploader as unknown as Record<string | symbol, unknown>;
    const val = target[prop];
    return typeof val === 'function'
      ? (val as (...args: unknown[]) => unknown).bind(_fileUploader)
      : val;
  },
});
