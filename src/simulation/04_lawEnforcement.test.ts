import { InMemoryStateContainer } from "./01_stateContainer";
import { DeterministicRunner } from "./00_deterministicRunner";
import { FixtureInvalidVersion, FixtureFamilyWithWeakFact } from "./03_eventFixtures";

describe("Platform Architecture Law Enforcement", () => {
  let state: InMemoryStateContainer;
  let runner: DeterministicRunner;

  beforeEach(() => {
    state = new InMemoryStateContainer();
    runner = new DeterministicRunner(state);
  });

  test("LAW: Version mismatch does not corrupt state", () => {
    runner.ingestStream(FixtureInvalidVersion);
    
    // The "9.9" event was quarantined
    expect(state.deadLetterQueue.length).toBe(1);
    expect(state.deadLetterQueue[0]).toHaveProperty("error", "Unsupported schema version: 9.9");
    
    // The "1.1" event processed normally
    const keys = Object.keys(state.skillState.mastery);
    expect(keys).toContain("fact-mul-2-2");
    expect(state.evidence.derivedEvidence.length).toBe(1); // Only 1 valid evidence derived
  });

  test("LAW: Family rollups cannot hide weak atomic facts", () => {
    runner.ingestStream(FixtureFamilyWithWeakFact);
    
    const weakFactMastery = state.skillState.mastery["fact-mul-3-4"];
    const familyMastery = state.skillState.mastery["sequence-family"];
    
    expect(weakFactMastery.state).toBe("FRAGILE");
    
    // Because a child fact is FRAGILE, the family node is structurally blocked from STABLE
    expect(familyMastery.state).toBe("EMERGING");
    
    // Prove no Achievement Meaning was emitted for the family
    const familyAchievements = state.achievements.meanings.filter(m => m.canonicalSkillId === "sequence-family");
    expect(familyAchievements.length).toBe(0);
  });
});
