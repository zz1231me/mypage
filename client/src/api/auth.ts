// client/src/api/auth.ts - 보안 강화된 회원가입 시스템 지원
import api from './axios';
import { getVisitorId } from '../utils/fingerprint';

// DEV 환경에서만 로그 출력
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const devLog = (...args: any[]) => {
  if (import.meta.env.DEV) console.info(...args);
};

// 🔐 로그인 - 쿠키 기반
export async function login(id: string, password: string) {
  const fingerprint = await getVisitorId();
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ id, password, fingerprint }),
    credentials: 'include', // ✅ 쿠키 포함
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || '로그인 실패');
  }

  const data = await res.json().catch(() => {
    throw new Error('응답 처리 중 오류가 발생했습니다');
  });
  return data;
}

// 🚪 로그아웃 - 쿠키 삭제
export async function logout() {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!res.ok) {
    throw new Error('로그아웃 실패');
  }

  // 204 No Content는 본문이 없으므로 JSON 파싱 없이 반환
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

// 👤 현재 사용자 정보 조회
// ✅ api 인스턴스 사용: 419(토큰 만료) 시 axios 인터셉터가 자동으로 갱신 후 재시도
//    401(토큰 없음)은 AUTH_ENDPOINT 예외 처리로 리다이렉트 없이 에러 전파 → useAuthInit에서 수동 처리
export async function getCurrentUser() {
  const res = await api.get('/auth/me');
  return res.data;
}

// 🔄 토큰 갱신
export async function refreshToken() {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    devLog('❌ /api/auth/refresh 에러 응답:', errorText);
    const err = Object.assign(new Error(`토큰 갱신 실패: ${res.status}`), {
      status: res.status,
    });
    throw err;
  }

  return res.json();
}

// 🔒 비밀번호 변경
export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await api.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });

  return res.data;
}

// 🔍 사용자 권한 조회
export async function getUserPermissions() {
  const res = await api.get('/auth/permissions');
  return res.data;
}

// 👤 회원가입 (보안 강화) - ✅ role 필드 완전 제거, email 추가
export async function register(id: string, password: string, name: string, email?: string) {
  // ✅ role 필드 완전 제거
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestBody: any = { id, password, name };

  // ✅ 이메일 추가 (선택사항)
  if (email) {
    requestBody.email = email;
  }

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || '회원가입 실패');
  }

  const data = await res.json().catch(() => {
    throw new Error('응답 처리 중 오류가 발생했습니다');
  });
  return data;
}

// 🔑 비밀번호 재설정 이메일 요청
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || '비밀번호 재설정 요청 실패');
  }

  return res.json().catch(() => {
    throw new Error('응답 처리 중 오류가 발생했습니다');
  });
}

// 🔑 비밀번호 재설정 (토큰 + 새 비밀번호)
export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ token, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || '비밀번호 재설정 실패');
  }

  return res.json().catch(() => {
    throw new Error('응답 처리 중 오류가 발생했습니다');
  });
}

// 🧑 프로필(이름) 변경
export async function updateProfile(name: string) {
  const res = await api.patch('/auth/me/profile', { name });
  return res.data;
}

// 🎨 테마 업데이트
export async function updateTheme(theme: 'light' | 'dark' | 'system') {
  const res = await api.patch('/auth/theme', { theme });
  return res.data;
}

// 📸 아바타 업로드 (api 인스턴스 사용 → 토큰 만료 시 자동 갱신 인터셉터 적용)
export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append('avatar', file);

  const res = await api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// 🗑️ 아바타 삭제 (api 인스턴스 사용 → 토큰 만료 시 자동 갱신 인터셉터 적용)
export async function deleteAvatar() {
  const res = await api.delete('/auth/avatar');
  return res.data;
}
