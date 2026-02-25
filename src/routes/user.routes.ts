import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getMe, recordGameComplete } from '../controllers/user.controller';

const router = Router();

router.use(requireAuth);

router.get('/me', getMe);
router.post('/game-complete', recordGameComplete);

export default router;
