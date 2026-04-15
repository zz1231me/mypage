import api from './axios';
import { unwrap } from './utils';

// 사용자 이름 검색 (비밀글 대상 지정용)
export const searchUsers = (q: string) => api.get('/users/search', { params: { q } }).then(unwrap);

// 내 게시글
export const getMyPosts = (page = 1, limit = 10) =>
  api.get('/users/me/posts', { params: { page, limit } }).then(unwrap);

// 내 댓글
export const getMyComments = (page = 1, limit = 10) =>
  api.get('/users/me/comments', { params: { page, limit } }).then(unwrap);

// 접속 기록
export const getSecurityLogs = (page = 1, limit = 20) =>
  api.get('/users/me/security-logs', { params: { page, limit } }).then(unwrap);

// 활동 통계
export const getMyActivity = () => api.get('/users/me/activity').then(unwrap);
