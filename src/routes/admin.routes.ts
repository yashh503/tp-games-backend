import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { getWinners, grantCoins, getAdConfig, updateAdConfig } from '../controllers/admin.controller';

const router = Router();

router.use(requireAdmin);

router.get('/winners/:weekId', getWinners);
router.post('/coins/grant', grantCoins);
router.get('/ad-config', getAdConfig);
router.put('/ad-config', updateAdConfig);

export default router;
