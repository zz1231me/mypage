import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export type AuditAction =
  | 'create_user'
  | 'update_user'
  | 'delete_user'
  | 'restore_user'
  | 'approve_user'
  | 'reject_user'
  | 'deactivate_user'
  | 'reset_password'
  | 'change_role'
  | 'update_board'
  | 'delete_board'
  | 'update_permission'
  | 'delete_event'
  | 'update_site_settings'
  | 'force_logout';

export type AuditTargetType = 'user' | 'board' | 'role' | 'event' | 'setting';

export interface AuditLogAttributes {
  id: string;
  adminId: string;
  adminName: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  targetName?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterValue?: any;
  ipAddress?: string | null;
  createdAt?: Date;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id'> {}

export class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  declare public id: string;
  declare public adminId: string;
  declare public adminName: string;
  declare public action: AuditAction;
  declare public targetType: AuditTargetType;
  declare public targetId: string | null | undefined;
  declare public targetName: string | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare public beforeValue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare public afterValue: any;
  declare public ipAddress: string | null | undefined;
  declare public readonly createdAt: Date;
}

AuditLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    adminId: { type: DataTypes.STRING(50), allowNull: false },
    adminName: { type: DataTypes.STRING(100), allowNull: false },
    action: {
      type: DataTypes.ENUM(
        'create_user',
        'update_user',
        'delete_user',
        'restore_user',
        'approve_user',
        'reject_user',
        'deactivate_user',
        'reset_password',
        'change_role',
        'update_board',
        'delete_board',
        'update_permission',
        'delete_event',
        'update_site_settings',
        'force_logout'
      ),
      allowNull: false,
    },
    targetType: {
      type: DataTypes.ENUM('user', 'board', 'role', 'event', 'setting'),
      allowNull: false,
    },
    targetId: { type: DataTypes.STRING(100), allowNull: true },
    targetName: { type: DataTypes.STRING(200), allowNull: true },
    beforeValue: { type: DataTypes.JSON, allowNull: true },
    afterValue: { type: DataTypes.JSON, allowNull: true },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['adminId'] },
      { fields: ['action'] },
      { fields: ['targetType'] },
      { fields: ['targetId'] },
      { fields: ['createdAt'] },
      { fields: ['adminId', 'createdAt'] },
      { fields: ['targetType', 'targetId'] },
    ],
  }
);

export default AuditLog;
