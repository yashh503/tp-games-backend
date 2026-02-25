import mongoose, { Document, Schema } from 'mongoose';

export interface IScheduleSlot {
  slotIndex: number;
  gameId: string;
}

export interface IWeeklySchedule extends Document {
  weekId: string;
  slots: IScheduleSlot[];
  generatedAt: Date;
}

const WeeklyScheduleSchema = new Schema<IWeeklySchedule>({
  weekId: { type: String, required: true, unique: true, index: true },
  slots: [
    {
      slotIndex: { type: Number, required: true },
      gameId: { type: String, required: true },
    },
  ],
  generatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IWeeklySchedule>('WeeklySchedule', WeeklyScheduleSchema);
