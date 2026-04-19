import { type ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (import.meta.env.DEV) {
      console.info('❌ 인증되지 않은 사용자, 로그인 페이지로 이동');
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
