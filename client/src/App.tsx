// ============================================================================
// App.tsx - 회원가입 승인 시스템이 적용된 메인 애플리케이션 컴포넌트
//
// ✅ 성능 최적화: React.lazy 및 Suspense 적용
// ✅ 라우팅 구조 개선
// ============================================================================

import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import BoardProtectedRoute from './components/BoardProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import { getSiteSettings } from './api/siteSettings';
import { useSiteSettings } from './store/siteSettings';
import { useAuth } from './store/auth';
import { logger } from './utils/logger';
import { LoadingSpinner } from './components/admin/common/LoadingSpinner';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationToast } from './components/common/NotificationToast';

// 🚀 Lazy Loading applied to all page components
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Forbidden = lazy(() => import('./pages/Forbidden'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const PostList = lazy(() => import('./pages/boards/PostList'));
const PostDetail = lazy(() => import('./pages/boards/PostDetail'));
const PostEditor = lazy(() => import('./pages/boards/PostEditor'));
const MyTUICalendar = lazy(() => import('./pages/components/MyTUICalendar'));
const AdminUserPage = lazy(() => import('./pages/admin'));
const NotFound = lazy(() => import('./pages/NotFound'));
const MemoBoard = lazy(() => import('./pages/memos/MemoBoard'));
const WikiPageRoute = lazy(() => import('./pages/wiki/WikiPage'));
const LoginTwoFactor = lazy(() => import('./pages/LoginTwoFactor'));

function App() {
  const { setSettings } = useSiteSettings();
  const { clearUser } = useAuth();

  // ✅ 다중 탭 로그아웃 동기화 - 다른 탭에서 로그아웃 시 이 탭도 로그아웃
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tokenInfo' && e.newValue === null && e.oldValue !== null) {
        clearUser();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [clearUser]);

  const loadSiteSettings = async () => {
    try {
      const settings = await getSiteSettings();

      // Store에 저장
      setSettings(settings);

      // 타이틀 업데이트
      document.title = settings.siteTitle;

      // 파비콘 업데이트
      if (settings.faviconUrl) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = settings.faviconUrl;
      }

      // 메타 설명 업데이트
      if (settings.description) {
        let meta = document.querySelector("meta[name='description']") as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'description';
          document.head.appendChild(meta);
        }
        meta.content = settings.description;
      }
    } catch (error) {
      logger.error('사이트 설정 로드 실패', error);
      // 실패해도 계속 진행 (기본값 사용)
    }
  };

  // ✅ 앱 시작 시 사이트 설정 로드
  useEffect(() => {
    loadSiteSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ErrorBoundary>
      <SocketProvider>
        <BrowserRouter>
          <NotificationToast />
          {/* 🚀 Suspense로 로딩 중 상태 처리 */}
          <Suspense
            fallback={
              <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
                <LoadingSpinner message="페이지 로딩 중..." />
              </div>
            }
          >
            <Routes>
              {/* ✅ 공개 라우트 */}
              <Route path="/" element={<Login />} />
              <Route path="/login/2fa" element={<LoginTwoFactor />} />
              <Route path="/register" element={<Register />} />

              {/* ✅ 프로필 페이지 - 독립적인 보호된 라우트 */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* ✅ 권한 없음 안내 페이지 - 인증된 사용자만 접근 가능 */}
              <Route
                path="/unauthorized"
                element={
                  <ProtectedRoute>
                    <Unauthorized />
                  </ProtectedRoute>
                }
              />

              {/* ✅ 접근 금지 페이지 - IP 차단 등 */}
              <Route path="/forbidden" element={<Forbidden />} />

              {/* ✅ 보호된 경로: 대시보드 및 하위 페이지들 */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              >
                {/* ✅ 기본 대시보드 경로 - 캘린더로 리다이렉트 */}
                <Route index element={<Navigate to="calendar" replace />} />

                {/* 주요 화면 라우팅 */}
                <Route path="calendar" element={<MyTUICalendar />} />
                <Route path="memos" element={<MemoBoard />} />
                <Route path="wiki" element={<WikiPageRoute />} />
                <Route path="wiki/:slug" element={<WikiPageRoute />} />

                {/* ✅ 게시글 관련 - 권한 보호됨 */}
                <Route
                  path="posts/:boardType/new"
                  element={
                    <BoardProtectedRoute action="write">
                      <PostEditor mode="create" />
                    </BoardProtectedRoute>
                  }
                />

                <Route
                  path="posts/:boardType/edit/:id"
                  element={
                    <BoardProtectedRoute action="write">
                      <PostEditor mode="edit" />
                    </BoardProtectedRoute>
                  }
                />

                <Route
                  path="posts/:boardType/:id"
                  element={
                    <BoardProtectedRoute action="read">
                      <PostDetail />
                    </BoardProtectedRoute>
                  }
                />

                <Route
                  path="posts/:boardType"
                  element={
                    <BoardProtectedRoute action="read">
                      <PostList />
                    </BoardProtectedRoute>
                  }
                />
              </Route>

              {/* ✅ 관리자 전용 라우트 - 별도 독립 페이지 (/admin) */}
              <Route
                path="/admin/*"
                element={
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <AdminUserPage />
                  </RoleProtectedRoute>
                }
              />

              {/* ✅ 404 페이지 - 가장 마지막에 배치 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default App;
