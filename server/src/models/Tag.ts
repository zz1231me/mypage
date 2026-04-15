import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../config/sequelize';

class TagModel extends Model<InferAttributes<TagModel>, InferCreationAttributes<TagModel>> {
  declare public id: CreationOptional<number>;
  declare public name: string;
  declare public color: CreationOptional<string>;
  declare public description: CreationOptional<string | null>;
  declare public boardId: CreationOptional<string | null>; // null = 전체 공용 태그
  declare public readonly createdAt: CreationOptional<Date>;
  declare public readonly updatedAt: CreationOptional<Date>;
}

TagModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    color: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '#3b82f6' },
    description: { type: DataTypes.TEXT, allowNull: true },
    boardId: { type: DataTypes.STRING(50), allowNull: true, defaultValue: null },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'Tags',
    modelName: 'Tag',
    timestamps: true,
    // 인덱스는 addTagColumns 마이그레이션에서 수동으로 생성 (alter:false SQLite 호환)
    indexes: [],
  }
);

export const Tag = TagModel;
export type Tag = TagModel;
export default TagModel;
