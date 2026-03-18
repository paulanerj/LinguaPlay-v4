import { RawEngineEvent, CanonicalSkillRecord } from "../contracts/types";

export interface CanonicalizationPipeline {
  resolveIdentity(event: RawEngineEvent): CanonicalSkillRecord;
}
