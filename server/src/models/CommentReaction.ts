// server/src/models/CommentReaction.ts - 댓글 리액션 모델
import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
} from 'sequelize';
import { sequelize } from '../config/sequelize';

export type CommentReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

class CommentReactionModel extends Model<
  InferAttributes<CommentReactionModel>,
  InferCreationAttributes<CommentReactionModel>
> {
  declare public id: CreationOptional<number>;
  declare public CommentId: ForeignKey<number>;
  declare public UserId: ForeignKey<string>;
  declare public type: CommentReactionType;
  declare public readonly createdAt: CreationOptional<Date>;
  declare public readonly updatedAt: CreationOptional<Date>;
}

CommentReactionModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    CommentId: { type: DataTypes.INTEGER, allowNull: false },
    UserId: { type: DataTypes.STRING(50), allowNull: false },
    type: {
      type: DataTypes.ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry'),
      allowNull: false,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'CommentReactions',
    modelName: 'CommentReaction',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['CommentId', 'UserId'] },
      { fields: ['CommentId'] },
      { fields: ['UserId'] },
    ],
  }
);

export const CommentReaction = CommentReactionModel;
export type CommentReaction = CommentReactionModel;
export default CommentReactionModel;
