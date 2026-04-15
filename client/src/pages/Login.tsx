// src/pages/Login.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Info, AlertTriangle, Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useSiteSettings } from '../store/siteSettings';
import { getSiteSettings } from '../api/siteSettings';
import { login as loginAPI } from '../api/auth';
import { logger, authLogger } from '../utils/logger';
import { useTheme } from '../contexts/ThemeContext';

function Login() {
  const { setUser, isAuthenticated } = useAuth();
  const { settings, setSettings } = useSiteSettings();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // App.tsx에서 이미 로드한 경우 재요청 불필요
  const [settingsLoaded, setSettingsLoaded] = useState(() => Boolean(settings.siteName));

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (settingsLoaded) return;
    const loadSettings = async () => {
      try {
        const data = await getSiteSettings();
        setSettings(data);
        logger.success('사이트 설정 로드 완료');
      } catch (error) {
        logger.error('사이트 설정 로드 실패', error);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const state = location.state as { message?: string; registeredId?: string } | null;
    if (state?.message) {
      setSuccessMessage(state.message);
      if (state.registeredId) setId(state.registeredId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (isAuthenticated) {
      authLogger.info('이미 로그인된 상태, 대시보드로 이동');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setError(''), 5000);
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(''), 10000);
    }
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, [successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      authLogger.info('로그인 시도', { userId: id });
      const response = await loginAPI(id, password);
      // sendSuccess 구조: { success, data: { ... } }
      const payload = response.data ?? response;
      if (payload.requires2FA) {
        authLogger.info('2FA 인증 필요', { userId: payload.userId });
        navigate('/login/2fa', {
          replace: true,
          state: { tempToken: payload.tempToken, userId: payload.userId },
        });
        return;
      }
      authLogger.success('로그인 성공', { userName: payload.user?.name });
      if (payload.user?.theme) setTheme(payload.user.theme);
      if (payload.tokenInfo) setUser(payload.user, payload.tokenInfo);
      else setUser(payload.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '아이디 또는 비밀번호가 올바르지 않습니다.';
      authLogger.error('로그인 실패', { error: message });
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  return (
    /* 배경: 미세 그리드 패턴 + 그라디언트 */
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden
                 bg-slate-50 dark:bg-slate-950"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.2) 1px, transparent 0)`,
        backgroundSize: '28px 28px',
      }}
    >
      {/* 배경 블러 오브 */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-400/10 dark:bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-400/10 dark:bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[400px] relative">
        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-4 p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/60 rounded-xl animate-slideInDown">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">
                  회원가입 완료
                </p>
                <p className="text-sm text-sky-700 dark:text-sky-400 mt-0.5">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 rounded-xl animate-slideInDown">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">로그인 실패</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 로그인 카드 */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/60 dark:shadow-slate-950/60
                        border border-slate-200/80 dark:border-slate-800 p-8"
        >
          {/* 로고 + 타이틀 */}
          <div className="text-center mb-8">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.siteName}
                className="w-14 h-14 rounded-2xl object-cover mx-auto mb-5 shadow-md"
              />
            ) : (
              <div
                className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700
                              rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-md"
              >
                <Building2 className="w-7 h-7 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              {settings.siteName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {settings.description || '계정에 로그인하여 시작하세요'}
            </p>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 아이디 */}
            <div className="space-y-1.5">
              <label
                htmlFor="id"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                아이디
              </label>
              <input
                id="id"
                type="text"
                value={id}
                onChange={e => setId(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="username"
                placeholder="아이디를 입력하세요"
                className="w-full px-4 py-2.5 rounded-lg
                           bg-slate-50 dark:bg-slate-800
                           border border-slate-200 dark:border-slate-700
                           text-slate-900 dark:text-slate-100 text-sm
                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-150"
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl
                             bg-slate-50 dark:bg-slate-800
                             border border-slate-200 dark:border-slate-700
                             text-slate-900 dark:text-slate-100 text-sm
                             placeholder:text-slate-400 dark:placeholder:text-slate-500
                             focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             p-1 rounded-lg text-slate-400 hover:text-slate-600
                             dark:text-slate-500 dark:hover:text-slate-300
                             hover:bg-slate-100 dark:hover:bg-slate-700
                             transition-colors"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4
                         bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                         text-white text-sm font-semibold
                         rounded-lg shadow-sm
                         hover:shadow-md
                         active:scale-[0.98]
                         focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                         transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                         flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* 회원가입 링크 */}
          {settings.allowRegistration !== false && (
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              계정이 없으신가요?{' '}
              <Link
                to="/register"
                className="text-primary-600 dark:text-primary-400 font-semibold hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                회원가입
              </Link>
            </p>
          )}

          {/* 관리자 로그인 메시지 */}
          {settings.loginMessage && (
            <div className="mt-5 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap text-center leading-relaxed">
                {settings.loginMessage}
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
          © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default Login;
