import { ReinforcementCandidate } from './cognitiveTypes.ts';

export interface SubtitleCognitivePriority {
  subtitleId: string | number;
  rescueCount: number;
  introduceCount: number;
  reactivateCount: number;
  reinforceCount: number;
  ignoredCount: number;
  priorityScore: number;
  topTokens: string[];
  rationale: string[];
}

export function computeSubtitlePriority(
  subtitleId: string | number,
  tokens: string[],
  candidates: ReinforcementCandidate[]
): SubtitleCognitivePriority {
  const rationale: string[] = [];
  
  let rescueCount = 0;
  let introduceCount = 0;
  let reactivateCount = 0;
  let reinforceCount = 0;
  let ignoredCount = 0;
  
  const rowCandidates: ReinforcementCandidate[] = [];

  for (const token of tokens) {
    const candidate = candidates.find(c => c.token === token);
    if (candidate) {
      rowCandidates.push(candidate);
      switch (candidate.reinforcementClass) {
        case 'RESCUE': rescueCount++; break;
        case 'REACTIVATE': reactivateCount++; break;
        case 'INTRODUCE': introduceCount++; break;
        case 'REINFORCE': reinforceCount++; break;
        case 'IGNORE': ignoredCount++; break;
      }
    } else {
      ignoredCount++;
    }
  }

  let priorityScore = 
    (rescueCount * 5.0) +
    (reactivateCount * 4.0) +
    (introduceCount * 3.0) +
    (reinforceCount * 2.0);

  rationale.push(`Base score: ${priorityScore.toFixed(1)} (RESCUE:${rescueCount}, REACTIVATE:${reactivateCount}, INTRODUCE:${introduceCount}, REINFORCE:${reinforceCount})`);

  if (rescueCount > 0 && introduceCount > 0) {
    priorityScore += 0.5;
    rationale.push(`Bonus +0.5: Contains both RESCUE and INTRODUCE candidates.`);
  }

  const lexicalStudyCount = rescueCount + reactivateCount + introduceCount + reinforceCount;
  if (lexicalStudyCount >= 3) {
    priorityScore += 0.5;
    rationale.push(`Bonus +0.5: Contains 3 or more lexical candidates worth study.`);
  }

  // Sort tokens for topTokens deterministically
  rowCandidates.sort((a, b) => {
    if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
    if (a.profile.decayRisk !== b.profile.decayRisk) return b.profile.decayRisk - a.profile.decayRisk;
    if (a.profile.confidence !== b.profile.confidence) return a.profile.confidence - b.profile.confidence;
    
    const idxA = tokens.indexOf(a.token);
    const idxB = tokens.indexOf(b.token);
    if (idxA !== idxB) return idxA - idxB;
    
    return a.token < b.token ? -1 : (a.token > b.token ? 1 : 0);
  });

  const topTokens = rowCandidates.filter(c => c.reinforcementClass !== 'IGNORE').map(c => c.token);

  return {
    subtitleId,
    rescueCount,
    introduceCount,
    reactivateCount,
    reinforceCount,
    ignoredCount,
    priorityScore,
    topTokens,
    rationale
  };
}
