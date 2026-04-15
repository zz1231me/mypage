// src/api/boards.ts
import api from './axios';

// ❌ 기존: 관리자 전용 API (일반 사용자 사용 금지)
export const fetchBoardAccess = (boardType: string) => {
  return api.get(`/boards/access/${boardType}`);
};

// ✅ 기존: 전체 게시판 + 권한 목록 조회 (관리자 전용)
export const fetchAllBoardAccess = () => {
  return api.get('/boards/access');
};

// ✅ 사용자가 접근 가능한 게시판 목록 조회
export const fetchUserAccessibleBoards = () => {
  return api.get('/boards/accessible');
};

// ✅ 새로운: 사용자의 특정 게시판 접근 권한 확인 (일반 사용자용)
export const checkUserBoardAccess = (boardType: string) => {
  return api.get(`/boards/check/${boardType}`);
};
