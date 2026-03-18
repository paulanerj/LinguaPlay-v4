import { AchievementMeaningRecord, RewardSignalRecord } from "../contracts/types";

export interface RewardSignalingPipeline {
  generateSignal(achievement: AchievementMeaningRecord): RewardSignalRecord;
}
