import { RawEngineEvent, CanonicalSkillRecord, DerivedEvidenceRecord } from "../contracts/types";

export interface EvidenceDerivationPipeline {
  deriveEvidence(event: RawEngineEvent, canonicalSkill: CanonicalSkillRecord): DerivedEvidenceRecord;
}
