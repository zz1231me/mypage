// client/src/components/admin/common/TabNavigation.tsx
import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TabType } from '../../../types/admin.types';

interface TabGroup {
  label: string;
  tabs: { id: TabType; label: string }[];
}

export const TabNavigation = React.memo(() => {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'users';

  const groups = useMemo<TabGroup[]>(
    () => [
      {
        label: '사용자 · 권한',
        tabs: [
          { id: 'users', label: '사용자 관리' },
          { id: 'roles', label: '역할 관리' },
          { id: 'permissions', label: '권한 관리' },
        ],
      },
      {
        label: '게시판 · 콘텐츠',
        tabs: [
          { id: 'boards', label: '게시판 관리' },
          { id: 'board-managers', label: '게시판 담당자' },
          { id: 'tags', label: '태그 관리' },
          { id: 'files', label: '파일 관리' },
        ],
      },
      {
        label: '활동',
        tabs: [
          { id: 'events', label: '이벤트 관리' },
          { id: 'bookmarks', label: '북마크 관리' },
          { id: 'reports', label: '신고 관리' },
        ],
      },
      {
        label: '보안 · 로그',
        tabs: [
          { id: 'security-logs', label: '보안 로그' },
          { id: 'error-logs', label: '에러 로그' },
          { id: 'login-history', label: '로그인 이력' },
          { id: 'audit-logs', label: '감사 로그' },
          { id: 'ip-management', label: 'IP 관리' },
        ],
      },
      {
        label: '시스템',
        tabs: [
          { id: 'site-settings', label: '사이트 설정' },
          { id: 'rate-limits', label: '속도 제한' },
        ],
      },
    ],
    []
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 mb-8 transition-colors duration-300">
      {groups.map((group, groupIndex) => (
        <React.Fragment key={group.label}>
          {groupIndex > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 my-3" />
          )}
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap"
              style={{ minWidth: '84px' }}
            >
              {group.label}
            </span>
            <div className="flex flex-wrap gap-2">
              {group.tabs.map(tab => {
                const isActive = currentPath === tab.id;
                return (
                  <Link
                    key={tab.id}
                    to={`/admin/${tab.id}`}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all relative ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 dark:bg-emerald-500 rounded-full animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
});

TabNavigation.displayName = 'TabNavigation';
