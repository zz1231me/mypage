import { Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import Event from '../models/Event';
import { User } from '../models/User';
import EventPermission from '../models/EventPermission';
import { AuthRequest } from '../types/auth-request';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendNotFound,
  sendForbidden,
} from '../utils/response';
import { ROLES } from '../config/constants';

// ✅ 이벤트 생성
export const createEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    sendUnauthorized(res, '로그인이 필요합니다.');
    return;
  }

  try {
    // 이벤트 생성 권한 확인 (관리자는 항상 허용)
    if (userRole !== ROLES.ADMIN) {
      const eventPermission = await EventPermission.findOne({ where: { roleId: userRole } });
      if (!eventPermission?.canCreate) {
        sendForbidden(res, '이벤트를 생성할 권한이 없습니다.');
        return;
      }
    }

    // req.body 전체 전달 대신 허용 필드만 명시적으로 추출 (UserId, id 등 민감 필드 주입 방지)
    const {
      calendarId,
      title,
      body,
      isAllday,
      start,
      end,
      category,
      location,
      attendees,
      state,
      isReadOnly,
      color,
      backgroundColor,
      dragBackgroundColor,
      borderColor,
      customStyle,
      recurrenceType,
      recurrenceInterval,
      recurrenceDays,
      recurrenceEndDate,
      parentEventId,
    } = req.body;

    if (!calendarId || !title || !start || !end) {
      sendError(res, 400, 'calendarId, title, start, end는 필수입니다.');
      return;
    }

    if (typeof title !== 'string' || title.trim().length === 0) {
      sendError(res, 400, '제목이 올바르지 않습니다.');
      return;
    }
    if (title.length > 255) {
      sendError(res, 400, '제목은 255자를 초과할 수 없습니다.');
      return;
    }

    const event = await Event.create({
      calendarId,
      title,
      body,
      isAllday,
      start,
      end,
      category,
      location,
      attendees,
      state,
      isReadOnly,
      color,
      backgroundColor,
      dragBackgroundColor,
      borderColor,
      customStyle,
      recurrenceType,
      recurrenceInterval,
      recurrenceDays,
      recurrenceEndDate,
      parentEventId,
      UserId: userId,
    });

    const eventWithUser = await Event.findByPk(event.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    });

    sendSuccess(res, eventWithUser, '이벤트가 생성되었습니다.', 201);
  } catch (err) {
    next(err);
  }
};

// ✅ 이벤트 조회 (기간 필터)
export const getEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // query string이 배열로 주입되는 경우 방어 (e.g. ?start[]=a&start[]=b)
  const start = typeof req.query.start === 'string' ? req.query.start : undefined;
  const end = typeof req.query.end === 'string' ? req.query.end : undefined;

  try {
    const whereClause = start && end ? { start: { [Op.lte]: end }, end: { [Op.gte]: start } } : {};

    const events = await Event.findAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      order: [['start', 'ASC']],
    });

    sendSuccess(res, events);
  } catch (err) {
    next(err);
  }
};

// ✅ 이벤트 수정
export const updateEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    sendUnauthorized(res, '로그인이 필요합니다.');
    return;
  }

  try {
    const existingEvent = await Event.findByPk(id);
    if (!existingEvent) {
      sendNotFound(res, '이벤트');
      return;
    }

    const isOwner = existingEvent.UserId === userId;
    const isAdminUser = userRole === ROLES.ADMIN;

    if (!isOwner && !isAdminUser) {
      const eventPermission = await EventPermission.findOne({ where: { roleId: userRole } });
      if (!eventPermission?.canUpdate) {
        sendForbidden(res, '다른 사용자의 일정을 수정할 권한이 없습니다.');
        return;
      }
    }

    // req.body 전체 전달 금지 — UserId 변경(소유권 탈취) 방지
    const {
      calendarId,
      title,
      body,
      isAllday,
      start,
      end,
      category,
      location,
      attendees,
      state,
      isReadOnly,
      color,
      backgroundColor,
      dragBackgroundColor,
      borderColor,
      customStyle,
      recurrenceType,
      recurrenceInterval,
      recurrenceDays,
      recurrenceEndDate,
      parentEventId,
    } = req.body;

    const [updated] = await Event.update(
      {
        calendarId,
        title,
        body,
        isAllday,
        start,
        end,
        category,
        location,
        attendees,
        state,
        isReadOnly,
        color,
        backgroundColor,
        dragBackgroundColor,
        borderColor,
        customStyle,
        recurrenceType,
        recurrenceInterval,
        recurrenceDays,
        recurrenceEndDate,
        parentEventId,
      },
      { where: { id } }
    );
    if (updated === 0) {
      sendNotFound(res, '이벤트');
      return;
    }

    const updatedEvent = await Event.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    });
    if (!updatedEvent) {
      sendNotFound(res, '이벤트');
      return;
    }

    sendSuccess(res, updatedEvent, '이벤트가 수정되었습니다.');
  } catch (err) {
    next(err);
  }
};

// ✅ 이벤트 삭제
export const deleteEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    sendUnauthorized(res, '로그인이 필요합니다.');
    return;
  }

  try {
    const existingEvent = await Event.findByPk(id);
    if (!existingEvent) {
      sendNotFound(res, '이벤트');
      return;
    }

    const isOwner = existingEvent.UserId === userId;
    const isAdminUser = userRole === ROLES.ADMIN;

    if (!isOwner && !isAdminUser) {
      const eventPermission = await EventPermission.findOne({ where: { roleId: userRole } });
      if (!eventPermission?.canDelete) {
        sendForbidden(res, '다른 사용자의 일정을 삭제할 권한이 없습니다.');
        return;
      }
    }

    const deleted = await Event.destroy({ where: { id } });
    if (deleted === 0) {
      sendNotFound(res, '이벤트');
      return;
    }

    sendSuccess(res, { deletedId: id }, '이벤트가 삭제되었습니다.');
  } catch (err) {
    next(err);
  }
};
