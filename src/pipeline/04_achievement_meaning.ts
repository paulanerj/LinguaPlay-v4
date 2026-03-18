import { MasteryRecord, AchievementMeaningRecord } from "../contracts/types";

export interface AchievementMeaningPipeline {
  extractMeaning(currentMastery: MasteryRecord, previousMastery: MasteryRecord | null): AchievementMeaningRecord | null;
}
