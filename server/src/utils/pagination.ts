import { Request } from 'express';
import { getSettings } from './settingsCache';

interface PaginationOptions {
  defaultLimit?: number;
  maxPage?: number;
  maxLimit?: number;
}

/**
 * query.page / query.limit을 안전하게 파싱·범위 제한
 */
export function parsePagination(req: Request, options: PaginationOptions = {}) {
  const { defaultLimit = getSettings().defaultPageSize, maxPage = 1000, maxLimit = 50 } = options;

  const page = Math.min(maxPage, Math.max(1, parseInt(req.query.page as string) || 1));
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(req.query.limit as string) || defaultLimit)
  );

  return { page, limit, offset: (page - 1) * limit };
}

/**
 * 페이지네이션 메타 객체 생성
 */
export function buildPaginationMeta(page: number, limit: number, totalCount: number) {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    currentPage: page,
    totalPages,
    totalCount,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
