import { getISOWeek, getISOWeekYear } from 'date-fns';
import WeeklySchedule, { IScheduleSlot } from '../models/WeeklySchedule.model';

const GAMES = ['flappy', 'maze', 'jumper'];

export function getCurrentWeekId(): string {
  const now = new Date();
  const week = getISOWeek(now);
  const year = getISOWeekYear(now);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function generateSlots(): IScheduleSlot[] {
  // 5 slots, ≤2 of any game type, shuffled
  const pool: string[] = [];
  // Each game appears at least once (3 games × 1 = 3 slots used)
  pool.push(...GAMES);
  // Fill remaining 2 slots randomly, but no game exceeds 2 total
  const counts: Record<string, number> = { flappy: 1, maze: 1, jumper: 1 };
  while (pool.length < 5) {
    const eligible = GAMES.filter((g) => counts[g] < 2);
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    pool.push(pick);
    counts[pick]++;
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.map((gameId, slotIndex) => ({ slotIndex, gameId }));
}

export async function getOrCreateSchedule(weekId: string) {
  const existing = await WeeklySchedule.findOne({ weekId });
  if (existing) return existing;

  const slots = generateSlots();
  const schedule = await WeeklySchedule.create({ weekId, slots });
  return schedule;
}
