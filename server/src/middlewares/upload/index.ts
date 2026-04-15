/**
 * 통합 파일 업로드 미들웨어
 *
 * 기존 6개의 중복된 업로드 미들웨어를 통합
 */

export { uploadFiles, refreshFileUploader } from './file';
export { uploadImages, refreshImageUploader } from './image';
export {
  uploadAvatar as uploadAvatarMiddleware, // multer 인스턴스
  refreshAvatarUploader,
  processAvatar,
  deleteAvatarFile,
} from './avatar';
export { validateUploadedFile } from './validator';

/**
 * 관리자가 사이트 설정을 변경했을 때 모든 업로드 인스턴스를 재빌드합니다.
 * siteSettings 컨트롤러의 updateSiteSettings에서 호출합니다.
 */
export { refreshUploaders } from './refresh';
