import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
} from 'sequelize';
import { sequelize } from '../config/sequelize';

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

class PostReactionModel extends Model<
  InferAttributes<PostReactionModel>,
  InferCreationAttributes<PostReactionModel>
> {
  declare public id: CreationOptional<number>;
  declare public PostId: ForeignKey<string>;
  declare public UserId: ForeignKey<string>;
  declare public type: ReactionType;
  declare public readonly createdAt: CreationOptional<Date>;
  declare public readonly updatedAt: CreationOptional<Date>;
}

PostReactionModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    PostId: { type: DataTypes.STRING(12), allowNull: false },
    UserId: { type: DataTypes.STRING(50), allowNull: false },
    type: { type: DataTypes.ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry'), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'PostReactions',
    modelName: 'PostReaction',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['PostId', 'UserId'] },
      { fields: ['PostId'] },
      { fields: ['UserId'] },
    ],
  }
);

export const PostReaction = PostReactionModel;
export type PostReaction = PostReactionModel;
export default PostReactionModel;
