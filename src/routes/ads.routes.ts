import { Router } from 'express';
import { getAdConfig, updateAdConfig } from '../controllers/ads.controller';

const router = Router();

router.get('/config', getAdConfig);
router.put('/config', updateAdConfig);

export default router;
