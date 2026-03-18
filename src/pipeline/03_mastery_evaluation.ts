import { DerivedEvidenceRecord, MasteryRecord } from "../contracts/types";

export interface MasteryEvaluationPipeline {
  evaluateMasteryShift(newEvidence: DerivedEvidenceRecord, historicalMastery: MasteryRecord | null): MasteryRecord;
}
