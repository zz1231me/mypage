// server/src/config/constants.ts - 앱 전역 상수

// ✅ 사용자 역할 상수 (매직 스트링 방지)
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

/** admin 또는 manager 역할인지 확인 */
export const isAdminOrManager = (role: string): boolean =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;

// ✅ JWT 토큰 만료 시간
export const ACCESS_TOKEN_HOURS = 2; // 2시간
export const REFRESH_TOKEN_DAYS = 3; // 3일

// ✅ 비밀번호 해싱
export const BCRYPT_ROUNDS = 10;

// ✅ 계정 보안
export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_MINUTES = 30;

// ✅ 예약된 게시판 ID (시스템 경로와 충돌 방지)
export const RESERVED_BOARD_IDS = [
  'admin',
  'api',
  'auth',
  'uploads',
  'static',
  'public',
  'login',
  'logout',
  'register',
  'dashboard',
  'settings',
  'health',
  'metrics',
  'status',
  'ws',
  'socket',
];

// ✅ 페이지네이션
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: DEFAULT_PAGE_SIZE,
  MAX_LIMIT: MAX_PAGE_SIZE,
} as const;

// ✅ 파일 업로드 (실제 제한은 관리자 설정에서 동적으로 읽음 — settingsCache 참고)
export const MAX_FILE_COUNT = 5;
export const MAX_FILE_SIZE_MB = 100;

// ✅ 게시글 제한 — 실제 제한은 관리자 설정(settingsCache)에서 동적으로 읽음
// 여기 값은 DB 로드 전 fallback 및 Zod 스키마 상한선으로만 사용
export const POST_TITLE_MAX_LENGTH = 200; // settingsCache DEFAULTS.postTitleMaxLength 와 동일
export const POST_CONTENT_MAX_LENGTH = 500000; // settingsCache DEFAULTS.postContentMaxLength 와 동일
export const POST_SECRET_PASSWORD_MIN_LENGTH = 4; // 최소 4자
export const POST_MAX_PAGE = 1000;

// ✅ Rate Limiting 창 및 최대 요청 수 (ms)
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15분
  API_MAX: 200,
  AUTH_MAX_PROD: 10,
  AUTH_MAX_DEV: 50,
  ADMIN_MAX: 100,
  UPLOAD_WINDOW_MS: 60 * 60 * 1000, // 1시간
  UPLOAD_MAX: 20,
  SECRET_POST_WINDOW_MS: 5 * 60 * 1000, // 5분
  SECRET_POST_MAX: 5,
  DOWNLOAD_WINDOW_MS: 60 * 60 * 1000, // 1시간
  DOWNLOAD_MAX: 100,
} as const;

// ✅ Cache TTL (초)
export const CACHE_TTL = {
  DEFAULT: 300, // 5분
  SITE_SETTINGS: 600, // 10분
  BOARDS: 300, // 5분
  USERS: 180, // 3분
} as const;

// ✅ Cache 만료 체크 주기 (초)
export const CACHE_CHECK_PERIOD = 60;

// ✅ Log 보존 기간 기본값 (일)
export const LOG_RETENTION_DAYS = {
  SECURITY: 90,
  ERROR: 30,
} as const;

// ✅ 로그 자동 정리 주기: 24시간 (ms)
export const LOG_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// ✅ JWT 알고리즘
export const JWT_ALGORITHM = 'HS256' as const;

// ✅ 요청 바디 크기 제한
export const REQUEST_BODY_LIMIT = '10mb' as const;
