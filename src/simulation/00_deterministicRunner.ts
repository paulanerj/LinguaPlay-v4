import { RawEngineEvent } from "../contracts/types";
import { InMemoryStateContainer } from "./01_stateContainer";
import { 
  StubCanonicalization, StubEvidenceDerivation, 
  StubMasteryEvaluation, StubAchievementMeaning, StubRewardSignaling, InvalidVersionError 
} from "./02_stubPipelines";

export class DeterministicRunner {
  private canonical = new StubCanonicalization();
  private evidence = new StubEvidenceDerivation();
  private mastery = new StubMasteryEvaluation();
  private meaning = new StubAchievementMeaning();
  private signaling = new StubRewardSignaling();

  constructor(private state: InMemoryStateContainer) {}

  public ingestStream(events: RawEngineEvent[]) {
    for (const event of events) {
      try {
        const canonicalRecord = this.canonical.resolveIdentity(event);
        this.state.commitCanonicalSkill(canonicalRecord);

        const evidenceRecord = this.evidence.deriveEvidence(event, canonicalRecord);
        this.state.commitEvidence(evidenceRecord, canonicalRecord.resolutionKind === "fallback");

        const historicalMastery = this.state.skillState.mastery[canonicalRecord.canonicalSkillId] || null;
        const masteryRecord = this.mastery.evaluateMasteryShift(evidenceRecord, historicalMastery);
        this.state.commitMastery(masteryRecord);

        const meaningRecord = this.meaning.extractMeaning(masteryRecord, historicalMastery);
        if (meaningRecord) {
          this.state.commitAchievement(meaningRecord);

          const signalRecord = this.signaling.generateSignal(meaningRecord);
          this.state.commitRewardSignal(signalRecord);
        }
      } catch (error) {
        if (error instanceof InvalidVersionError) {
          // Quarantine the event deterministically
          this.state.deadLetterQueue.push({ eventSeq: event.eventSeq, error: error.message });
        } else {
          throw error;
        }
      }
    }
  }
}
