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

class WikiPageModel extends Model<
  InferAttributes<WikiPageModel>,
  InferCreationAttributes<WikiPageModel>
> {
  declare public id: CreationOptional<number>;
  declare public slug: string;
  declare public title: string;
  declare public content: CreationOptional<string>;
  declare public parentId: CreationOptional<number | null>;
  declare public authorId: ForeignKey<string | null>;
  declare public lastEditorId: CreationOptional<string | null>;
  declare public order: CreationOptional<number>;
  declare public isPublished: CreationOptional<boolean>;
  declare public readonly createdAt: CreationOptional<Date>;
  declare public readonly updatedAt: CreationOptional<Date>;
  // virtual associations
  declare public children?: NonAttribute<WikiPageModel[]>;
}

WikiPageModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(200), allowNull: false }, // unique는 indexes에서 관리
    title: { type: DataTypes.STRING(200), allowNull: false },
    content: { type: DataTypes.TEXT('long'), allowNull: true, defaultValue: '' },
    parentId: { type: DataTypes.INTEGER, allowNull: true },
    authorId: { type: DataTypes.STRING(50), allowNull: true }, // SET NULL 지원을 위해 nullable
    lastEditorId: { type: DataTypes.STRING(50), allowNull: true },
    order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'WikiPages',
    modelName: 'WikiPage',
    timestamps: true,
    indexes: [{ unique: true, fields: ['slug'] }],
  }
);

export const WikiPage = WikiPageModel;
export type WikiPage = WikiPageModel;
export default WikiPageModel;
