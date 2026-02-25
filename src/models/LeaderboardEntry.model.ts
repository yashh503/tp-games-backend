import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILeaderboardEntry extends Document {
  userId: Types.ObjectId;
  weekId: string;
  gameId: string;
  bestScore: number;
  displayName: string;
  rank?: number;
  isTiebreaker: boolean;
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true },
    weekId: { type: String, required: true },
    gameId: { type: String, required: true },
    bestScore: { type: Number, required: true, default: 0 },
    displayName: { type: String, required: true },
    rank: { type: Number },
    isTiebreaker: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound unique: one entry per user per week per game
LeaderboardEntrySchema.index({ userId: 1, weekId: 1, gameId: 1 }, { unique: true });
// For fast leaderboard queries
LeaderboardEntrySchema.index({ weekId: 1, gameId: 1, bestScore: -1 });

export default mongoose.model<ILeaderboardEntry>('LeaderboardEntry', LeaderboardEntrySchema);
