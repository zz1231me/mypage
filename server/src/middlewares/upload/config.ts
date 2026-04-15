// server/src/middlewares/upload/config.ts
import path from 'path';
import {
  getFileSizeLimits,
  getMaxImageCount,
  getAllowedExtensions,
  getAllAllowedExtensions,
  BLOCKED_EXTENSIONS_FLOOR,
} from '../../utils/settingsCache';

/**
 * 업로드 설정 상수 / 동적 게터
 *
 * ⚠️  허용 확장자 · 파일 크기 · 이미지 개수는 관리자 설정(settingsCache)에서 동적으로 읽습니다.
 *     아래 정적 상수는 settingsCache 로드 전 또는 테스트 환경의 폴백으로만 사용됩니다.
 */

// ─── 정적 폴백 상수 (settingsCache 로드 전 사용) ────────────────────────────────

/** 항상 차단되는 확장자 (DB 설정으로 변경 불가) */
export const BLOCKED_EXTENSIONS = BLOCKED_EXTENSIONS_FLOOR;

// ─── 동적 게터 (런타임에 settingsCache에서 읽음) ──────────────────────────────

/** 현재 허용 확장자 (관리자 설정 반영) */
export function getDynamicAllowedExtensions() {
  return getAllowedExtensions();
}

/** 현재 전체 허용 확장자 flat 배열 (관리자 설정 반영) */
export function getDynamicAllAllowedExtensions(): string[] {
  return getAllAllowedExtensions();
}

/** 현재 파일 크기 제한 (바이트, 관리자 설정 반영) */
export function getDynamicSizeLimits() {
  return getFileSizeLimits();
}

/** 현재 이미지 업로드 최대 개수 (관리자 설정 반영) */
export function getDynamicMaxImageCount(): number {
  return getMaxImageCount();
}

// ─── MIME 타입 매핑 (정적 — MIME은 확장자와 1:1 매핑이므로 변경 필요 없음) ────

export const MIME_TYPE_MAP: { [key: string]: string[] } = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/bmp': ['.bmp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  'audio/mpeg': ['.mp3'],
  'video/mp4': ['.mp4'],
};

// Magic Numbers (파일 실제 타입 검증)
// docx/xlsx/pptx는 zip 기반이라 동일한 PK 헤더를 가짐
export const MAGIC_NUMBERS: { [key: string]: Buffer[] } = {
  // 이미지
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF
  'image/bmp': [Buffer.from([0x42, 0x4d])], // BM
  // 문서
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  'application/msword': [
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), // OLE2 컨테이너 (doc)
  ],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK (zip/docx)
  ],
  'application/vnd.ms-excel': [
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), // OLE2 (xls)
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK (xlsx)
  ],
  'application/vnd.ms-powerpoint': [
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), // OLE2 (ppt)
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK (pptx)
  ],
  // 압축
  'application/zip': [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // PK
  'application/x-7z-compressed': [Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])], // 7z
  // 미디어
  'audio/mpeg': [
    Buffer.from([0x49, 0x44, 0x33]), // ID3
    Buffer.from([0xff, 0xfb]), // MP3 frame sync
    Buffer.from([0xff, 0xf3]),
    Buffer.from([0xff, 0xf2]),
  ],
  'video/mp4': [
    Buffer.from([0x66, 0x74, 0x79, 0x70]), // ftyp (at offset 4, checked below)
  ],
  'text/plain': [], // 텍스트는 magic number로 검증 불가 — 확장자/MIME 일치로만 검증
  'text/csv': [],
};

// 업로드 디렉토리
export const UPLOAD_DIRS = {
  BASE: path.join(__dirname, '../../../uploads'),
  FILES: path.join(__dirname, '../../../uploads/files'),
  IMAGES: path.join(__dirname, '../../../uploads/images'),
  AVATARS: path.join(__dirname, '../../../uploads/avatars'),
};
