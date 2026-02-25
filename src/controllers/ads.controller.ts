import { Request, Response, NextFunction } from 'express';
import { AdConfigModel } from '../models/AdConfig.model';

// Default config — matches current mock behaviour in the mobile app.
// Returned when no document exists in DB yet.
const DEFAULT_AD_CONFIG = {
  version: '1.0.0',
  globalKillSwitch: false,
  banner: {
    adUnitId: 'ca-app-pub-3940256099942544/6300978111', // AdMob test banner
    enabled: false, // disabled until real IDs are set
    provider: 'mock',
    size: 'banner',
    position: 'home',
    refreshIntervalSeconds: 60,
  },
  interstitial: {
    adUnitId: 'ca-app-pub-3940256099942544/1033173712', // AdMob test interstitial
    enabled: true,
    provider: 'mock',
    frequencyGames: 4,
    cooldownSeconds: 30,
    suppressOnStreakIncrement: true,
  },
  rewarded: {
    adUnitId: 'ca-app-pub-3940256099942544/5224354917', // AdMob test rewarded
    enabled: true,
    provider: 'mock',
    rewardMultiplier: 2,
    rewardLabel: 'Double your points!',
  },
};

// GET /ads/config
export async function getAdConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await AdConfigModel.findOne({}).lean();

    if (!config) {
      return res.json({ config: DEFAULT_AD_CONFIG });
    }

    return res.json({ config });
  } catch (err) {
    next(err);
  }
}

// PUT /ads/config  (admin only — requires x-admin-secret header)
export async function updateAdConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = req.body;

    // Bump patch version on every update so mobile caches invalidate
    const current = await AdConfigModel.findOne({}).lean();
    const versionStr = current?.version ?? '1.0.0';
    const parts = versionStr.split('.').map(Number);
    const newVersion = `${parts[0]}.${parts[1]}.${(parts[2] ?? 0) + 1}`;

    const config = await AdConfigModel.findOneAndUpdate(
      {},
      { $set: { ...updates, version: newVersion } },
      { upsert: true, new: true }
    ).lean();

    return res.json({ config });
  } catch (err) {
    next(err);
  }
}
