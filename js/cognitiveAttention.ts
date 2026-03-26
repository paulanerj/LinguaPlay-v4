import { ReinforcementCandidate, ReinforcementClass } from './cognitiveTypes.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';

export interface CognitiveAttentionAdvice {
  baselineTarget: string | null;
  advisedTarget: string | null;
  shouldOverride: boolean;
  reasonCode:
    | 'NO_BASELINE_TARGET'
    | 'KEEP_BASELINE'
    | 'RESCUE_OVERRIDE'
    | 'REACTIVATE_OVERRIDE'
    | 'INTRODUCE_OVERRIDE';
  rationale: string[];
}

export function computeCognitiveAttentionAdvice(
  tokens: string[],
  baselineTarget: string | null,
  candidates: ReinforcementCandidate[]
): CognitiveAttentionAdvice {
  const rationale: string[] = [];
  
  // Filter candidates to only those present in the active subtitle
  const activeCandidates = candidates.filter(c => tokens.includes(c.token));
  
  // Helper to find best candidate of a specific class
  // Candidates are assumed to be already sorted deterministically by reinforcementPlanner
  const getBestCandidate = (cls: ReinforcementClass) => {
    const clsCandidates = activeCandidates.filter(c => c.reinforcementClass === cls);
    if (clsCandidates.length === 0) return null;
    
    // Sort active candidates deterministically based on tie-breaking rules
    clsCandidates.sort((a, b) => {
      if (a.profile.decayRisk !== b.profile.decayRisk) return b.profile.decayRisk - a.profile.decayRisk;
      if (a.profile.confidence !== b.profile.confidence) return a.profile.confidence - b.profile.confidence;
      
      const idxA = tokens.indexOf(a.token);
      const idxB = tokens.indexOf(b.token);
      if (idxA !== idxB) return idxA - idxB;
      
      return a.token < b.token ? -1 : (a.token > b.token ? 1 : 0);
    });
    
    return clsCandidates[0];
  };

  const rescueCandidate = getBestCandidate('RESCUE');
  const reactivateCandidate = getBestCandidate('REACTIVATE');
  const introduceCandidate = getBestCandidate('INTRODUCE');
  const reinforceCandidate = getBestCandidate('REINFORCE');

  const baselineCandidate = activeCandidates.find(c => c.token === baselineTarget);
  const baselineClass = baselineCandidate ? baselineCandidate.reinforcementClass : 'IGNORE';

  if (!baselineTarget) {
    rationale.push("No baseline target provided.");
    if (rescueCandidate) {
      rationale.push(`Found RESCUE candidate: ${rescueCandidate.token}`);
      return { baselineTarget, advisedTarget: rescueCandidate.token, shouldOverride: true, reasonCode: 'RESCUE_OVERRIDE', rationale };
    }
    if (reactivateCandidate) {
      rationale.push(`Found REACTIVATE candidate: ${reactivateCandidate.token}`);
      return { baselineTarget, advisedTarget: reactivateCandidate.token, shouldOverride: true, reasonCode: 'REACTIVATE_OVERRIDE', rationale };
    }
    if (introduceCandidate) {
      rationale.push(`Found INTRODUCE candidate: ${introduceCandidate.token}`);
      return { baselineTarget, advisedTarget: introduceCandidate.token, shouldOverride: true, reasonCode: 'INTRODUCE_OVERRIDE', rationale };
    }
    if (reinforceCandidate) {
      rationale.push(`Found REINFORCE candidate: ${reinforceCandidate.token}`);
      return { baselineTarget, advisedTarget: reinforceCandidate.token, shouldOverride: true, reasonCode: 'NO_BASELINE_TARGET', rationale };
    }
    rationale.push("No actionable candidates found.");
    return { baselineTarget, advisedTarget: null, shouldOverride: false, reasonCode: 'NO_BASELINE_TARGET', rationale };
  }

  // Rule A: Keep baseline
  if (baselineClass === 'RESCUE' || baselineClass === 'REACTIVATE' || baselineClass === 'INTRODUCE') {
    rationale.push(`Baseline target ${baselineTarget} is already high-value (${baselineClass}).`);
    return { baselineTarget, advisedTarget: baselineTarget, shouldOverride: false, reasonCode: 'KEEP_BASELINE', rationale };
  }

  // Rule B: Rescue override
  if (rescueCandidate) {
    const entry = dictionaryEngine.getEntry(rescueCandidate.token);
    if (entry.truthStatus !== 'NON_LEXICAL') {
      rationale.push(`Overriding baseline (${baselineClass}) with RESCUE candidate: ${rescueCandidate.token}.`);
      return { baselineTarget, advisedTarget: rescueCandidate.token, shouldOverride: true, reasonCode: 'RESCUE_OVERRIDE', rationale };
    }
  }

  // Rule C: Reactivate override
  if (reactivateCandidate && !rescueCandidate && (baselineClass === 'REINFORCE' || baselineClass === 'IGNORE')) {
    rationale.push(`Overriding baseline (${baselineClass}) with REACTIVATE candidate: ${reactivateCandidate.token}.`);
    return { baselineTarget, advisedTarget: reactivateCandidate.token, shouldOverride: true, reasonCode: 'REACTIVATE_OVERRIDE', rationale };
  }

  // Rule D: Introduce override
  if (introduceCandidate && !rescueCandidate && !reactivateCandidate && baselineClass === 'IGNORE') {
    rationale.push(`Overriding baseline (${baselineClass}) with INTRODUCE candidate: ${introduceCandidate.token}.`);
    return { baselineTarget, advisedTarget: introduceCandidate.token, shouldOverride: true, reasonCode: 'INTRODUCE_OVERRIDE', rationale };
  }

  // Rule E: Reinforce does not override stronger baseline
  const baselineEntry = dictionaryEngine.getEntry(baselineTarget);
  const isBaselineNonLexical = baselineEntry.truthStatus === 'NON_LEXICAL';
  
  if (reinforceCandidate && isBaselineNonLexical) {
    rationale.push(`Overriding non-lexical baseline with REINFORCE candidate: ${reinforceCandidate.token}.`);
    return { baselineTarget, advisedTarget: reinforceCandidate.token, shouldOverride: true, reasonCode: 'NO_BASELINE_TARGET', rationale };
  }

  rationale.push(`Keeping baseline target ${baselineTarget} (${baselineClass}).`);
  return { baselineTarget, advisedTarget: baselineTarget, shouldOverride: false, reasonCode: 'KEEP_BASELINE', rationale };
}
