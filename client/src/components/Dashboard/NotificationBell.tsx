// client/src/components/Dashboard/NotificationBell.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Heart, AtSign, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { stagger, listItem, scaleIn } from '../../utils/animations';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../../api/notifications';

interface Notification {
  id: number;
  type: 'COMMENT' | 'LIKE' | 'MENTION' | 'SYSTEM';
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  COMMENT: {
    icon: <MessageSquare className="w-4 h-4" />,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    color: 'text-blue-600 dark:text-blue-400',
  },
  LIKE: {
    icon: <Heart className="w-4 h-4" />,
    bg: 'bg-red-100 dark:bg-red-900/30',
    color: 'text-red-500 dark:text-red-400',
  },
  MENTION: {
    icon: <AtSign className="w-4 h-4" />,
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    color: 'text-violet-600 dark:text-violet-400',
  },
  SYSTEM: {
    icon: <Bell className="w-4 h-4" />,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    color: 'text-amber-600 dark:text-amber-400',
  },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchUnread = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data?.count ?? 0);
    } catch {
      /* 알림 API 에러 무시 */
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications(undefined, 20);
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(data?.unreadCount ?? 0);
      setNextCursor(data?.nextCursor ?? null);
    } catch {
      /* 알림 API 에러 무시 */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getNotifications(nextCursor, 20);
      setNotifications(prev => [
        ...prev,
        ...(Array.isArray(data?.notifications) ? data.notifications : []),
      ]);
      setNextCursor(data?.nextCursor ?? null);
    } catch {
      /* 알림 API 에러 무시 */
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  // 폴링: 30초마다 안 읽은 개수 갱신
  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  // 패널 열릴 때 목록 로드
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleRead = async (n: Notification) => {
    try {
      await markAsRead(n.id);
      setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      /* 알림 API 에러 무시 */
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(x => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* 알림 API 에러 무시 */
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(x => x.id !== id));
      const deleted = notifications.find(x => x.id === id);
      if (deleted && !deleted.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      /* 알림 API 에러 무시 */
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  };

  return (
    <div ref={panelRef} className="relative">
      {/* 벨 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        aria-label={`알림${unreadCount > 0 ? ` ${unreadCount}개 미읽음` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{ originX: 1, originY: 0 }}
            className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-1rem))] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                알림
                {unreadCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  모두 읽음
                </button>
              )}
            </div>

            {/* 목록 */}
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
                <Bell className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">새 알림이 없습니다</p>
              </div>
            ) : (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700"
              >
                {notifications.map(n => {
                  const typeInfo = TYPE_ICON[n.type] ?? TYPE_ICON.SYSTEM;
                  return (
                    <motion.div
                      key={n.id}
                      variants={listItem}
                      onClick={() => handleRead(n)}
                      className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                        !n.isRead ? 'bg-primary-50/60 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      {/* 타입 아이콘 */}
                      <span
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${typeInfo.bg} ${typeInfo.color}`}
                      >
                        {typeInfo.icon}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm leading-snug ${!n.isRead ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                          {n.message}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatTime(n.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                        )}
                        <button
                          onClick={e => handleDelete(e, n.id)}
                          className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                          aria-label="알림 삭제"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* 더 보기 버튼 */}
            {nextCursor && !loading && (
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-1.5 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors disabled:opacity-50"
                >
                  {loadingMore ? '로드 중...' : '더 보기'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
