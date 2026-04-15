import api from '../api/axios';
import { unwrap } from './utils';

// 🆕 관리자용 이벤트 API 함수들 추가

export interface CalendarEvent {
  id?: string | number;
  title: string;
  start: string | Date;
  end: string | Date;
  allDay?: boolean;
  color?: string;
  description?: string;
  createdBy?: string;
  UserId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface CreateEventParams {
  title: string;
  body?: string; // HTML content from CKEditor
  start: string | Date;
  end: string | Date;
  allDay?: boolean;
  isAllday?: boolean;
  calendarId?: string;
  category?: string;
  location?: string;
  isReadOnly?: boolean;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  description?: string;
}

export interface UpdateEventParams extends Partial<CreateEventParams> {
  id: string | number;
}

export const createEvent = (event: CreateEventParams) => {
  return api.post('/events', event);
};

export const getEvents = (start: Date, end: Date) => {
  return api
    .get('/events', {
      params: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    })
    .then(unwrap);
};

export const updateEvent = (id: number | string, event: Partial<CreateEventParams>) => {
  return api.put(`/events/${id}`, event);
};

export const deleteEvent = (id: number | string) => {
  return api.delete(`/events/${id}`);
};

// 🆕 관리자용 이벤트 관리 API
export const getAllEventsForAdmin = () => {
  return api.get('/admin/events').then(unwrap);
};

export const updateEventAsAdmin = (id: number | string, event: Partial<CreateEventParams>) => {
  return api.put(`/admin/events/${id}`, event);
};

export const deleteEventAsAdmin = (id: number | string) => {
  return api.delete(`/admin/events/${id}`);
};

// 🆕 이벤트 권한 관리 API
export const getEventPermissions = () => {
  return api.get('/admin/events/permissions').then(unwrap);
};

export const setEventPermissions = (permissions: Record<string, unknown>[]) => {
  return api.put('/admin/events/permissions', { permissions });
};
