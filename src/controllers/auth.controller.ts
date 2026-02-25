import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import AuthUser from '../models/AuthUser.model';
import GameUser from '../models/GameUser.model';
import RefreshToken from '../models/RefreshToken.model';
import { getCurrentWeekId } from '../services/schedule.service';

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateTokens(userId: string, email: string) {
  const accessToken = jwt.sign(
    { userId, email },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
  const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
  return { accessToken, refreshTokenRaw };
}

async function saveRefreshToken(userId: string, rawToken: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  await RefreshToken.create({ userId, token: hashToken(rawToken), expiresAt });
}

export async function register(req: Request, res: Response) {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'email, password, and displayName are required' });
  }

  const existing = await AuthUser.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const authUser = await AuthUser.create({ email, passwordHash, displayName });
  await GameUser.create({
    userId: authUser._id,
    coins: 3,
    currentWeekId: getCurrentWeekId(),
  });

  const { accessToken, refreshTokenRaw } = generateTokens(String(authUser._id), authUser.email);
  await saveRefreshToken(String(authUser._id), refreshTokenRaw);

  return res.status(201).json({
    accessToken,
    refreshToken: refreshTokenRaw,
    user: { userId: authUser._id, email: authUser.email, displayName: authUser.displayName },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const authUser = await AuthUser.findOne({ email: email.toLowerCase() });
  if (!authUser || !authUser.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, authUser.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { accessToken, refreshTokenRaw } = generateTokens(String(authUser._id), authUser.email);
  await saveRefreshToken(String(authUser._id), refreshTokenRaw);

  return res.json({
    accessToken,
    refreshToken: refreshTokenRaw,
    user: { userId: authUser._id, email: authUser.email, displayName: authUser.displayName },
  });
}

export async function googleAuth(req: Request, res: Response) {
  // Expects { idToken } from expo-auth-session Google flow
  // For simplicity we trust the decoded payload from the client (dev mode)
  // In production: verify with Google's tokeninfo endpoint
  const { googleId, email, displayName } = req.body;
  if (!googleId || !email) {
    return res.status(400).json({ error: 'googleId and email are required' });
  }

  let authUser = await AuthUser.findOne({ googleId });
  if (!authUser) {
    authUser = await AuthUser.findOne({ email: email.toLowerCase() });
    if (authUser) {
      authUser.googleId = googleId;
      await authUser.save();
    } else {
      authUser = await AuthUser.create({ email, googleId, displayName: displayName || email });
      await GameUser.create({
        userId: authUser._id,
        coins: 3,
        currentWeekId: getCurrentWeekId(),
      });
    }
  }

  const { accessToken, refreshTokenRaw } = generateTokens(String(authUser._id), authUser.email);
  await saveRefreshToken(String(authUser._id), refreshTokenRaw);

  return res.json({
    accessToken,
    refreshToken: refreshTokenRaw,
    user: { userId: authUser._id, email: authUser.email, displayName: authUser.displayName },
  });
}

export async function refreshTokens(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  const hashed = hashToken(refreshToken);
  const stored = await RefreshToken.findOne({ token: hashed, revoked: false });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  // Rotate: revoke old, issue new
  stored.revoked = true;
  await stored.save();

  const authUser = await AuthUser.findById(stored.userId);
  if (!authUser) return res.status(401).json({ error: 'User not found' });

  const { accessToken, refreshTokenRaw } = generateTokens(String(authUser._id), authUser.email);
  await saveRefreshToken(String(authUser._id), refreshTokenRaw);

  return res.json({
    accessToken,
    refreshToken: refreshTokenRaw,
    user: { userId: authUser._id, email: authUser.email, displayName: authUser.displayName },
  });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hashed = hashToken(refreshToken);
    await RefreshToken.updateOne({ token: hashed }, { revoked: true });
  }
  return res.json({ ok: true });
}
