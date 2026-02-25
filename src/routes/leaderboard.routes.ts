import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { submitScore, getLeaderboard, getTop1Pct, detectTies } from '../controllers/leaderboard.controller';

const router = Router();

router.post('/submit', requireAuth, submitScore);
router.get('/:weekId', requireAuth, getLeaderboard);
router.get('/:weekId/top1pct', requireAdmin, getTop1Pct);
router.get('/:weekId/ties', requireAuth, detectTies);

export default router;
