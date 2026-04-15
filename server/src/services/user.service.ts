import { BaseService } from './base.service';
import { User, UserInstance } from '../models/User';
import { Role } from '../models/Role';
import { AppError } from '../middlewares/error.middleware';
import { processAvatar, deleteAvatarFile } from '../middlewares/upload/avatar';
import { Op } from 'sequelize';

export class UserService extends BaseService {
  async findById(id: string): Promise<UserInstance | null> {
    return User.findByPk(id, {
      paranoid: false, // ✅ deletedAt 컬럼 마이그레이션 전에도 쿼리 가능
      include: [
        {
          model: Role,
          as: 'roleInfo',
          attributes: ['id', 'name', 'description'],
        },
      ],
    });
  }

  async findByIdWithRole(id: string): Promise<UserInstance | null> {
    return User.findByPk(id, {
      paranoid: false, // ✅ deletedAt 컬럼 마이그레이션 전에도 쿼리 가능
      include: [
        {
          model: Role,
          as: 'roleInfo',
          attributes: ['id', 'name', 'description', 'isActive'],
        },
      ],
    });
  }

  async getAllUsers(isAdmin: boolean = false): Promise<UserInstance[]> {
    const whereCondition = isAdmin ? {} : { isDeleted: false };

    return User.findAll({
      where: whereCondition,
      include: [
        {
          model: Role,
          as: 'roleInfo', // Include role info
          attributes: ['id', 'name', 'description'],
        },
      ],
      attributes: ['id', 'name', 'email', 'roleId', 'isActive', 'createdAt', 'updatedAt'],
      order: [
        ['isActive', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  async getDeletedUsers(): Promise<UserInstance[]> {
    return User.findAll({
      where: {
        deletedAt: { [Op.ne]: null },
      },
      paranoid: false,
      include: [
        {
          model: Role,
          as: 'roleInfo',
          attributes: ['id', 'name'],
        },
      ],
      attributes: ['id', 'name', 'roleId', 'deletedAt', 'anonymizedName'],
      order: [['deletedAt', 'DESC']],
    });
  }

  async createUser(data: Partial<UserInstance>): Promise<UserInstance> {
    // ID Validation (관리자 생성: 한글/영문/숫자/./@/-/_ 허용, 공백 불허)
    const idRegex = /^[a-zA-Z0-9가-힣._@\-_]+$/;
    if (!data.id || data.id.trim().length === 0 || !idRegex.test(data.id) || /\s/.test(data.id)) {
      throw new AppError(400, '유효하지 않은 사용자 ID 형식입니다.');
    }

    const existing = await User.findByPk(data.id);
    if (existing) {
      throw new AppError(409, '이미 존재하는 사용자 ID입니다.');
    }

    // Role Validation
    if (data.roleId) {
      const role = await Role.findByPk(data.roleId);
      if (!role) {
        throw new AppError(400, '존재하지 않는 역할입니다.');
      }
    }

    // ✅ allowlist: 허용된 필드만 생성 (tokenVersion, isDeleted 등 민감 필드 주입 방지)
    return User.create({
      id: data.id,
      password: data.password,
      name: data.name,
      roleId: data.roleId,
      isActive: data.isActive ?? true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  async updateUser(id: string, data: Partial<UserInstance>): Promise<UserInstance> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError(404, '사용자를 찾을 수 없습니다.');
    }

    if (data.roleId) {
      const role = await Role.findByPk(data.roleId);
      if (!role) throw new AppError(400, '존재하지 않는 역할입니다.');
    }

    // 이메일 변경 시 중복 검사
    if (data.email !== undefined && data.email !== null && data.email !== user.email) {
      const existing = await User.findOne({ where: { email: data.email } });
      if (existing) throw new AppError(409, '이미 사용 중인 이메일입니다.');
    }

    // ✅ allowlist: 허용된 필드만 업데이트 (tokenVersion, password 등 민감 필드 덮어쓰기 방지)
    const allowed: Partial<UserInstance> = {};
    if (data.name !== undefined) allowed.name = data.name;
    if (data.email !== undefined) allowed.email = data.email;
    if (data.roleId !== undefined) allowed.roleId = data.roleId;
    if (data.isActive !== undefined) allowed.isActive = data.isActive;

    await user.update(allowed);
    return user;
  }

  async updateMyName(id: string, name: string): Promise<UserInstance> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');
    if (user.isDeletedAccount()) throw new AppError(400, '삭제된 계정입니다.');

    const trimmed = name.trim();
    if (!trimmed || trimmed.length === 0) throw new AppError(400, '이름은 필수입니다.');
    if (trimmed.length > 50) throw new AppError(400, '이름은 50자 이내여야 합니다.');

    await user.update({ name: trimmed });
    return user;
  }

  async approveUser(id: string): Promise<UserInstance> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');
    if (user.isActive) throw new AppError(400, '이미 승인된 사용자입니다.');

    user.isActive = true;
    await user.save();
    return user;
  }

  async rejectUser(id: string): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');
    if (user.isActive)
      throw new AppError(400, '이미 승인된 사용자는 거부할 수 없습니다. 삭제를 이용해주세요.');

    await user.destroy({ force: true });
  }

  async deactivateUser(id: string): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');

    user.isActive = false;
    await user.save();
  }

  async restoreUser(id: string): Promise<void> {
    const user = await User.findByPk(id, { paranoid: false });
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');

    if (!user.deletedAt) throw new AppError(400, '삭제된 사용자가 아닙니다.');

    await user.restore();
    // 삭제 플래그 해제 (소프트 삭제 모델링에 따라 필요)
    user.isDeleted = false;
    // 익명화된 이름이 있었다면 복구 할 수도 있으나,
    // 보통 익명화는 영구적일 수 있음. 여기서는 이름은 복구하지 않고 계정만 활성화하거나,
    // 필요하다면 기존 로직을 검토해야 함. 일단 계정 복구만 수행.
    await user.save();
  }

  async deleteUser(id: string): Promise<{ message: string; anonymizedName?: string }> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');

    // 이미 삭제된 계정 체크
    if (user.deletedAt) {
      throw new AppError(400, '이미 삭제된 계정입니다.');
    }

    // Soft Delete (beforeDestroy 훅에서 anonymizeAccount()가 호출되므로 여기서 직접 호출 불필요)
    await user.destroy();

    return {
      message: '사용자 삭제 완료',
      anonymizedName: user.anonymizedName ?? undefined,
    };
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');

    // 삭제된 계정 체크
    if (user.isDeletedAccount()) {
      throw new AppError(400, '삭제된 계정의 비밀번호는 변경할 수 없습니다.');
    }

    user.password = newPassword; // Hook handles hashing
    await user.save();
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');

    if (user.isDeletedAccount()) {
      throw new AppError(400, '삭제된 계정입니다.');
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new AppError(400, '현재 비밀번호가 틀렸습니다.');
    }

    user.password = newPassword; // Hook handles hashing
    await user.save();
  }

  async updateTheme(id: string, theme: string): Promise<string> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');

    if (!['light', 'dark', 'system'].includes(theme)) {
      throw new AppError(400, '유효하지 않은 테마입니다.');
    }

    user.theme = theme;
    await user.save();
    return user.theme;
  }

  async updateAvatar(id: string, fileBuffer: Buffer): Promise<string> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');

    if (user.avatar) {
      await deleteAvatarFile(user.avatar);
    }

    const avatarUrl = await processAvatar(fileBuffer, id);
    await user.update({ avatar: avatarUrl });

    return avatarUrl;
  }

  async deleteAvatar(id: string): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.');
    if (!user.avatar) throw new AppError(400, '삭제할 아바타가 없습니다.');

    await deleteAvatarFile(user.avatar);
    await user.update({ avatar: null });
  }
}

export const userService = new UserService();
