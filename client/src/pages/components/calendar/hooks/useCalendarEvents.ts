// client/src/pages/components/calendar/hooks/useCalendarEvents.ts
import { useState, useCallback, useRef } from 'react';
import { EventInput } from '@fullcalendar/core';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../../../../api/events';
import { CalendarEvent, EventFormData } from '../types';
import { categoryColors } from '../constants';
import { dateUtils } from '../utils';

interface UseCalendarEventsProps {
  userId?: string;
  isAdmin?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calendarRef: React.RefObject<any>;
}

export const useCalendarEvents = ({
  userId,
  isAdmin = false,
  calendarRef,
}: UseCalendarEventsProps) => {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(false);
  // Bug 6 fix: race condition 방지를 위한 요청 ID 추적
  const loadRequestIdRef = useRef(0);

  const canEditEvent = useCallback(
    (event: CalendarEvent) => {
      return isAdmin || userId === event.UserId;
    },
    [userId, isAdmin]
  );

  const loadEvents = useCallback(async () => {
    if (!userId) return;

    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const view = calendarApi.view;
    const start = view.activeStart;
    const end = view.activeEnd;

    // Bug 6 fix: 현재 요청 ID를 증가시키고 저장 - 나중에 도착한 이전 요청은 무시
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);

    try {
      const eventData = await getEvents(start, end);

      // 이 응답이 가장 최근 요청인지 확인 (race condition 방지)
      if (requestId !== loadRequestIdRef.current) return;

      const formattedEvents: EventInput[] = eventData.map((event: CalendarEvent) => ({
        id: event.id.toString(),
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.isAllday,
        backgroundColor:
          event.backgroundColor ||
          categoryColors[event.category as keyof typeof categoryColors]?.bg ||
          '#3788d8',
        borderColor:
          event.borderColor ||
          categoryColors[event.category as keyof typeof categoryColors]?.border ||
          '#2563eb',
        textColor:
          categoryColors[event.category as keyof typeof categoryColors]?.textColor ?? '#ffffff',
        editable: canEditEvent(event),
        startEditable: canEditEvent(event),
        durationEditable: canEditEvent(event),
        extendedProps: {
          body: event.body,
          category: event.category,
          location: event.location,
          userId: event.UserId,
          userName: event.user?.name,
          isReadOnly: event.isReadOnly,
          originalEvent: event,
        },
      }));

      setEvents(formattedEvents);
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      if (import.meta.env.DEV) console.error('❌ 이벤트 로드 실패:', error);
      setEvents([]);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [userId, calendarRef, canEditEvent]);

  const handleCreateEvent = useCallback(
    async (formData: EventFormData) => {
      try {
        // 'T00:00:00Z' — UTC 자정 기준 (로컬 'T00:00:00' 사용 시 KST에서 날짜 하루 밀림)
        const startDate = new Date(formData.start + 'T00:00:00Z');
        const endDate = new Date(dateUtils.addDay(formData.end) + 'T00:00:00Z');

        const eventData = {
          calendarId: 'default',
          title: formData.title,
          body: formData.body,
          isAllday: true,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          category: formData.category,
          location: formData.location,
          isReadOnly: false,
          color: formData.color,
          backgroundColor: formData.backgroundColor,
          borderColor: formData.color,
        };

        await createEvent(eventData);
        await loadEvents();
      } catch (error) {
        if (import.meta.env.DEV) console.error('❌ 이벤트 생성 실패:', error);
        throw error;
      }
    },
    [loadEvents]
  );

  const handleUpdateEvent = useCallback(
    async (eventId: number, formData: EventFormData) => {
      try {
        const startDate = new Date(formData.start + 'T00:00:00Z');
        const endDate = new Date(dateUtils.addDay(formData.end) + 'T00:00:00Z');

        const eventData = {
          calendarId: 'default',
          title: formData.title,
          body: formData.body,
          isAllday: true,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          category: formData.category,
          location: formData.location,
          isReadOnly: false,
          color: formData.color,
          backgroundColor: formData.backgroundColor,
          borderColor: formData.color,
        };

        await updateEvent(eventId, eventData);
        await loadEvents();
      } catch (error) {
        if (import.meta.env.DEV) console.error('❌ 이벤트 수정 실패:', error);
        throw error;
      }
    },
    [loadEvents]
  );

  const handleDeleteEvent = useCallback(
    async (eventId: number) => {
      try {
        await deleteEvent(eventId);
        await loadEvents();
      } catch (error) {
        if (import.meta.env.DEV) console.error('❌ 이벤트 삭제 실패:', error);
        throw error;
      }
    },
    [loadEvents]
  );

  return {
    events,
    loading,
    loadEvents,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    canEditEvent,
  };
};
