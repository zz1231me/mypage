// client/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useSiteSettings } from '../store/siteSettings';
import { DashboardSidebar } from '../components/Dashboard/DashboardSidebar';
import { UserDropdown } from '../components/Dashboard/UserDropdown';
import { GlobalSearch } from '../components/Dashboard/GlobalSearch';
import { NotificationBell } from '../components/Dashboard/NotificationBell';
import { CommandPalette } from '../components/common/CommandPalette';
import { useHotkeys } from 'react-hotkeys-hook';

function Dashboard() {
  const { isAuthenticated } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useHotkeys(
    'ctrl+k, meta+k',
    e => {
      e.preventDefault();
      setCommandOpen(true);
    },
    { enableOnFormTags: false }
  );

  useEffect(() => {
    if (location.pathname === '/dashboard') {
      navigate('/dashboard/calendar', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* 헤더 */}
      <header
        className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800
                         flex items-center px-3 sm:px-5 z-50 flex-shrink-0"
      >
        <div className="w-full flex items-center justify-between gap-3 max-w-screen-2xl mx-auto">
          {/* 왼쪽 — 햄버거 + 로고 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-500 dark:text-slate-400
                         hover:bg-slate-100 dark:hover:bg-slate-800
                         rounded-lg transition-colors lg:hidden"
              aria-label="메뉴 열기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* 로고 */}
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 hover:opacity-75 transition-opacity"
              title={`${settings.siteName} 홈으로 이동`}
            >
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700
                                flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-500/30"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              )}
              <span className="hidden sm:block text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-40">
                {settings.siteName}
              </span>
            </Link>
          </div>

          {/* 중앙 — 글로벌 검색 */}
          <GlobalSearch />

          {/* 오른쪽 — 알림 + 유저 드롭다운 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <NotificationBell />
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* 바디 */}
      <div className="flex flex-1 min-h-0">
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-900">
          <Outlet />
        </main>
      </div>

      {/* 모바일 사이드바 백드롭 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-30 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

export default Dashboard;
