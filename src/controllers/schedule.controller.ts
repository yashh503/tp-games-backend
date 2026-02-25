import { Request, Response } from 'express';
import { getCurrentWeekId, getOrCreateSchedule } from '../services/schedule.service';
import WeeklySchedule from '../models/WeeklySchedule.model';

export async function getCurrentSchedule(_req: Request, res: Response) {
  const weekId = getCurrentWeekId();
  const schedule = await getOrCreateSchedule(weekId);
  return res.json({ weekId, slots: schedule.slots });
}

export async function getScheduleByWeek(req: Request, res: Response) {
  const { weekId } = req.params;
  const schedule = await WeeklySchedule.findOne({ weekId });
  if (!schedule) return res.status(404).json({ error: 'Schedule not found for this week' });
  return res.json({ weekId, slots: schedule.slots });
}
