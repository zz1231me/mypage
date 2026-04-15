// server/src/validators/schemas.ts
// zod 스키마 정의 — 주요 API 입력값 검증에 사용
// ⚠️ 비밀번호 최소 길이는 관리자 설정(minPasswordLength)에 따라 동적으로 결정되므로
//    Zod 스키마에서는 구조(non-empty) 검사만 수행하고 실제 길이/복잡도 검사는 컨트롤러에서 처리

import { z } from 'zod';
import {
  POST_TITLE_MAX_LENGTH,
  POST_CONTENT_MAX_LENGTH,
  POST_SECRET_PASSWORD_MIN_LENGTH,
  PAGINATION,
} from '../config/constants';

// ─── 인증 ─────────────────────────────────────────────────

export const loginSchema = z.object({
  id: z.string().min(1, '아이디는 필수입니다.').max(30),
  password: z.string().min(1, '비밀번호는 필수입니다.').max(100),
  totpToken: z.string().optional(),
});

export const registerSchema = z.object({
  id: z
    .string()
    .regex(
      /^[a-zA-Z0-9_]{4,20}$/,
      '아이디는 영문, 숫자, 언더스코어만 사용 가능하며 4~20자여야 합니다.'
    ),
  // 길이/복잡도 검사는 register 컨트롤러에서 AuthValidator.validatePassword()로 처리
  password: z.string().min(1, '비밀번호는 필수입니다.').max(100),
  name: z.string().min(1, '이름은 필수입니다.').max(50).trim(),
  email: z.string().email('유효한 이메일 형식이 아닙니다.').optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호는 필수입니다.'),
  // 길이/복잡도 검사는 changePassword 컨트롤러에서 AuthValidator.validatePassword()로 처리
  newPassword: z.string().min(1, '새 비밀번호는 필수입니다.').max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('유효한 이메일 형식이 아닙니다.'),
});

// ⚠️ 버그 수정: 클라이언트/컨트롤러가 'password' 필드를 사용하므로 스키마도 'password'로 통일
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '토큰은 필수입니다.'),
  // 길이/복잡도 검사는 resetPassword 컨트롤러에서 AuthValidator.validatePassword()로 처리
  password: z.string().min(1, '새 비밀번호는 필수입니다.').max(100),
});

// ─── 게시글 ─────────────────────────────────────────────────

export const createPostSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다.').max(POST_TITLE_MAX_LENGTH),
  content: z.string().max(POST_CONTENT_MAX_LENGTH).optional().default(''),
  isSecret: z.boolean().optional().default(false),
  secretPassword: z
    .string()
    .min(
      POST_SECRET_PASSWORD_MIN_LENGTH,
      `비밀글 비밀번호는 최소 ${POST_SECRET_PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`
    )
    .optional(),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
});

// ─── 페이지네이션 쿼리 ─────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(v => {
      const n = parseInt(v ?? '1', 10);
      return isNaN(n) || n < 1 ? PAGINATION.DEFAULT_PAGE : n;
    }),
  limit: z
    .string()
    .optional()
    .transform(v => {
      const n = parseInt(v ?? '20', 10);
      return isNaN(n) || n < 1 ? PAGINATION.DEFAULT_LIMIT : Math.min(n, PAGINATION.MAX_LIMIT);
    }),
});
