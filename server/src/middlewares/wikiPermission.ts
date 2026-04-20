import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth-request';
import { SiteSettings } from '../models/SiteSettings';
import { sendForbidden } from '../utils/response';

export const checkWikiWritePermission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthRequest;
  const userRole = authReq.user?.role;

  if (!userRole) {
    sendForbidden(res, '위키 편집 권한이 없습니다.');
    return;
  }

  try {
    const settings = await SiteSettings.findOne();
    const allowedRoles: string[] = settings?.wikiEditRoles
      ? (JSON.parse(settings.wikiEditRoles) as string[])
      : ['admin', 'manager'];

    if (!allowedRoles.includes(userRole)) {
      sendForbidden(res, '위키 편집 권한이 없습니다.');
      return;
    }

    next();
  } catch {
    sendForbidden(res, '권한 확인 중 오류가 발생했습니다.');
  }
};
