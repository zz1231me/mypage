// server/src/controllers/post.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendForbidden,
  sendValidationError,
} from '../utils/response';
import { logInfo, logError, logSuccess } from '../utils/logger';
import { postService } from '../services/post.service';
import { securityLogService } from '../services/securityLog.service';
import { renderTiptapToHTML } from '../utils/tiptapRenderer';
import { parsePagination } from '../utils/pagination';
import { AppError } from '../middlewares/error.middleware';

interface PostLike {
  id: string;
  title: string;
  content: string;
  author: string;
  UserId: string;
  boardType: string;
  viewCount: number;
  isSecret: boolean;
  secretType: string | null;
  isEncrypted: boolean;
  secretSalt: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; name: string; avatar: string | null } | null;
}

// 게시글 데이터를 응답 형식으로 변환하는 헬퍼
function formatPostResponse(
  post: PostLike,
  user: PostLike['user'],
  attachments: unknown[],
  htmlContent: string
) {
  return {
    id: post.id,
    title: post.title,
    content: htmlContent,
    rawContent: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.user?.name || post.author || 'Unknown',
    UserId: post.UserId,
    boardType: post.boardType,
    viewCount: post.viewCount || 0,
    isSecret: post.isSecret || false,
    secretType: post.secretType || null,
    isEncrypted: post.isEncrypted || false,
    secretSalt: post.secretSalt || null,
    attachments,
    user,
  };
}

function toAppError(err: unknown): AppError | null {
  return err instanceof AppError ? err : null;
}

// ✅ 글로벌 검색
export const globalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  const searchTerm = (req.query.q?.toString() ?? '').trim();
  const { id: userId, role: userRole } = req.user;

  try {
    const result = await postService.globalSearch({ userId, userRole, searchTerm });
    logInfo('글로벌 검색 완료', { userId, searchTerm, count: result.count });
    sendSuccess(res, result);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 400) {
      return sendValidationError(res, 'q', appErr.message);
    }
    logError('글로벌 검색 실패', err, { userId, searchTerm });
    sendError(res, 500, '검색 중 오류가 발생했습니다.');
  }
};

// ✅ 게시글 목록 조회
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  const boardType = req.params.boardType;
  const { page, limit } = parsePagination(req);
  const search = (req.query.search?.toString() ?? '').trim();
  const userId = req.user?.id;

  // 태그 필터: ?tags=1,2,3 형식으로 전달
  const rawTags = req.query.tags?.toString() ?? '';
  const tagIds = rawTags
    ? rawTags
        .split(',')
        .map(t => parseInt(t.trim(), 10))
        .filter(n => Number.isFinite(n) && n > 0)
    : undefined;

  try {
    const result = await postService.getPosts(boardType, page, limit, search, userId, tagIds);
    sendSuccess(res, result);
  } catch (err) {
    logError('게시글 목록 조회 실패', err, { boardType, page, limit });
    sendError(res, 500, '게시글 목록 조회 실패');
  }
};

// ✅ 게시글 상세 조회
export const getPostById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { boardType, id } = req.params;
  const userId = req.user?.id;

  try {
    const result = await postService.getPostById(id, userId);

    if (!result) {
      return sendNotFound(res, '게시글');
    }

    // 비밀글 잠금 상태
    if (result.isLocked) {
      if (result.boardType !== boardType) return sendNotFound(res, '게시글');
      sendSuccess(res, {
        isLocked: true,
        id: result.id,
        title: result.title,
        boardType: result.boardType,
        secretType: result.secretType,
        isEncrypted: result.isEncrypted,
        ...(result.isEncrypted && {
          ciphertext: result.ciphertext,
          secretSalt: result.secretSalt,
        }),
      });
      return;
    }

    if (result.post.boardType !== boardType) return sendNotFound(res, '게시글');

    let htmlContent = '';
    try {
      htmlContent = renderTiptapToHTML(result.post.content);
    } catch (error) {
      logError('JSON → HTML 변환 실패', error, { postId: id });
      htmlContent = '<p>콘텐츠를 표시할 수 없습니다.</p>';
    }

    sendSuccess(
      res,
      formatPostResponse(
        result.post as PostLike,
        result.postData.user,
        result.attachments,
        htmlContent
      )
    );
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 403) return sendForbidden(res, appErr.message);
    logError('게시글 조회 실패', err, { postId: id });
    sendError(res, 500, '게시글 조회 실패');
  }
};

// ✅ 비밀글 비밀번호 검증
export const verifySecretPost = async (req: AuthRequest, res: Response): Promise<void> => {
  const { boardType, id } = req.params;
  const { password } = req.body;
  const userId = req.user?.id;
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

  if (!password) {
    return sendValidationError(res, 'password', '비밀번호를 입력해주세요.');
  }

  try {
    const result = await postService.verifySecretPost(id, password);

    // ✅ 비밀글 인증 성공 보안 로그
    securityLogService
      .createLog({
        userId,
        ipAddress,
        action: 'SECRET_POST_ACCESS',
        method: 'POST',
        route: req.originalUrl,
        userAgent: req.headers['user-agent'],
        status: 'SUCCESS',
        details: { postId: id, boardType },
      })
      .catch(() => {});

    // E2EE 암호화 게시글은 HTML 변환 불필요 — 암호문 그대로 반환
    let htmlContent = '';
    if (result.post.isEncrypted) {
      htmlContent = result.post.content;
    } else {
      try {
        htmlContent = renderTiptapToHTML(result.post.content);
      } catch (_error) {
        htmlContent = '<p>콘텐츠를 표시할 수 없습니다.</p>';
      }
    }

    if (result.post.boardType !== boardType) return sendNotFound(res, '게시글');
    sendSuccess(
      res,
      formatPostResponse(
        result.post as PostLike,
        result.postData.user,
        result.attachments,
        htmlContent
      )
    );
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 404) return sendNotFound(res, '게시글');
    if (appErr?.statusCode === 401) {
      // ✅ 비밀번호 틀림 보안 로그
      securityLogService
        .createLog({
          userId,
          ipAddress,
          action: 'SECRET_POST_ACCESS',
          method: 'POST',
          route: req.originalUrl,
          userAgent: req.headers['user-agent'],
          status: 'FAILURE',
          details: { postId: id, boardType, reason: 'wrong_password' },
        })
        .catch(() => {});
      sendError(res, 401, appErr.message);
      return;
    }
    if (appErr?.statusCode === 400) {
      return sendValidationError(res, 'password', appErr.message);
    }
    logError('비밀글 검증 실패', err, { postId: id });
    sendError(res, 500, '비밀글 검증 실패');
  }
};

// ✅ 게시글 생성
export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    title,
    content,
    originalFilenames,
    isSecret,
    secretType,
    secretPassword,
    secretUserIds,
    isEncrypted,
    secretSalt,
  } = req.body;
  const boardType = req.params.boardType;
  const files = req.files as Express.Multer.File[];
  const { id: userId, name: userName } = req.user;

  try {
    const post = await postService.createPost({
      title,
      content,
      boardType,
      authorName: userName,
      userId,
      files,
      originalFilenames,
      isSecret: isSecret === true || isSecret === 'true',
      secretType,
      secretPassword,
      secretUserIds: Array.isArray(secretUserIds) ? secretUserIds : undefined,
      isEncrypted: isEncrypted === true || isEncrypted === 'true',
      secretSalt: typeof secretSalt === 'string' ? secretSalt : undefined,
    });

    logSuccess('게시글 생성 완료', { userId, postId: post.id, boardType });
    sendSuccess(res, post, '게시글이 생성되었습니다.', 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 400) {
      return sendValidationError(res, 'content', appErr.message);
    }
    logError('게시글 생성 실패', err, { userId, boardType });
    sendError(res, 500, '게시글 생성 실패');
  }
};

// ✅ 게시글 수정
// 주의: boardAccess 미들웨어(checkWriteAccess)가 이미 게시판 쓰기 권한을 확인함
export const updatePost = async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;
  const files = req.files as Express.Multer.File[];
  const { id } = req.params;
  const { id: userId, role: userRole } = req.user;

  try {
    const updatedPost = await postService.updatePost({
      postId: id,
      title: body.title,
      content: body.content,
      userId,
      userRole,
      files,
      keepExistingFiles: body.keepExistingFiles,
      originalFilenames: body.originalFilenames,
      deletedFileNames: body.deletedFileNames,
      isSecret:
        body.isSecret === true || body.isSecret === 'true'
          ? true
          : body.isSecret === false || body.isSecret === 'false'
            ? false
            : undefined,
      secretType: body.secretType,
      secretPassword: body.secretPassword,
      secretUserIds: Array.isArray(body.secretUserIds) ? body.secretUserIds : undefined,
      isEncrypted: body.isEncrypted === true || body.isEncrypted === 'true',
      secretSalt: typeof body.secretSalt === 'string' ? body.secretSalt : undefined,
      version: body.version !== undefined ? Number(body.version) : undefined,
    });

    logSuccess('게시글 수정 완료', { userId, postId: id });
    sendSuccess(res, updatedPost, '게시글이 수정되었습니다.');
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 404) return sendNotFound(res, '게시글');
    if (appErr?.statusCode === 403) return sendForbidden(res, appErr.message);
    if (appErr?.statusCode === 409) {
      sendError(res, 409, appErr.message);
      return;
    }
    if (appErr?.statusCode === 400) return sendValidationError(res, 'content', appErr.message);
    logError('게시글 수정 실패', err, { userId, postId: id });
    sendError(res, 500, '게시글 수정 실패');
  }
};

// ✅ 게시글 삭제
// 주의: boardAccess 미들웨어(checkDeleteAccess)가 이미 게시판 삭제 권한을 확인함
export const deletePost = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { id: userId, role: userRole } = req.user;

  try {
    await postService.deletePost(id, userId, userRole);
    logSuccess('게시글 삭제 완료', { userId, postId: id });
    sendSuccess(res, null, '게시글이 삭제되었습니다.');
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 404) return sendNotFound(res, '게시글');
    if (appErr?.statusCode === 403) return sendForbidden(res, appErr.message);
    logError('게시글 삭제 실패', err, { userId, postId: id });
    sendError(res, 500, '게시글 삭제 실패');
  }
};

// ✅ 게시글 고정/해제 (admin 또는 해당 게시판 담당자)
export const togglePin = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: postId } = req.params;
  const { id: userId, role: userRole } = req.user;

  try {
    const result = await postService.togglePin(postId, userId, userRole);
    sendSuccess(res, result);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr?.statusCode === 404) return sendNotFound(res, '게시글');
    if (appErr?.statusCode === 403) return sendForbidden(res, appErr.message);
    logError('게시글 고정 실패', err);
    sendError(res, 500, '게시글 고정 처리 중 오류가 발생했습니다.');
  }
};
