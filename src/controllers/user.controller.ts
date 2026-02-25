import { Response, NextFunction } from 'express';
import GameUser from '../models/GameUser.model';
import AuthUser from '../models/AuthUser.model';
import { AuthRequest } from '../middleware/auth';

// GET /users/me — returns the authenticated user's profile + game stats
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
        ...(gameUser ?? {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /users/game-complete — analytics log, JWT-authenticated
export async function recordGameComplete(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { gameId, score, stars } = req.body;

    if (!['flappy', 'maze', 'jumper'].includes(gameId)) {
      return res.status(400).json({ error: 'Invalid gameId' });
    }

    console.log('[Analytics] game-complete', { userId, gameId, score, stars, ts: new Date().toISOString() });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
