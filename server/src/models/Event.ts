import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/sequelize';

// 타입 전용 import
import type { UserInstance } from './User';

// ✅ EventInstance 타입 정의
export interface EventInstance extends Model<
  InferAttributes<EventInstance>,
  InferCreationAttributes<EventInstance>
> {
  id: CreationOptional<number>;
  calendarId: string;
  title: string;
  body?: string;
  isAllday: boolean;
  start: Date;
  end: Date;
  category?: string;
  location?: string;
  attendees?: any;
  state?: string;
  isReadOnly: boolean;
  color?: string;
  backgroundColor?: string;
  dragBackgroundColor?: string;
  borderColor?: string;
  customStyle?: any;
  UserId: ForeignKey<string>; // ✅ 작성자 필드 추가
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceInterval?: number;
  recurrenceDays?: number[] | null;
  recurrenceEndDate?: Date | null;
  parentEventId?: number | null;
  createdAt: CreationOptional<Date>;
  updatedAt: CreationOptional<Date>;

  // 관계 데이터
  user?: NonAttribute<UserInstance>;
}

// ✅ Event 클래스 정의
export class Event
  extends Model<InferAttributes<EventInstance>, InferCreationAttributes<EventInstance>>
  implements EventInstance
{
  declare public id: CreationOptional<number>;
  declare public calendarId: string;
  declare public title: string;
  declare public body?: string;
  declare public isAllday: boolean;
  declare public start: Date;
  declare public end: Date;
  declare public category?: string;
  declare public location?: string;
  declare public attendees?: any;
  declare public state?: string;
  declare public isReadOnly: boolean;
  declare public color?: string;
  declare public backgroundColor?: string;
  declare public dragBackgroundColor?: string;
  declare public borderColor?: string;
  declare public customStyle?: any;
  declare public UserId: ForeignKey<string>; // ✅ 작성자 필드
  declare public recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  declare public recurrenceInterval?: number;
  declare public recurrenceDays?: number[] | null;
  declare public recurrenceEndDate?: Date | null;
  declare public parentEventId?: number | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  // 관계 데이터
  // 관계 데이터
  declare public user?: NonAttribute<UserInstance>;
}

// 모델 초기화
Event.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    calendarId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isAllday: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    start: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    attendees: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isReadOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    backgroundColor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dragBackgroundColor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    borderColor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customStyle: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    UserId: {
      // ✅ 작성자 필드 추가
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    recurrenceType: {
      type: DataTypes.ENUM('none', 'daily', 'weekly', 'monthly', 'yearly'),
      allowNull: false,
      defaultValue: 'none',
    },
    recurrenceInterval: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    recurrenceDays: { type: DataTypes.JSON, allowNull: true },
    recurrenceEndDate: { type: DataTypes.DATE, allowNull: true },
    parentEventId: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Event',
    tableName: 'Events',
    timestamps: true,
  }
);

Event.belongsTo(Event, { as: 'parentEvent', foreignKey: 'parentEventId', constraints: false });
Event.hasMany(Event, { as: 'instances', foreignKey: 'parentEventId', constraints: false });

export default Event;
