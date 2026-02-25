import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGameUser extends Document {
  userId: Types.ObjectId;
  coins: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  gamesCompletedToday: number;
  streakFreezeAvailable: boolean;
  lastStreakFreezeUsed: string | null;
  totalGamesPlayed: number;
  badges: string[];
  weeklyPlaysRemaining: number;
  currentWeekId: string;
}

const GameUserSchema = new Schema<IGameUser>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'AuthUser', required: true, unique: true },
    coins: { type: Number, default: 3, min: 0 },
    totalPoints: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null },
    gamesCompletedToday: { type: Number, default: 0 },
    streakFreezeAvailable: { type: Boolean, default: true },
    lastStreakFreezeUsed: { type: String, default: null },
    totalGamesPlayed: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    weeklyPlaysRemaining: { type: Number, default: 5 },
    currentWeekId: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IGameUser>('GameUser', GameUserSchema);
