// client/src/pages/components/calendar/MyTUICalendar.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { EventResizeDoneArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import koLocale from '@fullcalendar/core/locales/ko';
import { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import { useAuth } from '../../../store/auth';
import { updateEvent } from '../../../api/events';
import { toast } from '../../../utils/toast';

import { CalendarEvent, EventFormData, ModalMode } from './types';
import { dateUtils } from './utils';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { CalendarHeader, CalendarView } from './components/CalendarHeader';
import { CalendarModal } from './components/CalendarModal';
import './styles/calendar.css';

const DEFAULT_FORM: EventFormData = {
  title: '',
  body: '',
  isAllday: true,
  start: '',
  end: '',
  category: '',
  location: '',
  color: '#6366f1',
  backgroundColor: '#6366f1',
};

const MyTUICalendar: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);

  const {
    events,
    loading,
    loadEvents,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    canEditEvent,
  } = useCalendarEvents({ userId: user?.id, isAdmin: isAdmin(), calendarRef });

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('dayGridMonth');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [formData, setFormData] = useState<EventFormData>(DEFAULT_FORM);

  // 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 로그인 후 이벤트 로드
  useEffect(() => {
    if (user?.id) loadEvents();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 오늘 날짜 문자열 (날짜가 바뀔 때만 재계산)
  const todayStr = useMemo(
    () => dateUtils.toLocalDateString(new Date()),
    [currentTime.toDateString()] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ──── 네비게이션 ──── */
  const handlePrev = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();

  const handleViewChange = useCallback((view: CalendarView) => {
    calendarRef.current?.getApi().changeView(view);
    setCurrentView(view);
  }, []);

  /* ──── 날짜 선택 (새 일정) ──── */
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const startStr = dateUtils.toLocalDateString(selectInfo.start);
    const endStr = dateUtils.subtractDay(dateUtils.toLocalDateString(selectInfo.end));
    setFormData({ ...DEFAULT_FORM, start: startStr, end: endStr });
    setModalMode('create');
    setSelectedEvent(null);
    setIsModalOpen(true);
    selectInfo.view.calendar.unselect();
  };

  /* ──── 이벤트 클릭 (상세보기) ──── */
  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const originalEvent = event.extendedProps.originalEvent as CalendarEvent;
    setSelectedEvent(originalEvent);

    const startDate = event.startStr
      ? dateUtils.isoToLocalDate(event.startStr)
      : event.start
        ? dateUtils.toLocalDateString(event.start)
        : dateUtils.isoToLocalDate(originalEvent.start);

    const endDate = event.endStr
      ? dateUtils.subtractDay(dateUtils.isoToLocalDate(event.endStr))
      : event.end
        ? dateUtils.subtractDay(dateUtils.toLocalDateString(event.end))
        : originalEvent.end
          ? dateUtils.subtractDay(dateUtils.isoToLocalDate(originalEvent.end))
          : startDate;

    setFormData({
      title: event.title,
      body: event.extendedProps.body || '',
      isAllday: true,
      start: startDate,
      end: endDate,
      category: event.extendedProps.category || 'meeting',
      location: event.extendedProps.location || '',
      color: event.backgroundColor || '#6366f1',
      backgroundColor: event.backgroundColor || '#6366f1',
    });
    setModalMode('view');
    setIsModalOpen(true);
  };

  /* ──── 드래그/리사이즈 공통 처리 ──── */
  const applyEventDateChange = useCallback(
    async (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event: { start: Date | null; end: Date | null; extendedProps: Record<string, any> },
      revert: () => void
    ) => {
      const originalEvent = event.extendedProps.originalEvent as CalendarEvent;
      if (!canEditEvent(originalEvent) || originalEvent.isReadOnly) {
        toast.error('이 일정을 수정할 권한이 없습니다.');
        revert();
        return;
      }
      try {
        const startDate = event.start!;
        const endDate = dateUtils.ensureMinimumDuration(startDate, event.end);
        await updateEvent(originalEvent.id, {
          calendarId: originalEvent.calendarId,
          title: originalEvent.title,
          body: originalEvent.body || '',
          isAllday: true,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          category: originalEvent.category,
          location: originalEvent.location || '',
          isReadOnly: originalEvent.isReadOnly,
          color: originalEvent.color,
          backgroundColor: originalEvent.backgroundColor,
          borderColor: originalEvent.borderColor,
        });
        await loadEvents();
      } catch (error) {
        toast.error(
          `일정 수정에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
        );
        revert();
        await loadEvents();
      }
    },
    [canEditEvent, loadEvents]
  );

  const handleEventDrop = (info: EventDropArg) => applyEventDateChange(info.event, info.revert);

  const handleEventResize = (info: EventResizeDoneArg) =>
    applyEventDateChange(info.event, info.revert);

  /* ──── 폼 제출 ──── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!formData.category) {
      toast.error('일정 종류를 선택해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') await handleCreateEvent(formData);
      else if (modalMode === 'edit' && selectedEvent)
        await handleUpdateEvent(selectedEvent.id, formData);
      setIsModalOpen(false);
    } catch {
      toast.error('일정 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ──── 삭제 ──── */
  const handleDelete = () => {
    if (!selectedEvent || isDeleting) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedEvent) return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await handleDeleteEvent(selectedEvent.id);
      setIsModalOpen(false);
    } catch {
      toast.error('일정 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDatesSet = (dateInfo: { view: { title: string } }) => {
    setCalendarTitle(dateInfo.view.title);
    loadEvents();
  };

  /* ──── 렌더 ──── */
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* 캘린더 카드 */}
      <div
        className="flex-1 flex flex-col min-h-0 mx-4 my-4 sm:mx-6 sm:my-5
                      bg-white dark:bg-slate-900
                      rounded-2xl border border-slate-200 dark:border-slate-800
                      shadow-sm overflow-hidden relative"
      >
        {/* 상단 accent 라인 */}
        <div className="h-[3px] bg-gradient-to-r from-primary-500 via-primary-600 to-violet-600 flex-shrink-0" />

        {/* 헤더 */}
        <CalendarHeader
          currentTime={currentTime}
          loading={loading}
          title={calendarTitle}
          currentView={currentView}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onViewChange={handleViewChange}
        />

        {/* 캘린더 본체 */}
        <div className="flex-1 min-h-0 p-3 sm:p-4">
          <div className="calendar-wrapper h-full">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              locale={koLocale}
              headerToolbar={false}
              initialView="dayGridMonth"
              height="100%"
              events={events}
              selectable={true}
              selectMirror={true}
              unselectAuto={true}
              editable={true}
              eventDragMinDistance={5}
              dragRevertDuration={300}
              dragScroll={true}
              longPressDelay={200}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              eventAllow={(_, draggedEvent) => {
                if (!draggedEvent) return false;
                const originalEvent = draggedEvent.extendedProps.originalEvent as CalendarEvent;
                return canEditEvent(originalEvent) && !originalEvent.isReadOnly;
              }}
              datesSet={handleDatesSet}
              nowIndicator={true}
              weekends={true}
              fixedWeekCount={false}
              showNonCurrentDates={false}
              noEventsContent={() => <div className="fc-no-events-msg">등록된 일정이 없습니다</div>}
              dayCellClassNames={arg =>
                dateUtils.toLocalDateString(arg.date) === todayStr ? ['today-highlight'] : []
              }
            />
          </div>
        </div>

        {/* 로딩 오버레이 */}
        {loading && (
          <div
            className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm
                          flex items-center justify-center z-30"
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 border-[3px] border-primary-200 dark:border-primary-900
                              border-t-primary-600 rounded-full animate-spin"
              />
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                일정을 불러오는 중
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 이벤트 모달 */}
      <CalendarModal
        isOpen={isModalOpen}
        mode={modalMode}
        selectedEvent={selectedEvent}
        formData={formData}
        canEdit={selectedEvent ? canEditEvent(selectedEvent) : false}
        canDelete={selectedEvent ? canEditEvent(selectedEvent) : false}
        isSubmitting={isSubmitting}
        isDeleting={isDeleting}
        onClose={() => setIsModalOpen(false)}
        onEdit={() => setModalMode('edit')}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        onFormChange={data => setFormData(prev => ({ ...prev, ...data }))}
        onCancelEdit={() => setModalMode('view')}
      />

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4
                        bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm"
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl
                          border border-slate-200 dark:border-slate-800
                          max-w-sm w-full p-6 animate-scaleIn"
          >
            <div
              className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30
                            flex items-center justify-center mx-auto mb-4"
            >
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 text-center mb-1">
              일정 삭제
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                &ldquo;{selectedEvent?.title}&rdquo;
              </span>
              <br />을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg
                           text-slate-600 dark:text-slate-400
                           bg-slate-100 dark:bg-slate-800
                           hover:bg-slate-200 dark:hover:bg-slate-700
                           transition-colors duration-150"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg
                           bg-red-600 hover:bg-red-700 active:bg-red-800
                           text-white shadow-sm
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-150 active:scale-[0.98]"
              >
                {isDeleting ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTUICalendar;
