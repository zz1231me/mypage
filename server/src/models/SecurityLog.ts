import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export interface SecurityLogAttributes {
  id: string;
  userId?: string | null;
  ipAddress: string | null;
  action: string;
  method: string;
  route: string;
  userAgent: string;
  status: string;
  details?: any;
  createdAt?: string;
}

export interface SecurityLogCreationAttributes extends Optional<SecurityLogAttributes, 'id'> {}

export class SecurityLog
  extends Model<SecurityLogAttributes, SecurityLogCreationAttributes>
  implements SecurityLogAttributes
{
  public id!: string;
  public userId?: string | null;
  public ipAddress!: string | null;
  public action!: string;
  public method!: string;
  public route!: string;
  public userAgent!: string;
  public status!: string;
  public details?: any;
  public readonly createdAt!: string;
}

SecurityLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true, // 내부 시스템 이벤트 등 IP가 없는 경우 허용
      defaultValue: null,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    route: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Unknown',
    },
    status: {
      type: DataTypes.STRING, // ENUM('SUCCESS', 'FAILURE') -> STRING to support 'WARNING', 'CRITICAL' etc.
      defaultValue: 'SUCCESS',
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'security_logs',
    timestamps: true,
    updatedAt: false, // 로그는 수정되지 않음
    indexes: [
      { fields: ['createdAt'] },
      { fields: ['userId'] },
      { fields: ['action'] },
      { fields: ['status'] },
    ],
  }
);

export default SecurityLog;
