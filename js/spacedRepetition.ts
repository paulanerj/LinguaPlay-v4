import { ReinforcementClass, TokenLearningState } from './cognitiveTypes.ts';
import { TokenMemoryRecord } from './pedagogy.ts';
import { timeAuthority } from './timeAuthority.ts';

export const INTERVALS_MS = {
  RESCUE: 0,
  INTRODUCE: 2 * 60 * 1000, // 2 minutes (faster pacing for new tokens)
  REINFORCE: 15 * 60 * 1000, // 15 minutes
  REACTIVATE: 4 * 60 * 60 * 1000, // 4 hours
  STABLE: 24 * 60 * 60 * 1000, // 24 hours
  AUTOMATIC: 3 * 24 * 60 * 60 * 1000 // 3 days (fixed)
};

export function computeNextReviewAt(
  memoryRecord: TokenMemoryRecord | null,
  inferredState: TokenLearningState,
  reinforcementClass: ReinforcementClass,
  now: number
): number {
  const baseTime = memoryRecord?.lastReviewedAt ?? memoryRecord?.lastSeenAt ?? now;
  
  switch (reinforcementClass) {
    case 'RESCUE': return baseTime + INTERVALS_MS.RESCUE;
    case 'INTRODUCE': return baseTime + INTERVALS_MS.INTRODUCE;
    case 'REINFORCE': return baseTime + INTERVALS_MS.REINFORCE;
    case 'REACTIVATE': return baseTime + INTERVALS_MS.REACTIVATE;
    case 'IGNORE': 
      if (inferredState === 'STABLE') return baseTime + INTERVALS_MS.STABLE;
      return baseTime + INTERVALS_MS.AUTOMATIC;
    default: return baseTime + INTERVALS_MS.AUTOMATIC;
  }
}

export function isReviewDue(nextReviewAt: number, now: number): boolean {
  return now >= nextReviewAt;
}
