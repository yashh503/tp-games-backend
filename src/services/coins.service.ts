import mongoose from 'mongoose';
import GameUser from '../models/GameUser.model';
import CoinTransaction, { CoinReason } from '../models/CoinTransaction.model';

export async function awardCoins(
  userId: string,
  delta: number,
  reason: CoinReason,
  gameId?: string
): Promise<number> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const gameUser = await GameUser.findOneAndUpdate(
      { userId },
      { $inc: { coins: delta } },
      { new: true, session }
    );
    if (!gameUser) throw new Error('GameUser not found');

    await CoinTransaction.create([{ userId, delta, reason, gameId }], { session });

    await session.commitTransaction();
    return gameUser.coins;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function spendCoins(
  userId: string,
  amount: number,
  reason: CoinReason,
  gameId?: string
): Promise<number> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const gameUser = await GameUser.findOneAndUpdate(
      { userId, coins: { $gte: amount } },
      { $inc: { coins: -amount } },
      { new: true, session }
    );
    if (!gameUser) throw new Error('Insufficient coins');

    await CoinTransaction.create([{ userId, delta: -amount, reason, gameId }], { session });

    await session.commitTransaction();
    return gameUser.coins;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
