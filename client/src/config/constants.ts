// client/src/config/constants.ts
/**
 * 마이홈 프로젝트 전역 상수 정의
 * 매직 넘버와 설정값을 중앙에서 관리
 */

/**
 * 파일 업로드 관련 설정
 */
export const FILE_UPLOAD = {
  /** 최대 업로드 가능 파일 개수 (서버 COUNT_LIMITS.FILES = 5와 동일) */
  MAX_FILES: 5,

  /** 최대 파일 크기 (100MB, 서버 SIZE_LIMITS.DOCUMENT = 100MB와 동일) */
  MAX_SIZE: 100 * 1024 * 1024,

  /** 허용된 파일 확장자 */
  ALLOWED_EXTENSIONS: [
    // 이미지
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
    // 문서
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.hwp',
    '.ppt',
    '.pptx',
    '.xls',
    '.xlsx',
    // 압축파일
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.bz2',
    // 동영상
    '.mp4',
    '.avi',
    '.mov',
    '.wmv',
    '.flv',
    '.mkv',
    // 오디오
    '.mp3',
    '.wav',
    '.flac',
    '.aac',
    '.ogg',
  ],

  /** 파일 크기 표시 단위 */
  SIZE_UNITS: ['Bytes', 'KB', 'MB', 'GB'] as const,
} as const;

/**
 * UI 타이밍 관련 설정
 */
export const UI_TIMING = {
  /** 검색 입력 디바운스 지연 (ms) */
  DEBOUNCE_DELAY: 500,

  /** Toast 알림 표시 시간 (ms) */
  TOAST_DURATION: 5000,

  /** 성공 후 리다이렉트 지연 (ms) */
  REDIRECT_DELAY: 2000,

  /** 자동 로그아웃 경고 시간 (ms) */
  LOGOUT_WARNING: 5 * 60 * 1000, // 5분

  /** 애니메이션 지속 시간 (ms) */
  ANIMATION_DURATION: 300,
} as const;

/**
 * API 관련 설정
 */
export const API_CONFIG = {
  /** API 베이스 URL - 올바른 포트 4000 사용 */
  // ⚠️ VITE_API_URL 절대 경로 사용 시 CORS/쿠키 문제 주의 (dev 환경에선 /api 상대경로 권장)
  BASE_URL: import.meta.env.VITE_API_URL || '/api',

  /** API 캐시 TTL (초) */
  CACHE_TTL: 600,

  /** API 재시도 횟수 */
  RETRY_COUNT: 3,

  /** API 타임아웃 (ms) */
  TIMEOUT: 30000,

  /** 페이지네이션 기본 limit */
  DEFAULT_PAGE_SIZE: 10,

  /** 최대 페이지 크기 */
  MAX_PAGE_SIZE: 50,
} as const;

/**
 * 폼 검증 관련 설정
 */
export const VALIDATION = {
  /** 게시글 제목 최대 길이 (서버 POST_TITLE_MAX_LENGTH = 200과 동일) */
  POST_TITLE_MAX_LENGTH: 200,

  /** 게시글 제목 최소 길이 */
  POST_TITLE_MIN_LENGTH: 2,

  /** 댓글 최대 길이 */
  COMMENT_MAX_LENGTH: 1000,

  /** 댓글 최소 길이 */
  COMMENT_MIN_LENGTH: 1,

  /** 비밀번호 최소 길이 (관리자 설정 minPasswordLength 기본값과 동일) */
  PASSWORD_MIN_LENGTH: 8,

  /** 비밀번호 최대 길이 */
  PASSWORD_MAX_LENGTH: 50,

  /** 사용자 이름 최소 길이 */
  USERNAME_MIN_LENGTH: 2,

  /** 사용자 이름 최대 길이 */
  USERNAME_MAX_LENGTH: 20,
} as const;

/**
 * 로컬 스토리지 키
 */
export const STORAGE_KEYS = {
  /** 사용자 정보 */
  USER_INFO: 'myhome_user_info',

  /** 사이트 설정 */
  SITE_SETTINGS: 'myhome_site_settings',

  /** 테마 설정 */
  THEME: 'myhome_theme',

  /** 언어 설정 */
  LANGUAGE: 'myhome_language',
} as const;

/**
 * 라우트 경로
 */
export const ROUTES = {
  /** 홈 */
  HOME: '/',

  /** 로그인 */
  LOGIN: '/login',

  /** 대시보드 */
  DASHBOARD: '/dashboard',

  /** 캘린더 */
  CALENDAR: '/dashboard/calendar',

  /** 게시판 목록 */
  BOARD: (boardType: string) => `/dashboard/posts/${boardType}`,

  /** 게시글 상세 */
  POST_DETAIL: (boardType: string, id: string) => `/dashboard/posts/${boardType}/${id}`,

  /** 게시글 작성 */
  POST_CREATE: (boardType: string) => `/dashboard/posts/${boardType}/new`,

  /** 게시글 수정 */
  POST_EDIT: (boardType: string, id: string) => `/dashboard/posts/${boardType}/${id}/edit`,

  /** 관리자 페이지 */
  ADMIN: '/admin',

  // 관리자 하위 페이지
  SITE_SETTINGS: '/admin/site-settings', // (Note: These might need verifying if routing supports them nested or via params)

  // 북마크 관리
  BOOKMARKS: '/admin/bookmarks',

  /** 비밀번호 변경 */
  CHANGE_PASSWORD: '/dashboard/change-password',

  /** 권한 없음 */
  UNAUTHORIZED: '/unauthorized',

  /** 404 */
  NOT_FOUND: '/404',
} as const;

/**
 * HTTP 상태 코드
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * 게시판 타입
 */
export const BOARD_TYPES = {
  NOTICE: 'notice',
  GENERAL: 'general',
  FREE: 'free',
  ADMIN: 'admin',
} as const;

/**
 * 사용자 역할 (서버 ROLES 상수와 동일하게 유지)
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest',
} as const;

/**
 * 날짜 포맷
 */
export const DATE_FORMATS = {
  /** 표준 날짜 형식 (YYYY-MM-DD) */
  DATE: 'YYYY-MM-DD',

  /** 날짜 + 시간 (YYYY-MM-DD HH:mm) */
  DATETIME: 'YYYY-MM-DD HH:mm',

  /** 시간만 (HH:mm) */
  TIME: 'HH:mm',

  /** 한국 형식 (YYYY년 MM월 DD일) */
  KOREAN_DATE: 'YYYY년 MM월 DD일',

  /** ISO 8601 */
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
} as const;

/**
 * 브레이크포인트 (Tailwind CSS 기준)
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

/**
 * Z-Index 레이어
 */
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  NOTIFICATION: 1080,
} as const;

/**
 * 토큰 및 표시 타이밍 (constants/config.ts에서 통합)
 */
export const TOKEN_TIMING = {
  /** 토큰 갱신 주기 (ms) - 14분 */
  REFRESH_INTERVAL_MS: 14 * 60 * 1000,

  /** 에러 메시지 자동 숨김 시간 (ms) */
  ERROR_DISPLAY_MS: 5_000,

  /** 성공 메시지 자동 숨김 시간 (ms) */
  SUCCESS_DISPLAY_MS: 3_000,
} as const;

/**
 * 허용된 이미지 MIME 타입 (constants/config.ts에서 통합)
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

/**
 * 색상 팔레트 (Toast UI Editor용)
 */
export const COLOR_PALETTE = [
  '#333333',
  '#666666',
  '#FFFFFF',
  '#EE2323',
  '#F89009',
  '#009A87',
  '#006DD7',
  '#8A3DB6',
  '#781B33',
  '#5733B1',
  '#953B34',
  '#FFC1C8',
  '#FFC9AF',
  '#9FEEC3',
  '#99CEFA',
  '#C1BEF9',
] as const;

/**
 * 기본 내보내기
 */
export default {
  FILE_UPLOAD,
  UI_TIMING,
  API_CONFIG,
  VALIDATION,
  STORAGE_KEYS,
  ROUTES,
  HTTP_STATUS,
  BOARD_TYPES,
  USER_ROLES,
  DATE_FORMATS,
  BREAKPOINTS,
  Z_INDEX,
  COLOR_PALETTE,
} as const;
