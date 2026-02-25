import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  deviceId: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  gamesCompletedToday: number;
  streakFreezeAvailable: boolean;
  lastStreakFreezeUsed: string | null;
  totalGamesPlayed: number;
  badges: string[];
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    totalPoints:           { type: Number, default: 0, min: 0 },
    currentStreak:         { type: Number, default: 0, min: 0 },
    longestStreak:         { type: Number, default: 0, min: 0 },
    lastActiveDate:        { type: String, default: null },
    gamesCompletedToday:   { type: Number, default: 0, min: 0, max: 10 },
    streakFreezeAvailable: { type: Boolean, default: true },
    lastStreakFreezeUsed:  { type: String, default: null },
    totalGamesPlayed:      { type: Number, default: 0, min: 0 },
    badges:                { type: [String], default: [] },
    lastSyncedAt:          { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
