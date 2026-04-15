import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export interface LoginHistoryAttributes {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status: 'success' | 'failed' | 'locked';
  failureReason?: string | null;
  createdAt?: Date;
}

export interface LoginHistoryCreationAttributes extends Optional<LoginHistoryAttributes, 'id'> {}

export class LoginHistory
  extends Model<LoginHistoryAttributes, LoginHistoryCreationAttributes>
  implements LoginHistoryAttributes
{
  public id!: string;
  public userId?: string | null;
  public userName?: string | null;
  public userRole?: string | null;
  public ipAddress?: string | null;
  public userAgent?: string | null;
  public status!: 'success' | 'failed' | 'locked';
  public failureReason?: string | null;
  public readonly createdAt!: Date;
}

LoginHistory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.STRING(50), allowNull: true },
    userName: { type: DataTypes.STRING(100), allowNull: true },
    userRole: { type: DataTypes.STRING(50), allowNull: true },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true },
    userAgent: { type: DataTypes.STRING(500), allowNull: true },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'locked'),
      allowNull: false,
    },
    failureReason: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    tableName: 'login_history',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
      { fields: ['userId', 'createdAt'] },
    ],
  }
);

export default LoginHistory;
