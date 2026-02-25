import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getCurrentSchedule, getScheduleByWeek } from '../controllers/schedule.controller';

const router = Router();

router.get('/current', requireAuth, getCurrentSchedule);
router.get('/:weekId', requireAuth, getScheduleByWeek);

export default router;
