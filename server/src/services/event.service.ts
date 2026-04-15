import { logError } from '../utils/logger';
import { BaseService } from './base.service';
import { Event, EventInstance } from '../models/Event';
import { EventPermission } from '../models/EventPermission';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { AppError } from '../middlewares/error.middleware';
import { sequelize } from '../config/sequelize';

export class EventService extends BaseService {
  async getAllEvents(): Promise<EventInstance[]> {
    try {
      return await Event.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
            include: [
              {
                model: Role,
                as: 'roleInfo',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
      });
    } catch (_error) {
      throw new AppError(500, '이벤트 조회 실패');
    }
  }

  async deleteEvent(id: string): Promise<void> {
    const event = await Event.findByPk(id);
    if (!event) {
      throw new AppError(404, '이벤트를 찾을 수 없습니다.');
    }

    try {
      await event.destroy();
    } catch (_error) {
      throw new AppError(500, '이벤트 삭제 실패');
    }
  }

  async updateEvent(id: string, data: Partial<EventInstance>): Promise<EventInstance> {
    const event = await Event.findByPk(id);
    if (!event) {
      throw new AppError(404, '이벤트를 찾을 수 없습니다.');
    }

    try {
      await event.update(data);
      return event;
    } catch (_error) {
      throw new AppError(500, '이벤트 수정 실패');
    }
  }

  async getEventPermissionsByRole() {
    try {
      // 1. 모든 역할 조회
      const roles = await Role.findAll();

      // 2. 설정된 권한 조회
      const existingPermissions = await EventPermission.findAll();

      // 3. 모든 역할에 대해 권한 매핑 (없으면 기본값)
      const result = roles.map(role => {
        const existing = existingPermissions.find(p => p.roleId === role.id);
        if (existing) {
          return {
            ...existing.toJSON(),
            role: { id: role.id, name: role.name },
          };
        } else {
          return {
            roleId: role.id,
            canCreate: true, // 기본값
            canRead: true, // 기본값
            canUpdate: false,
            canDelete: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: { id: role.id, name: role.name },
          };
        }
      });

      return result;
    } catch (error) {
      logError('이벤트 권한 조회 에러', error);
      throw new AppError(500, '이벤트 권한 조회 실패');
    }
  }

  async setEventPermissions(
    permissions: Array<{
      roleId: string;
      canCreate?: boolean;
      canRead?: boolean;
      canUpdate?: boolean;
      canDelete?: boolean;
    }>
  ): Promise<void> {
    const t = await sequelize.transaction();
    try {
      await Promise.all(
        permissions.map(async perm => {
          const [permission, created] = await EventPermission.findOrCreate({
            where: { roleId: perm.roleId },
            defaults: {
              roleId: perm.roleId,
              canCreate: perm.canCreate ?? true,
              canRead: perm.canRead ?? true,
              canUpdate: perm.canUpdate ?? false,
              canDelete: perm.canDelete ?? false,
            },
            transaction: t,
          });

          if (!created) {
            await permission.update(
              {
                canCreate: perm.canCreate ?? permission.canCreate,
                canRead: perm.canRead ?? permission.canRead,
                canUpdate: perm.canUpdate ?? permission.canUpdate,
                canDelete: perm.canDelete ?? permission.canDelete,
              },
              { transaction: t }
            );
          }
        })
      );
      await t.commit();
    } catch (_error) {
      await t.rollback();
      throw new AppError(500, '이벤트 권한 설정 실패');
    }
  }
}

export const eventService = new EventService();
