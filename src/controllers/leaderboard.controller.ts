import { Request, Response } from 'express';
import LeaderboardEntry from '../models/LeaderboardEntry.model';
import GameUser from '../models/GameUser.model';
import AuthUser from '../models/AuthUser.model';
import { spendCoins, awardCoins } from '../services/coins.service';
import { getCurrentWeekId } from '../services/schedule.service';
import { AuthRequest } from '../middleware/auth';

export async function submitScore(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { weekId, gameId, score } = req.body;

  if (!weekId || !gameId || score === undefined) {
    return res.status(400).json({ error: 'weekId, gameId, and score are required' });
  }

  const gameUser = await GameUser.findOne({ userId });
  if (!gameUser) return res.status(404).json({ error: 'Game profile not found' });

  const currentWeekId = getCurrentWeekId();
  // Reset weekly plays if week changed
  if (gameUser.currentWeekId !== currentWeekId) {
    gameUser.currentWeekId = currentWeekId;
    gameUser.weeklyPlaysRemaining = 5;
    await gameUser.save();
  }

  const isFreePlay = gameUser.weeklyPlaysRemaining > 0;
  const isRetry = !isFreePlay;

  if (isRetry) {
    // Check if entry already exists (must be a retry)
    const existing = await LeaderboardEntry.findOne({ userId, weekId, gameId });
    if (!existing) {
      // First play but no plays remaining — shouldn't happen normally
      return res.status(403).json({ error: 'No plays remaining for this week' });
    }
    // Charge 3 coins
    try {
      await spendCoins(userId, 3, 'retry_spend', gameId);
    } catch {
      return res.status(402).json({ error: 'Insufficient coins for retry' });
    }
  }

  // Upsert with $max to keep only best score
  const authUser = await AuthUser.findById(userId);
  const displayName = authUser?.displayName ?? 'Player';

  const existing = await LeaderboardEntry.findOne({ userId, weekId, gameId });
  const prevBest = existing?.bestScore ?? -1;

  await LeaderboardEntry.findOneAndUpdate(
    { userId, weekId, gameId },
    {
      $max: { bestScore: score },
      $set: { displayName },
      $setOnInsert: { userId, weekId, gameId },
    },
    { upsert: true }
  );

  const isNewBest = score > prevBest;

  // Decrement free plays only on first play
  if (isFreePlay) {
    gameUser.weeklyPlaysRemaining = Math.max(0, gameUser.weeklyPlaysRemaining - 1);
    gameUser.totalGamesPlayed += 1;
    await gameUser.save();
    // Award +1 coin per game
    await awardCoins(userId, 1, 'game_reward', gameId).catch(() => {});
  }

  return res.json({ accepted: true, isNewBest });
}

export async function getLeaderboard(req: Request, res: Response) {
  const { weekId } = req.params;
  const { gameId } = req.query;

  const filter: Record<string, unknown> = { weekId };
  if (gameId) filter.gameId = gameId;

  const entries = await LeaderboardEntry.find(filter)
    .sort({ bestScore: -1 })
    .limit(100)
    .lean();

  // Add rank (handle ties: same score = same rank)
  let rank = 0;
  let prevScore = -1;
  let sameRankCount = 0;

  const ranked = entries.map((entry) => {
    if (entry.bestScore !== prevScore) {
      rank = rank + 1 + sameRankCount;
      sameRankCount = 0;
      prevScore = entry.bestScore;
    } else {
      sameRankCount++;
    }
    return { ...entry, rank };
  });

  return res.json({ weekId, entries: ranked });
}

export async function getTop1Pct(req: Request, res: Response) {
  const { weekId } = req.params;

  const total = await LeaderboardEntry.countDocuments({ weekId });
  const cutoff = Math.max(1, Math.ceil(total * 0.01));

  const entries = await LeaderboardEntry.find({ weekId })
    .sort({ bestScore: -1 })
    .limit(cutoff)
    .populate('userId', 'email displayName')
    .lean();

  return res.json({ weekId, cutoff, winners: entries });
}

export async function detectTies(req: Request, res: Response) {
  const { weekId } = req.params;
  const { gameId } = req.query;

  const filter: Record<string, unknown> = { weekId };
  if (gameId) filter.gameId = gameId;

  const entries = await LeaderboardEntry.find(filter).sort({ bestScore: -1 }).lean();
  if (entries.length < 2) return res.json({ tied: false, groups: [] });

  const topScore = entries[0].bestScore;
  const tiedEntries = entries.filter((e) => e.bestScore === topScore);

  if (tiedEntries.length > 1) {
    return res.json({ tied: true, score: topScore, tiedUsers: tiedEntries.map((e) => ({ userId: e.userId, displayName: e.displayName })) });
  }

  return res.json({ tied: false });
}
