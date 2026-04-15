import { BaseService } from './base.service';
import { Role, RoleInstance } from '../models/Role';
import { BoardAccess } from '../models/BoardAccess';
import { AppError } from '../middlewares/error.middleware';
import { sequelize } from '../config/sequelize';

export class RoleService extends BaseService {
  async getAllRoles(): Promise<RoleInstance[]> {
    try {
      return await Role.findAll();
    } catch (_error) {
      throw new AppError(500, '역할 조회 실패');
    }
  }

  async createRole(data: {
    id: string;
    name: string;
    description?: string;
  }): Promise<RoleInstance> {
    const existing = await Role.findByPk(data.id);
    if (existing) {
      throw new AppError(409, '이미 존재하는 역할입니다.');
    }

    try {
      return await Role.create({
        ...data,
        isActive: true,
      });
    } catch (_error) {
      throw new AppError(500, '역할 생성 실패');
    }
  }

  async updateRole(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean }
  ): Promise<RoleInstance> {
    const role = await Role.findByPk(id);
    if (!role) {
      throw new AppError(404, '역할을 찾을 수 없습니다.');
    }

    try {
      if (data.name !== undefined) role.name = data.name;
      if (data.description !== undefined) role.description = data.description;
      if (data.isActive !== undefined) role.isActive = data.isActive;

      await role.save();
      return role;
    } catch (_error) {
      throw new AppError(500, '역할 수정 실패');
    }
  }

  async deleteRole(id: string): Promise<void> {
    const role = await Role.findByPk(id);
    if (!role) {
      throw new AppError(404, '역할을 찾을 수 없습니다.');
    }

    try {
      await role.destroy();
    } catch (_error) {
      throw new AppError(500, '역할 삭제 실패');
    }
  }

  async getBoardAccessPermissions(boardId: string) {
    try {
      return await BoardAccess.findAll({
        where: { boardId },
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name'],
          },
        ],
      });
    } catch (_error) {
      throw new AppError(500, '권한 조회 실패');
    }
  }

  async setBoardAccessPermissions(
    boardId: string,
    permissions: Array<{
      roleId: string;
      canRead?: boolean;
      canWrite?: boolean;
      canDelete?: boolean;
    }>
  ): Promise<void> {
    const t = await sequelize.transaction();
    try {
      await BoardAccess.destroy({ where: { boardId }, transaction: t });

      for (const perm of permissions) {
        await BoardAccess.create(
          {
            boardId,
            roleId: perm.roleId,
            canRead: perm.canRead ?? true,
            canWrite: perm.canWrite ?? false,
            canDelete: perm.canDelete ?? false,
          },
          { transaction: t }
        );
      }

      await t.commit();
    } catch (_error) {
      await t.rollback();
      throw new AppError(500, '권한 설정 실패');
    }
  }
}

export const roleService = new RoleService();
