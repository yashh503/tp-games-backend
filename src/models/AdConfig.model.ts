import mongoose, { Document, Schema } from 'mongoose';

export interface IAdUnit {
  adUnitId: string;
  enabled: boolean;
  provider: 'admob' | 'unity' | 'mock';
}

export interface IBannerConfig extends IAdUnit {
  size: string;
  position: 'home' | 'profile' | 'result' | 'all';
  refreshIntervalSeconds: number;
}

export interface IInterstitialConfig extends IAdUnit {
  frequencyGames: number;
  cooldownSeconds: number;
  suppressOnStreakIncrement: boolean;
}

export interface IRewardedConfig extends IAdUnit {
  rewardMultiplier: number;
  rewardLabel: string;
}

export interface IAdConfig extends Document {
  version: string;
  globalKillSwitch: boolean;
  banner: IBannerConfig;
  interstitial: IInterstitialConfig;
  rewarded: IRewardedConfig;
  updatedAt: Date;
}

const AdUnitFields = {
  adUnitId: { type: String, required: true },
  enabled:  { type: Boolean, default: true },
  provider: { type: String, enum: ['admob', 'unity', 'mock'], default: 'mock' },
};

const AdConfigSchema = new Schema<IAdConfig>(
  {
    version:          { type: String, required: true, default: '1.0.0' },
    globalKillSwitch: { type: Boolean, default: false },
    banner: {
      ...AdUnitFields,
      size:                   { type: String, default: 'banner' },
      position:               { type: String, enum: ['home', 'profile', 'result', 'all'], default: 'home' },
      refreshIntervalSeconds: { type: Number, default: 60 },
    },
    interstitial: {
      ...AdUnitFields,
      frequencyGames:            { type: Number, default: 4 },
      cooldownSeconds:           { type: Number, default: 30 },
      suppressOnStreakIncrement: { type: Boolean, default: true },
    },
    rewarded: {
      ...AdUnitFields,
      rewardMultiplier: { type: Number, default: 2 },
      rewardLabel:      { type: String, default: 'Double your points!' },
    },
  },
  { timestamps: true }
);

export const AdConfigModel = mongoose.model<IAdConfig>('AdConfig', AdConfigSchema);
