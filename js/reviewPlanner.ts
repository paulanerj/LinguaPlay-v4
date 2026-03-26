import { SubtitleCognitivePriority } from './subtitleCognitivePriority.ts';
import { ReinforcementCandidate } from './cognitiveTypes.ts';

export interface ReviewCandidate {
  subtitleId: string | number;
  priorityScore: number;
  topTokens: string[];
  maxDecayRisk: number;
  avgConfidence: number;
  rationale: string[];
}

export function generateReviewCandidates(
  subtitles: { id: string | number; tokens?: string[] }[],
  priorities: Map<string | number, SubtitleCognitivePriority>,
  candidates: ReinforcementCandidate[]
): ReviewCandidate[] {
  const reviewCandidates: ReviewCandidate[] = [];

  for (const subtitle of subtitles) {
    const priority = priorities.get(subtitle.id);
    if (!priority || priority.priorityScore === 0) continue;

    const tokens = subtitle.tokens || [];
    let maxDecayRisk = 0;
    let totalConfidence = 0;
    let validTokenCount = 0;

    for (const token of tokens) {
      const candidate = candidates.find(c => c.token === token);
      if (candidate) {
        if (candidate.profile.decayRisk > maxDecayRisk) {
          maxDecayRisk = candidate.profile.decayRisk;
        }
        totalConfidence += candidate.profile.confidence;
        validTokenCount++;
      }
    }

    const avgConfidence = validTokenCount > 0 ? totalConfidence / validTokenCount : 0;

    const rationale = [...priority.rationale];
    rationale.push(`Max Decay Risk: ${maxDecayRisk.toFixed(2)}`);
    rationale.push(`Avg Confidence: ${avgConfidence.toFixed(2)}`);

    reviewCandidates.push({
      subtitleId: subtitle.id,
      priorityScore: priority.priorityScore,
      topTokens: priority.topTokens,
      maxDecayRisk,
      avgConfidence,
      rationale
    });
  }

  // Sort deterministic
  reviewCandidates.sort((a, b) => {
    if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore;
    
    const aPriority = priorities.get(a.subtitleId);
    const bPriority = priorities.get(b.subtitleId);
    const aRescue = aPriority ? aPriority.rescueCount : 0;
    const bRescue = bPriority ? bPriority.rescueCount : 0;
    
    if (aRescue !== bRescue) return bRescue - aRescue;
    if (a.maxDecayRisk !== b.maxDecayRisk) return b.maxDecayRisk - a.maxDecayRisk;
    if (a.avgConfidence !== b.avgConfidence) return a.avgConfidence - b.avgConfidence;
    
    // Earlier subtitle order
    const aIdx = subtitles.findIndex(s => s.id === a.subtitleId);
    const bIdx = subtitles.findIndex(s => s.id === b.subtitleId);
    return aIdx - bIdx;
  });

  return reviewCandidates;
}
