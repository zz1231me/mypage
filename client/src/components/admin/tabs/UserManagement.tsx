import { useState, useEffect, useRef } from 'react';
import { formatDateTime } from '../../../utils/date';
import { User } from '../../../types/admin.types';
import { useUserManagement } from '../../../hooks/admin/useUserManagement';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { AdminSection } from '../common/AdminSection';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { AdminFormField, adminInputCls } from '../common/AdminFormField';
import { toast } from '../../../utils/toast';
import {
  approveUser,
  rejectUser,
  deactivateUser,
  restoreUser,
  fetchDeletedUsers as fetchDeletedUsersApi,
} from '../../../api/admin';
import { UserActivityModal } from './UserActivityModal';

export const UserManagement = () => {
  const {
    users,
    roles,
    fetchUsers,
    fetchRoles,
    addUser,
    updateUserRole,
    deleteUser,
    resetPassword,
    loading,
  } = useUserManagement();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [userForm, setUserForm] = useState({ id: '', name: '', role: '' });
  const [newUserInfo, setNewUserInfo] = useState<{ id: string; password: string } | null>(null);
  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    userId: string;
    label: string;
  } | null>(null);
  const [activityModal, setActivityModal] = useState<{ userId: string; userName: string } | null>(
    null
  );

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
      ''
    );
  };

  const newUserTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (newUserTimerRef.current) clearTimeout(newUserTimerRef.current);
    };
  }, []);

  const handleAddUser = async () => {
    try {
      const randomPassword = generateRandomPassword();
      await addUser({ ...userForm, password: randomPassword });
      setNewUserInfo({ id: userForm.id, password: randomPassword });
      if (newUserTimerRef.current) clearTimeout(newUserTimerRef.current);
      newUserTimerRef.current = setTimeout(() => setNewUserInfo(null), 15000);
      setUserForm({ id: '', name: '', role: roles[0]?.id || '' });
    } catch {
      toast.error('사용자 추가에 실패했습니다.');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success('역할이 변경되었습니다.');
    } catch {
      toast.error('역할 변경에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      toast.success('계정이 삭제되었습니다.');
      fetchUsers();
      loadDeletedUsers();
      setShowDeleted(true);
    } catch {
      toast.error('계정 삭제에 실패했습니다.');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const pw = await resetPassword(id);
      toast.success(`비밀번호가 초기화되었습니다. 임시 비밀번호: ${pw}`);
    } catch {
      toast.error('비밀번호 초기화에 실패했습니다.');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await approveUser(userId);
      toast.success('회원이 승인되었습니다.');
      fetchUsers();
    } catch {
      toast.error('승인에 실패했습니다.');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await rejectUser(userId);
      toast.success('가입 신청이 거부되었습니다.');
      fetchUsers();
    } catch {
      toast.error('거부 처리에 실패했습니다.');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await deactivateUser(userId);
      toast.success('사용자가 비활성화되었습니다.');
      fetchUsers();
    } catch {
      toast.error('비활성화에 실패했습니다.');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      await restoreUser(userId);
      toast.success('계정이 복구되었습니다.');
      loadDeletedUsers();
      fetchUsers();
    } catch {
      toast.error('복구에 실패했습니다.');
    } finally {
      setConfirmAction(null);
    }
  };

  const loadDeletedUsers = async () => {
    try {
      setDeletedUsers(await fetchDeletedUsersApi());
    } catch {
      toast.error('삭제된 사용자 목록을 불러오지 못했습니다.');
    }
  };

  const requestConfirm = (type: string, userId: string, label: string) => {
    setConfirmAction({ type, userId, label });
  };

  const executeConfirm = () => {
    if (!confirmAction) return;
    const { type, userId } = confirmAction;
    if (type === 'delete') handleDeleteUser(userId);
    else if (type === 'reject') handleRejectUser(userId);
    else if (type === 'deactivate') handleDeactivateUser(userId);
    else if (type === 'restore') handleRestoreUser(userId);
    else if (type === 'resetPassword') handleResetPassword(userId);
    else if (type === 'approve') handleApproveUser(userId);
  };

  const activeUsers = users.filter(u => u.isActive !== false);
  const pendingUsers = users.filter(u => u.isActive === false);

  const filteredActive = activeUsers.filter(
    u =>
      !searchQuery ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingSpinner message="사용자 목록을 불러오는 중..." />;

  return (
    <div className="space-y-8">
      <ConfirmationModal
        open={!!confirmAction}
        title="정말 실행하시겠습니까?"
        message={confirmAction?.label}
        confirmLabel="확인"
        onConfirm={executeConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      {/* 1. 사용자 추가 */}
      <AdminSection title="사용자 직접 추가">
        {newUserInfo && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                계정이 생성되었습니다. 지금 복사해두세요!
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-green-700 dark:text-green-400">
                  ID:{' '}
                  <code className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-green-300 dark:border-green-700 font-mono">
                    {newUserInfo.id}
                  </code>
                </span>
                <span className="text-green-700 dark:text-green-400">
                  PW:{' '}
                  <code className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-green-300 dark:border-green-700 font-mono">
                    {newUserInfo.password}
                  </code>
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                15초 후 자동으로 사라집니다.
              </p>
            </div>
            <button
              onClick={() => setNewUserInfo(null)}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 text-lg leading-none mt-0.5"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-3 items-end">
          <AdminFormField label="아이디">
            <input
              type="text"
              value={userForm.id}
              onChange={e => setUserForm({ ...userForm, id: e.target.value })}
              className={adminInputCls()}
              placeholder="아이디"
            />
          </AdminFormField>
          <AdminFormField label="이름">
            <input
              type="text"
              value={userForm.name}
              onChange={e => setUserForm({ ...userForm, name: e.target.value })}
              className={adminInputCls()}
              placeholder="이름"
            />
          </AdminFormField>
          <AdminFormField label="역할">
            <select
              value={userForm.role}
              onChange={e => setUserForm({ ...userForm, role: e.target.value })}
              className={adminInputCls()}
            >
              <option value="">역할 선택</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </AdminFormField>
          <button
            onClick={handleAddUser}
            disabled={!userForm.id || !userForm.name || !userForm.role}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
          >
            계정 생성
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          비밀번호는 10자리 난수로 자동 생성됩니다. 아이디는 한글·영문·숫자·
          <code className="font-mono">. @ - _</code> 사용 가능 (최대 30자, 공백 불가)
        </p>
      </AdminSection>

      {/* 2. 승인 대기 */}
      {pendingUsers.length > 0 && (
        <AdminSection
          title={`승인 대기 (${pendingUsers.length}명)`}
          actions={
            <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
              조치 필요
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    아이디
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    신청일
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pendingUsers.map(user => (
                  <tr key={user.id} className="hover:bg-amber-50 dark:hover:bg-amber-900/10">
                    <td className="px-3 py-3 font-mono text-slate-900 dark:text-slate-100">
                      {user.id}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {user.name}
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            requestConfirm(
                              'approve',
                              user.id,
                              `'${user.name}' 회원을 승인하면 즉시 로그인이 가능합니다.`
                            )
                          }
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() =>
                            requestConfirm(
                              'reject',
                              user.id,
                              `'${user.name}' 회원의 가입 신청을 거부합니다. 이 작업은 되돌릴 수 없습니다.`
                            )
                          }
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
                        >
                          거부
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      )}

      {/* 3. 활성 사용자 목록 */}
      <AdminSection
        title={`사용자 목록 (${activeUsers.length}명)`}
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/api/admin/export/users"
              className="px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              download
            >
              Excel 내보내기
            </a>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="아이디 / 이름 검색..."
              className="w-48 px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  아이디
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  이름
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  역할
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredActive.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    {searchQuery ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredActive.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-3 py-3 font-mono text-slate-900 dark:text-slate-100">
                      {user.id}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {user.name}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={user.roleId}
                        onChange={e => handleUpdateUserRole(user.id, e.target.value)}
                        className="px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        활성
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            requestConfirm(
                              'resetPassword',
                              user.id,
                              `'${user.name}' 계정의 비밀번호를 초기화합니다.`
                            )
                          }
                          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                        >
                          비번 초기화
                        </button>
                        <button
                          onClick={() =>
                            requestConfirm(
                              'deactivate',
                              user.id,
                              `'${user.name}' 계정을 비활성화하면 로그인이 차단됩니다.`
                            )
                          }
                          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 dark:hover:bg-amber-900/20 transition-colors"
                        >
                          비활성화
                        </button>
                        <button
                          onClick={() => setActivityModal({ userId: user.id, userName: user.name })}
                          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                          활동 내역
                        </button>
                        <button
                          onClick={() =>
                            requestConfirm(
                              'delete',
                              user.id,
                              `'${user.name}' 계정을 삭제합니다. 이 작업은 되돌리기 어렵습니다.`
                            )
                          }
                          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      {/* 4. 삭제된 계정 */}
      <AdminSection
        title="삭제된 계정"
        actions={
          <button
            onClick={() => {
              if (!showDeleted && deletedUsers.length === 0) loadDeletedUsers();
              setShowDeleted(v => !v);
            }}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {showDeleted ? '접기' : '펼치기'}
          </button>
        }
      >
        {showDeleted && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    익명화 ID
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    삭제일
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {deletedUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-slate-400 dark:text-slate-500"
                    >
                      삭제된 계정이 없습니다.
                    </td>
                  </tr>
                ) : (
                  deletedUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-3 py-3 font-mono text-slate-500 dark:text-slate-400">
                        {user.anonymizedName || `삭제된계정_${user.id}`}
                      </td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{user.name}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500">
                        {user.deletedAt ? formatDateTime(user.deletedAt) : '-'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() =>
                            requestConfirm('restore', user.id, `'${user.id}' 계정을 복구합니다.`)
                          }
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-600 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          복구
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {/* 활동 내역 모달 */}
      {activityModal && (
        <UserActivityModal
          userId={activityModal.userId}
          userName={activityModal.userName}
          onClose={() => setActivityModal(null)}
        />
      )}
    </div>
  );
};

export default UserManagement;
