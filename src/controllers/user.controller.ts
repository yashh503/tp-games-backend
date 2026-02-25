import { Response, NextFunction } from 'express';
import GameUser from '../models/GameUser.model';
import AuthUser from '../models/AuthUser.model';
import { AuthRequest } from '../middleware/auth';
import { awardCoins } from '../services/coins.service';
import { getCurrentWeekId } from '../services/schedule.service';

// GET /users/me — returns the authenticated user's full profile + game stats
export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;

    const [authUser, gameUser] = await Promise.all([
      AuthUser.findById(userId).lean(),
      GameUser.findOne({ userId }).lean(),
    ]);

    if (!authUser) return res.status(404).json({ error: 'User not found' });

    return res.json({
      user: {
        userId: authUser._id,
        email: authUser.email,
        displayName: authUser.displayName,
        ...(gameUser
          ? {
              coins: gameUser.coins,
              totalPoints: gameUser.totalPoints,
              currentStreak: gameUser.currentStreak,
              longestStreak: gameUser.longestStreak,
              lastActiveDate: gameUser.lastActiveDate,
              gamesCompletedToday: gameUser.gamesCompletedToday,
              streakFreezeAvailable: gameUser.streakFreezeAvailable,
              lastStreakFreezeUsed: gameUser.lastStreakFreezeUsed,
              totalGamesPlayed: gameUser.totalGamesPlayed,
              badges: gameUser.badges,
              weeklyPlaysRemaining: gameUser.weeklyPlaysRemaining,
              currentWeekId: gameUser.currentWeekId,
            }
          : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /users/game-complete — updates game stats server-side, returns updated profile
export async function recordGameComplete(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { gameId, score, stars } = req.body;

    if (!['flappy', 'maze', 'jumper'].includes(gameId)) {
      return res.status(400).json({ error: 'Invalid gameId' });
    }

    const gameUser = await GameUser.findOne({ userId });
    if (!gameUser) return res.status(404).json({ error: 'Game profile not found' });

    const today = todayString();
    const yesterday = yesterdayString();

    // --- Streak logic ---
    let streakJustIncremented = false;

    if (gameUser.lastActiveDate !== today) {
      // Date changed — check streak continuity
      if (gameUser.lastActiveDate !== yesterday) {
        // Gap > 1 day: try streak freeze, else reset
        if (gameUser.streakFreezeAvailable && gameUser.currentStreak > 0) {
          gameUser.streakFreezeAvailable = false;
          gameUser.lastStreakFreezeUsed = getCurrentWeekId();
        } else if (gameUser.lastActiveDate !== null) {
          gameUser.currentStreak = 0;
        }
      }
      // New day: reset daily counter
      gameUser.gamesCompletedToday = 0;
      gameUser.lastActiveDate = today;
    }

    // Increment daily game counter (cap at 2 for streak purposes)
    const alreadyCounted = gameUser.gamesCompletedToday >= 2;
    if (!alreadyCounted) {
      gameUser.gamesCompletedToday += 1;
    }

    // Second game of day completes the daily goal → increment streak
    if (!alreadyCounted && gameUser.gamesCompletedToday === 2) {
      gameUser.currentStreak += 1;
      if (gameUser.currentStreak > gameUser.longestStreak) {
        gameUser.longestStreak = gameUser.currentStreak;
      }
      streakJustIncremented = true;
      // Streak milestone badges
      addBadgesForStreak(gameUser);
    }

    // --- Points ---
    const points = calcPoints(gameId, score, stars, gameUser.currentStreak);
    gameUser.totalPoints += points;
    gameUser.totalGamesPlayed += 1;

    // --- Weekly plays reset if new week ---
    const currentWeekId = getCurrentWeekId();
    if (gameUser.currentWeekId !== currentWeekId) {
      gameUser.currentWeekId = currentWeekId;
      gameUser.weeklyPlaysRemaining = 5;
    }

    await gameUser.save();

    // --- Coin rewards (outside the save to keep it auditable via CoinTransaction) ---
    // +1 coin per game completed
    let coinsEarned = 1;
    // +3 coins on streak milestones
    if (streakJustIncremented && [7, 14, 30, 50].includes(gameUser.currentStreak)) {
      coinsEarned += 3;
    }
    await awardCoins(userId, coinsEarned, 'game_reward', gameId).catch(() => {});

    // Reload fresh coin balance after award
    const updated = await GameUser.findOne({ userId }).lean();

    return res.json({
      ok: true,
      pointsEarned: points,
      streakJustIncremented,
      profile: {
        coins: updated?.coins ?? gameUser.coins,
        totalPoints: updated?.totalPoints ?? gameUser.totalPoints,
        currentStreak: gameUser.currentStreak,
        longestStreak: gameUser.longestStreak,
        lastActiveDate: gameUser.lastActiveDate,
        gamesCompletedToday: gameUser.gamesCompletedToday,
        streakFreezeAvailable: gameUser.streakFreezeAvailable,
        totalGamesPlayed: gameUser.totalGamesPlayed,
        badges: gameUser.badges,
        weeklyPlaysRemaining: gameUser.weeklyPlaysRemaining,
        currentWeekId: gameUser.currentWeekId,
      },
    });
  } catch (err) {
    next(err);
  }
}

// --- Helpers ---

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calcPoints(gameId: string, score: number, stars: number | undefined, streak: number): number {
  let base = 0;
  if (gameId === 'flappy') {
    if (score <= 0) return 0;
    base = Math.min(score * 10, 500);
  } else if (gameId === 'maze') {
    const s = stars ?? 1;
    base = s === 3 ? 200 : s === 2 ? 100 : 50;
  } else if (gameId === 'jumper') {
    if (score <= 0) return 0;
    base = Math.min(score * 5, 500);
  }
  const multiplier = streak >= 30 ? 1.5 : streak >= 14 ? 1.2 : streak >= 7 ? 1.1 : 1.0;
  return Math.round(base * multiplier);
}

function addBadgesForStreak(gameUser: { currentStreak: number; badges: string[] }): void {
  const milestones: Array<[number, string]> = [[7, 'streak_7'], [14, 'streak_14'], [30, 'streak_30'], [50, 'streak_50']];
  for (const [threshold, badge] of milestones) {
    if (gameUser.currentStreak >= threshold && !gameUser.badges.includes(badge)) {
      gameUser.badges.push(badge);
    }
  }
}
