// PermissionManagement.tsx - 권한 관리 컴포넌트

import { useEffect, useState } from 'react';
import { useBoardManagement } from '../../../hooks/admin/useBoardManagement';
import { useRoleManagement } from '../../../hooks/admin/useRoleManagement';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { AdminSection } from '../common/AdminSection';
import { PermissionGraph } from '../PermissionGraph';

export const PermissionManagement = () => {
  const {
    boards,
    permissions: boardPermissions,
    fetchBoards,
    fetchBoardPermissions,
    updatePermission,
    saving,
    loading: loadingBoards,
  } = useBoardManagement();

  const { roles, fetchRoles, loading: loadingRoles } = useRoleManagement();

  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    fetchBoards();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (boards.length > 0) {
      fetchBoardPermissions(boards);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards]);

  if (loadingBoards || loadingRoles) return <LoadingSpinner message="권한 설정을 불러오는 중..." />;

  const onPermissionToggle = (
    boardId: string,
    roleId: string,
    type: 'canRead' | 'canWrite' | 'canDelete'
  ) => {
    updatePermission(boardId, roleId, type, roles);
  };
  const graphAccesses = Object.entries(boardPermissions).flatMap(([boardId, perms]) =>
    perms.map(p => ({
      boardId,
      roleId: p.roleId,
      canRead: p.canRead,
      canWrite: p.canWrite,
    }))
  );

  return (
    <div className="space-y-8">
      <AdminSection
        title="⚙️ 게시판별 권한 설정"
        actions={
          <button
            type="button"
            onClick={() => setShowGraph(v => !v)}
            className="px-3 py-2 text-sm font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            {showGraph ? '📋 테이블 보기' : '🗺 관계도 보기'}
          </button>
        }
      >
        <div className="space-y-6">
          {boards.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              게시판이 없습니다. 먼저 게시판을 생성해주세요.
            </div>
          ) : (
            boards.map(board => (
              <div
                key={board.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm bg-white dark:bg-slate-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    📁 {board.name} ({board.id})
                  </h3>
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${
                      saving[board.id]
                        ? 'text-yellow-600 bg-yellow-50'
                        : 'text-slate-500 bg-green-50'
                    }`}
                  >
                    {saving[board.id] ? '💾 저장 중...' : '✅ 자동 저장됨'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">
                          권한
                        </th>
                        <th className="px-4 py-2 text-center font-medium text-slate-700 dark:text-slate-300">
                          읽기
                        </th>
                        <th className="px-4 py-2 text-center font-medium text-slate-700 dark:text-slate-300">
                          쓰기
                        </th>
                        <th className="px-4 py-2 text-center font-medium text-slate-700 dark:text-slate-300">
                          삭제
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roles.map(role => {
                        const permission = boardPermissions[board.id]?.find(
                          p => p.roleId === role.id
                        ) || {
                          roleId: role.id,
                          roleName: role.name,
                          canRead: false,
                          canWrite: false,
                          canDelete: false,
                        };

                        return (
                          <tr
                            key={role.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-xs font-medium">
                                {role.name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={permission.canRead}
                                onChange={() => onPermissionToggle(board.id, role.id, 'canRead')}
                                className="form-checkbox h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={permission.canWrite}
                                onChange={() => onPermissionToggle(board.id, role.id, 'canWrite')}
                                className="form-checkbox h-4 w-4 text-green-600 rounded focus:ring-green-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={permission.canDelete}
                                onChange={() => onPermissionToggle(board.id, role.id, 'canDelete')}
                                className="form-checkbox h-4 w-4 text-red-600 rounded focus:ring-red-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  💡 읽기: 게시판 목록 및 게시글 조회 권한 | 쓰기: 게시글 작성 권한 | 삭제: 게시글
                  삭제 권한
                </div>
              </div>
            ))
          )}
        </div>
        {showGraph && (
          <div className="mt-4">
            <PermissionGraph roles={roles} boards={boards} accesses={graphAccesses} />
          </div>
        )}
      </AdminSection>
    </div>
  );
};

export default PermissionManagement;
