import { Request, Response } from 'express';
import LeaderboardEntry from '../models/LeaderboardEntry.model';
import AuthUser from '../models/AuthUser.model';
import { AdConfigModel } from '../models/AdConfig.model';
import { awardCoins } from '../services/coins.service';

const DEFAULT_AD_CONFIG = {
  version: '1.0.0',
  globalKillSwitch: false,
  banner: { adUnitId: 'ca-app-pub-3940256099942544/6300978111', enabled: false, provider: 'mock', size: 'banner', position: 'home', refreshIntervalSeconds: 60 },
  interstitial: { adUnitId: 'ca-app-pub-3940256099942544/1033173712', enabled: true, provider: 'mock', frequencyGames: 4, cooldownSeconds: 30, suppressOnStreakIncrement: true },
  rewarded: { adUnitId: 'ca-app-pub-3940256099942544/5224354917', enabled: true, provider: 'mock', rewardMultiplier: 2, rewardLabel: 'Double your points!' },
};

export async function getWinners(req: Request, res: Response) {
  const { weekId } = req.params;

  const total = await LeaderboardEntry.countDocuments({ weekId });
  const cutoff = Math.max(1, Math.ceil(total * 0.01));

  const entries = await LeaderboardEntry.find({ weekId })
    .sort({ bestScore: -1 })
    .limit(cutoff)
    .lean();

  const userIds = entries.map((e) => e.userId);
  const users = await AuthUser.find({ _id: { $in: userIds } }).select('email displayName').lean();
  const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

  const winners = entries.map((e, i) => ({
    rank: i + 1,
    userId: e.userId,
    displayName: e.displayName,
    bestScore: e.bestScore,
    gameId: e.gameId,
    email: userMap[String(e.userId)]?.email ?? 'unknown',
  }));

  return res.json({ weekId, total, cutoff, winners });
}

export async function grantCoins(req: Request, res: Response) {
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });

  const newBalance = await awardCoins(userId, amount, 'admin_grant');
  return res.json({ ok: true, newBalance });
}

export async function getAdConfig(_req: Request, res: Response) {
  const doc = await AdConfigModel.findOne().sort({ createdAt: -1 });
  return res.json({ config: doc ?? DEFAULT_AD_CONFIG });
}

export async function updateAdConfig(req: Request, res: Response) {
  const incoming = req.body;
  let doc = await AdConfigModel.findOne().sort({ createdAt: -1 });

  if (!doc) {
    doc = new AdConfigModel({ ...DEFAULT_AD_CONFIG, ...incoming });
  } else {
    Object.assign(doc, incoming);
    const parts = (doc.version ?? '0.0.0').split('.').map(Number);
    parts[2] = (parts[2] ?? 0) + 1;
    doc.version = parts.join('.');
  }

  await doc.save();
  return res.json({ config: doc });
}
