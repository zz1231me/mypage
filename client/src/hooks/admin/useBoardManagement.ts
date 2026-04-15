import { useState } from 'react';
import api from '../../api/axios';
import { Board, BoardPermission, Role } from '../../types/admin.types';

export const useBoardManagement = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [permissions, setPermissions] = useState<Record<string, BoardPermission[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [dataLoaded, setDataLoaded] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchBoards = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get('/admin/boards');
      setBoards(res.data.data || res.data);
      setDataLoaded(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error('게시판 목록 오류:', err);
      setFetchError('게시판 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addBoard = async (boardData: {
    id: string;
    name: string;
    description: string;
    order: number;
  }) => {
    await api.post('/admin/boards', boardData);
    await fetchBoards();
  };

  const updateBoard = async (boardId: string, updates: Partial<Board>) => {
    await api.put(`/admin/boards/${boardId}`, updates);
    await fetchBoards();
  };

  const deleteBoard = async (id: string) => {
    await api.delete(`/admin/boards/${id}`);
    await fetchBoards();
  };

  const fetchBoardPermissions = async (boardList: Board[]) => {
    const permissionsState: Record<string, BoardPermission[]> = {};
    for (const board of boardList) {
      try {
        const res = await api.get(`/admin/boards/${board.id}/permissions`);
        permissionsState[board.id] = res.data.data || res.data;
      } catch (err) {
        if (import.meta.env.DEV) console.error(`권한 조회 실패 (${board.name}):`, err);
      }
    }
    setPermissions(permissionsState);
  };

  const updatePermission = async (
    boardId: string,
    roleId: string,
    type: 'canRead' | 'canWrite' | 'canDelete',
    roles: Role[]
  ) => {
    if (saving[boardId]) return;

    setPermissions(prev => {
      const boardPerms = prev[boardId] || [];
      const existingIndex = boardPerms.findIndex(p => p.roleId === roleId);
      let updatedPerms;

      if (existingIndex >= 0) {
        updatedPerms = boardPerms.map(p => (p.roleId === roleId ? { ...p, [type]: !p[type] } : p));
      } else {
        const role = roles.find(r => r.id === roleId);
        if (!role) return prev;
        updatedPerms = [
          ...boardPerms,
          {
            roleId,
            roleName: role.name,
            canRead: type === 'canRead',
            canWrite: type === 'canWrite',
            canDelete: type === 'canDelete',
          },
        ];
      }

      // UI Optimistic Update
      setSaving(s => ({ ...s, [boardId]: true }));

      // Debounced API Call Logic would go here or in component
      // For now, let's keep it simple and just return state
      // The actual API call saves the state

      savePermissions(boardId, updatedPerms).finally(() => {
        setSaving(s => ({ ...s, [boardId]: false }));
      });

      return { ...prev, [boardId]: updatedPerms };
    });
  };

  const savePermissions = async (boardId: string, perms: BoardPermission[]) => {
    try {
      // Filter valid perms
      const validPermissions = perms.map(p => ({
        roleId: p.roleId,
        canRead: p.canRead,
        canWrite: p.canWrite,
        canDelete: p.canDelete,
      }));

      await api.put(`/admin/boards/${boardId}/permissions`, {
        permissions: validPermissions,
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('권한 저장 실패:', err);
    }
  };

  return {
    boards,
    permissions,
    loading,
    saving,
    dataLoaded,
    fetchBoards,
    addBoard,
    updateBoard,
    deleteBoard,
    fetchBoardPermissions,
    updatePermission,
    setDataLoaded,
    fetchError,
  };
};
