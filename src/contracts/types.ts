export interface RawEngineEvent {
  learnerId: string;
  sessionId: string;
  schemaVersion: string;
  eventSeq: number;
  timestampMs: number;
  stepIndex: number;
  eventType: string;
  skillRef: SkillRef;
  rawStepHash?: string;
}

export interface SkillRef {
  tier: "resolved" | "partial" | "fallback";
  domain: string;
  operation: string; // e.g., "add", "mul", "family"
  structure: string; // e.g., "fact", "rollup"
  operands?: any[];
  rawStepHash?: string;
}

/**
 * PartialSkillRef represents a non-atomic node in the skill tree.
 * Expansion: operation "family" + structure "rollup" allows cross-fact aggregation.
 */
export interface PartialSkillRef extends SkillRef {
  tier: "partial";
  operation: "family" | string;
  structure: "rollup" | string;
}

export interface CanonicalSkillRecord {
  canonicalSkillId: string;
  sourceSkillRef: SkillRef;
  registryVersion: string;
  resolutionKind: "direct" | "partial" | "fallback";
}

export interface DerivedEvidenceRecord {
  evidenceId: string;
  normalizationVersion: string;
  sessionId: string;
  canonicalSkillId: string;
  evidenceType: "positive" | "negative";
  confidence: number;
  timestampMs: number;
  metadata: Record<string, any>;
}

export interface MasteryRecord {
  canonicalSkillId: string;
  masteryVersion: string;
  state: "UNSEEN" | "OBSERVED" | "EMERGING" | "STABLE" | "FRAGILE";
  confidence: number;
  lastUpdatedMs: number;
  metadata: Record<string, any>;
}

export interface AchievementMeaningRecord {
  meaningId: string;
  meaningVersion: string;
  canonicalSkillId: string;
  category: string;
  timestampMs: number;
  metadata: Record<string, any>;
}

export interface RewardSignalRecord {
  signalId: string;
  signalVersion: string;
  signalType: string;
  canonicalSkillId: string;
  timestampMs: number;
  confidence: number;
  metadata: Record<string, any>;
}

export interface SessionBundle {
  sessionId: string;
  learnerId: string;
  startMs: number;
  endMs: number;
  eventCount: number;
}
