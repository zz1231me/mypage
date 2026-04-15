import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';

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
  const { socket } = useSocket();
  const [newNotification, setNewNotification] = useState<RealtimeNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleNew = (notification: RealtimeNotification) => {
      setNewNotification(notification);
      setUnreadCount(c => c + 1);
    };

    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [socket]);

  const clearNew = () => setNewNotification(null);
  const resetCount = () => setUnreadCount(0);

  return { newNotification, unreadCount, clearNew, resetCount };
}
