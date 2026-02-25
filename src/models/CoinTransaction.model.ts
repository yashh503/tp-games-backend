import mongoose, { Document, Schema, Types } from 'mongoose';

export type CoinReason = 'game_reward' | 'retry_spend' | 'streak_bonus' | 'admin_grant';

export interface ICoinTransaction extends Document {
  userId: Types.ObjectId;
  delta: number;
  reason: CoinReason;
  gameId?: string;
}

const CoinTransactionSchema = new Schema<ICoinTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true, index: true },
    delta: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['game_reward', 'retry_spend', 'streak_bonus', 'admin_grant'],
      required: true,
    },
    gameId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ICoinTransaction>('CoinTransaction', CoinTransactionSchema);
