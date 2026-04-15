// client/src/constants/config.ts
// 이 파일의 내용은 client/src/config/constants.ts 로 통합되었습니다.
// 기존 import 경로 호환성을 위해 re-export를 유지합니다.
export * from '../config/constants';

// 하위 호환 flat 상수 (기존 코드에서 직접 사용하던 이름)
// MAX_PAGE_SIZE는 API_CONFIG.MAX_PAGE_SIZE(50)와 동일하게 유지
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
export const API_TIMEOUT_MS = 30_000;
export const TOKEN_REFRESH_INTERVAL_MS = 14 * 60 * 1000;
export const ERROR_DISPLAY_MS = 5_000;
export const SUCCESS_DISPLAY_MS = 3_000;
export const MAX_FILE_COUNT = 5; // 서버 COUNT_LIMITS.FILES = 5
export const MAX_FILE_SIZE_MB = 100; // 서버 SIZE_LIMITS.DOCUMENT = 100MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
