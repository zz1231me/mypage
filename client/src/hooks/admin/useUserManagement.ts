import { useState } from 'react';
import api from '../../api/axios';
import { User, Role } from '../../types/admin.types';

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get('/admin/users');
      setUsers(res.data.data || res.data);
      setDataLoaded(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error('사용자 목록 오류:', err);
      setFetchError('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/admin/roles');
      setRoles(res.data.data || res.data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('권한 목록 오류:', err);
    }
  };

  const addUser = async (userData: {
    id: string;
    name: string;
    role: string;
    password: string;
  }) => {
    await api.post('/admin/users', {
      id: userData.id,
      name: userData.name,
      roleId: userData.role,
      password: userData.password,
    });
    await fetchUsers();
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    await api.put(`/admin/users/${userId}`, { roleId: newRole });
    await fetchUsers();
  };

  const deleteUser = async (id: string) => {
    await api.delete(`/admin/users/${id}`);
    await fetchUsers();
  };

  const resetPassword = async (id: string) => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const pool = upper + lower + digits;
    const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
    const pw =
      rand(upper) +
      rand(lower) +
      rand(digits) +
      Array.from({ length: 5 }, () => rand(pool)).join('');
    await api.post(`/admin/users/${id}/reset-password`, { newPassword: pw });
    return pw;
  };

  return {
    users,
    roles,
    loading,
    dataLoaded,
    fetchUsers,
    fetchRoles,
    addUser,
    updateUserRole,
    deleteUser,
    resetPassword,
    setDataLoaded,
    fetchError,
  };
};
