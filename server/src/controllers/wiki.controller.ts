import { Response } from 'express';
import { AuthRequest } from '../types/auth-request';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized } from '../utils/response';
import { logError } from '../utils/logger';
import { wikiService } from '../services/wiki.service';
import { AppError } from '../middlewares/error.middleware';
import { isAdminOrManager } from '../config/constants';

export const getPageHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const revisions = await wikiService.getPageHistory(req.params.slug);
    sendSuccess(res, revisions);
  } catch (err) {
    if (err instanceof AppError) return sendError(res, err.statusCode, err.message);
    logError('위키 수정 이력 조회 실패', err, { slug: req.params.slug });
    sendError(res, 500, '위키 수정 이력 조회 중 오류가 발생했습니다.');
  }
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const getPageTree = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const privileged = isAdminOrManager(req.user?.role ?? '');
    const pages = await wikiService.getPageTree(privileged);
    sendSuccess(res, pages);
  } catch (err) {
    if (err instanceof AppError) return sendError(res, err.statusCode, err.message);
    logError('위키 페이지 목록 조회 실패', err);
    sendError(res, 500, '위키 페이지 목록 조회 중 오류가 발생했습니다.');
  }
};

export const getPageBySlug = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const privileged = isAdminOrManager(req.user?.role ?? '');
    const page = await wikiService.getPageBySlug(req.params.slug, privileged);
    sendSuccess(res, page);
  } catch (err) {
    if (err instanceof AppError) return sendError(res, err.statusCode, err.message);
    logError('위키 페이지 조회 실패', err, { slug: req.params.slug });
    sendError(res, 500, '위키 페이지 조회 중 오류가 발생했습니다.');
  }
};

export const createPage = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendUnauthorized(res, '로그인이 필요합니다.');
    return;
  }

  const { slug, title, content, parentId, isPublished } = req.body;
  if (!slug || !slug.trim()) return sendValidationError(res, 'slug', '슬러그는 필수입니다.');
  if (!SLUG_REGEX.test(slug))
    return sendValidationError(
      res,
      'slug',
      '슬러그는 소문자 영문, 숫자, 하이픈만 사용 가능합니다.'
    );
  if (slug.length > 100)
    return sendValidationError(res, 'slug', '슬러그는 100자를 초과할 수 없습니다.');
  if (!title || !title.trim()) return sendValidationError(res, 'title', '제목은 필수입니다.');
  if (title.trim().length > 200)
    return sendValidationError(res, 'title', '제목은 200자를 초과할 수 없습니다.');
  if (content !== undefined && content.length > 500000)
    return sendValidationError(res, 'content', '내용이 너무 깁니다.');

  try {
    const page = await wikiService.createPage(
      { slug, title: title.trim(), content, parentId: parentId ?? null, isPublished },
      userId
    );
    sendSuccess(res, page, '위키 페이지가 생성되었습니다.', 201);
  } catch (err) {
    if (err instanceof AppError) return sendError(res, err.statusCode, err.message);
    logError('위키 페이지 생성 실패', err, { userId, slug: req.body.slug });
    sendError(res, 500, '위키 페이지 생성 중 오류가 발생했습니다.');
  }
};

export const updatePage = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendUnauthorized(res, '로그인이 필요합니다.');
    return;
  }

  const { title, content, parentId, isPublished, order } = req.body;
  if (title !== undefined && (!title.trim() || title.trim().length > 200)) {
    return sendValidationError(res, 'title', '제목은 1자 이상 200자 이하여야 합니다.');
  }
  if (content !== undefined && content.length > 500000) {
    return sendValidationError(res, 'content', '내용이 너무 깁니다.');
  }

  try {
    const trimmedTitle = title !== undefined ? title.trim() : undefined;
    const page = await wikiService.updatePage(
      req.params.slug,
      { title: trimmedTitle, content, parentId, isPublished, order },
      userId
    );
    sendSuccess(res, page);
  } catch (err) {
    if (err instanceof AppError) return sendError(res, err.statusCode, err.message);
    logError('위키 페이지 수정 실패', err, { userId, slug: req.params.slug });
    sendError(res, 500, '위키 페이지 수정 중 오류가 발생했습니다.');
  }
};

export const deletePage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await wikiService.deletePage(req.params.slug);
    sendSuccess(res, null, '위키 페이지가 삭제되었습니다.');
  } catch (err) {
    if (err instanceof AppError) return sendError(res, err.statusCode, err.message);
    logError('위키 페이지 삭제 실패', err, { slug: req.params.slug });
    sendError(res, 500, '위키 페이지 삭제 중 오류가 발생했습니다.');
  }
};
