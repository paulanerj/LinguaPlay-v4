import { ReviewCandidate } from './reviewPlanner.ts';
import { ReinforcementCandidate } from './cognitiveTypes.ts';
import { ReviewQueueEntry } from './orchestrationTypes.ts';

export function buildReviewQueue(
  reviewCandidates: ReviewCandidate[],
  reinforcementCandidates: ReinforcementCandidate[],
  recentlySurfacedSubtitleId: string | number | null
): ReviewQueueEntry[] {
  const queue: ReviewQueueEntry[] = [];

  for (const candidate of reviewCandidates) {
    let rescueTokenCount = 0;
    let reactivateTokenCount = 0;

    for (const token of candidate.topTokens) {
      const rc = reinforcementCandidates.find(c => c.token === token);
      if (rc) {
        if (rc.reinforcementClass === 'RESCUE') rescueTokenCount++;
        if (rc.reinforcementClass === 'REACTIVATE') reactivateTokenCount++;
      }
    }

    queue.push({
      subtitleId: candidate.subtitleId,
      priorityScore: candidate.priorityScore,
      rescueTokenCount,
      reactivateTokenCount,
      maxDecayRisk: candidate.maxDecayRisk,
      rationale: [...candidate.rationale]
    });
  }

  // Deduplication is implicitly handled if reviewCandidates are unique by subtitleId.
  // Stable ordering:
  queue.sort((a, b) => {
    // Cooldown rule: penalize recently surfaced subtitle unless it's extremely high priority
    const aIsRecent = a.subtitleId === recentlySurfacedSubtitleId;
    const bIsRecent = b.subtitleId === recentlySurfacedSubtitleId;

    if (aIsRecent && !bIsRecent) {
      // If a is recent, it must have significantly higher rescue count to beat b
      if (a.rescueTokenCount <= b.rescueTokenCount) return 1; 
    }
    if (bIsRecent && !aIsRecent) {
      if (b.rescueTokenCount <= a.rescueTokenCount) return -1;
    }

    if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore;
    if (a.rescueTokenCount !== b.rescueTokenCount) return b.rescueTokenCount - a.rescueTokenCount;
    if (a.maxDecayRisk !== b.maxDecayRisk) return b.maxDecayRisk - a.maxDecayRisk;
    
    // Subtitle ID string comparison for absolute determinism
    const aIdStr = String(a.subtitleId);
    const bIdStr = String(b.subtitleId);
    return aIdStr < bIdStr ? -1 : (aIdStr > bIdStr ? 1 : 0);
  });

  return queue;
}
