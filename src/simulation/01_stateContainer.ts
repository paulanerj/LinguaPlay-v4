import { 
  ParentRewardPlatformState, 
  SkillStateStore, 
  EvidenceStore, 
  SessionStore, 
  AchievementStore, 
  RewardSignalStore 
} from "../models/state";
import { 
  CanonicalSkillRecord, 
  DerivedEvidenceRecord, 
  MasteryRecord, 
  AchievementMeaningRecord, 
  RewardSignalRecord 
} from "../contracts/types";

export class InMemoryStateContainer implements ParentRewardPlatformState {
  learnerProfiles: Record<string, any> = {};
  skillState: SkillStateStore = {
    canonicalSkills: {},
    mastery: {}
  };
  evidence: EvidenceStore = {
    derivedEvidence: [],
    unresolvedFallbackEvidence: []
  };
  sessions: SessionStore = {
    sessions: []
  };
  achievements: AchievementStore = {
    meanings: []
  };
  rewardSignals: RewardSignalStore = {
    signals: []
  };
  deadLetterQueue: Record<string, unknown>[] = [];

  commitCanonicalSkill(record: CanonicalSkillRecord) {
    this.skillState.canonicalSkills[record.canonicalSkillId] = record;
  }

  commitEvidence(record: DerivedEvidenceRecord, isFallback: boolean) {
    if (isFallback) {
      this.evidence.unresolvedFallbackEvidence.push(record);
    } else {
      this.evidence.derivedEvidence.push(record);
    }
  }

  commitMastery(record: MasteryRecord) {
    this.skillState.mastery[record.canonicalSkillId] = record;
  }

  commitAchievement(record: AchievementMeaningRecord) {
    this.achievements.meanings.push(record);
  }

  commitRewardSignal(record: RewardSignalRecord) {
    this.rewardSignals.signals.push(record);
  }
}
