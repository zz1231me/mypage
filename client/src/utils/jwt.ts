// client/src/utils/jwt.ts
// Note: App uses HttpOnly cookies for auth tokens, not sessionStorage/localStorage.
// This utility is only for client-side JWT payload decoding (display purposes only).

interface JWTPayload {
  id: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

// JWT 토큰 디코딩 (서명 검증 없이 페이로드만 읽기)
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};
