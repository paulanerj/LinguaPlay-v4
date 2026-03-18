import { CanonicalizationPipeline } from "../pipeline/01_canonicalization";
import { EvidenceDerivationPipeline } from "../pipeline/02_derived_evidence";
import { MasteryEvaluationPipeline } from "../pipeline/03_mastery_evaluation";
import { AchievementMeaningPipeline } from "../pipeline/04_achievement_meaning";
import { RewardSignalingPipeline } from "../pipeline/05_reward_signals";
import { RawEngineEvent, CanonicalSkillRecord, DerivedEvidenceRecord, MasteryRecord, AchievementMeaningRecord, RewardSignalRecord } from "../contracts/types";
import { generateDeterministicId } from "./05_deterministicUtils";

export class InvalidVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidVersionError";
  }
}

export class StubCanonicalization implements CanonicalizationPipeline {
  resolveIdentity(event: RawEngineEvent): CanonicalSkillRecord {
    // STUB POLICY: Law-enforcement scaffold (Version Integrity)
    if (event.schemaVersion !== "1.1") {
      throw new InvalidVersionError(`Unsupported schema version: ${event.schemaVersion}`);
    }

    const ref = event.skillRef;
    let id = "unknown";
    let kind: "direct" | "partial" | "fallback" = "direct";

    if (ref.tier === "resolved") {
      id = `fact-${ref.operation}-${ref.operands.join("-")}`;
      kind = "direct";
    } else if (ref.tier === "partial") {
      id = `sequence-${ref.operation}`;
      kind = "partial";
    } else if (ref.tier === "fallback") {
      id = `fallback-${ref.rawStepHash}`;
      kind = "fallback";
    }

    return { canonicalSkillId: id, sourceSkillRef: ref, registryVersion: "1.0", resolutionKind: kind };
  }
}

export class StubEvidenceDerivation implements EvidenceDerivationPipeline {
  deriveEvidence(event: RawEngineEvent, canonicalSkill: CanonicalSkillRecord): DerivedEvidenceRecord {
    // STUB POLICY: Neutral placeholder
    return {
      evidenceId: generateDeterministicId("ev", event.eventSeq, event.timestampMs),
      normalizationVersion: "1.0",
      sessionId: event.sessionId,
      canonicalSkillId: canonicalSkill.canonicalSkillId,
      evidenceType: event.eventType === "ANSWER_CORRECT" ? "positive" : "negative",
      confidence: 0.5,
      timestampMs: event.timestampMs,
      metadata: {}
    };
  }
}

export class StubMasteryEvaluation implements MasteryEvaluationPipeline {
  // Hack for scaffold: simulating lookup of atomic facts without breaking interface
  private test_atomicFactRegistry: Record<string, string> = {}; 

  evaluateMasteryShift(newEvidence: DerivedEvidenceRecord, historicalMastery: MasteryRecord | null): MasteryRecord {
    // STUB POLICY: Law-enforcement scaffold
    let nextState = historicalMastery?.state || "UNSEEN";
    
    // Track weak facts for the family test
    if (newEvidence.canonicalSkillId.startsWith("fact-")) {
      this.test_atomicFactRegistry[newEvidence.canonicalSkillId] = newEvidence.evidenceType === "negative" ? "FRAGILE" : "STABLE";
    }

    if (newEvidence.canonicalSkillId.startsWith("fallback-")) {
      nextState = "OBSERVED"; // Law: Fallback ceiling
    } else if (newEvidence.canonicalSkillId.startsWith("sequence-family")) {
      // Law: Family rollups cannot hide weak atomic facts
      const hasWeakChild = Object.values(this.test_atomicFactRegistry).includes("FRAGILE");
      if (hasWeakChild) {
        nextState = "EMERGING"; // Blocked from STABLE
      } else {
        nextState = "STABLE";
      }
    } else if (newEvidence.evidenceType === "positive") {
      nextState = nextState === "UNSEEN" ? "EMERGING" : "STABLE";
    } else {
      nextState = "FRAGILE";
    }

    return {
      canonicalSkillId: newEvidence.canonicalSkillId,
      masteryVersion: "1.1",
      state: nextState as any,
      confidence: 0.8,
      lastUpdatedMs: newEvidence.timestampMs,
      metadata: {}
    };
  }
}

export class StubAchievementMeaning implements AchievementMeaningPipeline {
  extractMeaning(currentMastery: MasteryRecord, previousMastery: MasteryRecord | null): AchievementMeaningRecord | null {
    // STUB POLICY: Intentionally non-production simplification
    if (currentMastery.state === "STABLE" && previousMastery?.state !== "STABLE") {
      return {
        meaningId: generateDeterministicId("mean", currentMastery.canonicalSkillId, currentMastery.lastUpdatedMs),
        meaningVersion: "1.0",
        canonicalSkillId: currentMastery.canonicalSkillId,
        category: "SkillStabilized",
        timestampMs: currentMastery.lastUpdatedMs,
        metadata: {}
      };
    }
    return null;
  }
}

export class StubRewardSignaling implements RewardSignalingPipeline {
  generateSignal(achievement: AchievementMeaningRecord): RewardSignalRecord {
    // STUB POLICY: Law-enforcement scaffold (Economic Sterility)
    return {
      signalId: generateDeterministicId("sig", achievement.meaningId),
      signalVersion: "1.0",
      signalType: "MILESTONE_REACHED",
      canonicalSkillId: achievement.canonicalSkillId,
      timestampMs: achievement.timestampMs,
      confidence: 1.0,
      metadata: { sourceMeaning: achievement.meaningId }
    };
  }
}
