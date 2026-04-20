import { useState } from 'react';

interface RealtimeNotification {
  id: number;
  type: string;
  message: string;
  link?: string | null;
  relatedId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function useRealtimeNotifications() {
  const [newNotification] = useState<RealtimeNotification | null>(null);

  const clearNew = () => {};
  const resetCount = () => {};

  return { newNotification, unreadCount: 0, clearNew, resetCount };
}
