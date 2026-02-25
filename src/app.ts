import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import userRoutes from './routes/user.routes';
import adsRoutes from './routes/ads.routes';
import authRoutes from './routes/auth.routes';
import scheduleRoutes from './routes/schedule.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use('/users', userRoutes);
app.use('/ads', adsRoutes);
app.use('/auth', authRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/admin', adminRoutes);

// Must be last
app.use(errorHandler);

export default app;
