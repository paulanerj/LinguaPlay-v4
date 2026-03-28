import { TokenMemoryRecord } from './pedagogy.ts';

export type TokenLearningState =
  | 'UNSEEN'
  | 'SEEN'
  | 'FAMILIAR'
  | 'SEMANTICALLY_LINKED'
  | 'RECALLABLE'
  | 'STABLE'
  | 'AUTOMATIC'
  | 'FRAGILE'
  | 'LOST';

export interface TokenLearningProfile {
  token: string;
  inferredState: TokenLearningState;
  confidence: number;
  decayRisk: number;
  consolidationMomentum: number;
  familiarityScore: number;
  semanticLinkScore: number;
  evidenceSummary: string[];
  lastSeenAt: number | null;
  lastReviewedAt: number | null;
  profileVersion: 1;
}

export interface CognitiveDerivationInput {
  token: string;
  memoryRecord: TokenMemoryRecord | null;
  now: number;
}

export type ReinforcementClass =
  | 'INTRODUCE'
  | 'REINFORCE'
  | 'REACTIVATE'
  | 'RESCUE'
  | 'IGNORE';

export interface ReinforcementCandidate {
  token: string;
  reinforcementClass: ReinforcementClass;
  profile: TokenLearningProfile;
  priorityScore: number; // Used for deterministic ordering
  nextReviewAt: number;
}
