import { useState } from 'react';
import api from '../../api/axios';
import { Event, EventPermission } from '../../types/admin.types';

interface EventUpdatePayload {
  title?: string;
  start?: string;
  end?: string;
  location?: string;
  calendarId?: string;
  body?: string;
  isAllday?: boolean;
  category?: string;
  isReadOnly?: boolean;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export const useEventManagement = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [permissions, setPermissions] = useState<EventPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get('/admin/events');
      setEvents(res.data.data || res.data);
      setDataLoaded(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error('이벤트 목록 오류:', err);
      setFetchError('이벤트 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/admin/events/permissions');
      setPermissions(res.data.data || res.data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('이벤트 권한 오류:', err);
    }
  };

  const updateEvent = async (id: number, updates: EventUpdatePayload) => {
    await api.put(`/admin/events/${id}`, updates);
    await fetchEvents();
  };

  const deleteEvent = async (id: number) => {
    await api.delete(`/admin/events/${id}`);
    await fetchEvents();
  };

  const updatePermission = async (
    roleId: string,
    type: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete'
  ) => {
    if (saving) return;

    setPermissions(prev => {
      const updated = prev.map(p => (p.roleId === roleId ? { ...p, [type]: !p[type] } : p));

      setSaving(true);

      const validPermissions = updated.map(p => ({
        roleId: p.roleId,
        canCreate: p.canCreate,
        canRead: p.canRead,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete,
      }));

      api
        .put('/admin/events/permissions', { permissions: validPermissions })
        .finally(() => setSaving(false));

      return updated;
    });
  };

  return {
    events,
    permissions,
    loading,
    saving,
    dataLoaded,
    fetchEvents,
    fetchPermissions,
    updateEvent,
    deleteEvent,
    updatePermission,
    setDataLoaded,
    fetchError,
  };
};
