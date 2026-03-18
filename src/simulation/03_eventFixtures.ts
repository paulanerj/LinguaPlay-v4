import { RawEngineEvent } from "../contracts/types";

const baseEvent: RawEngineEvent = {
  learnerId: "learner-1",
  sessionId: "session-1",
  schemaVersion: "1.1",
  eventSeq: 0,
  timestampMs: 0,
  stepIndex: 0,
  eventType: "ANSWER_CORRECT",
  skillRef: {
    tier: "resolved",
    domain: "arithmetic",
    operation: "add",
    structure: "fact",
    operands: [1, 1]
  }
};

export const FixtureInvalidVersion: RawEngineEvent[] = [
  { ...baseEvent, schemaVersion: "9.9", eventSeq: 1, timestampMs: 1000, stepIndex: 1, eventType: "ANSWER_CORRECT", skillRef: { tier: "resolved", domain: "arithmetic", operation: "mul", structure: "fact", operands: [2, 2] } },
  { ...baseEvent, schemaVersion: "1.1", eventSeq: 2, timestampMs: 2000, stepIndex: 2, eventType: "ANSWER_CORRECT", skillRef: { tier: "resolved", domain: "arithmetic", operation: "mul", structure: "fact", operands: [2, 2] } }
];

export const FixtureFamilyWithWeakFact: RawEngineEvent[] = [
  // Two strong facts in the family
  { ...baseEvent, eventSeq: 1, timestampMs: 1000, stepIndex: 1, eventType: "ANSWER_CORRECT", skillRef: { tier: "resolved", domain: "arithmetic", operation: "mul", structure: "fact", operands: [3, 2] } },
  { ...baseEvent, eventSeq: 2, timestampMs: 2000, stepIndex: 2, eventType: "ANSWER_CORRECT", skillRef: { tier: "resolved", domain: "arithmetic", operation: "mul", structure: "fact", operands: [3, 3] } },
  // One weak fact in the family
  { ...baseEvent, eventSeq: 3, timestampMs: 3000, stepIndex: 3, eventType: "ANSWER_INCORRECT", skillRef: { tier: "resolved", domain: "arithmetic", operation: "mul", structure: "fact", operands: [3, 4] } },
  // Attempt to process a family rollup structural event
  { ...baseEvent, eventSeq: 4, timestampMs: 4000, stepIndex: 4, eventType: "ANSWER_CORRECT", skillRef: { tier: "partial", domain: "arithmetic", operation: "family", structure: "rollup" } }
];
