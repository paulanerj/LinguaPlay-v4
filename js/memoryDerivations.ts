import { CognitiveDerivationInput, TokenLearningProfile, TokenLearningState } from './cognitiveTypes.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function deriveFamiliarityScore(input: CognitiveDerivationInput, evidenceSummary: string[]): number {
  if (!input.memoryRecord) {
    evidenceSummary.push("No memory record exists; familiarityScore is 0.");
    return 0;
  }

  const encounterCount = input.memoryRecord.encounterCount || 0;
  
  // Missing schema fields
  const distinctSubtitleCount = 0;
  const distinctSessionCount = 0;
  const targetExposureCount = 0;

  evidenceSummary.push("distinctSubtitleCount unavailable in current schema; treated as 0.");
  evidenceSummary.push("distinctSessionCount unavailable in current schema; treated as 0.");
  evidenceSummary.push("targetExposureCount unavailable in current schema; treated as 0.");

  const score = (encounterCount * 1.0) +
                (distinctSubtitleCount * 0.75) +
                (distinctSessionCount * 1.5) +
                (targetExposureCount * 0.5);

  evidenceSummary.push(`encounterCount=${encounterCount} contributes to familiarityScore=${score.toFixed(2)}.`);
  return score;
}

export function deriveSemanticLinkScore(input: CognitiveDerivationInput, evidenceSummary: string[]): number {
  if (!input.memoryRecord) {
    evidenceSummary.push("No memory record exists; semanticLinkScore is 0.");
    return 0;
  }

  const reviewCount = input.memoryRecord.reviewCount || 0;
  const saveCount = input.memoryRecord.saveCount || 0;
  
  // Missing schema fields
  const selectedCount = 0;

  evidenceSummary.push("selectedCount unavailable in current schema; treated as 0.");

  const score = (reviewCount * 2.0) +
                (saveCount * 3.0) +
                (selectedCount * 1.5);

  evidenceSummary.push(`reviewCount=${reviewCount}, saveCount=${saveCount} contribute to semanticLinkScore=${score.toFixed(2)}.`);
  return score;
}

export function deriveDecayRisk(input: CognitiveDerivationInput, baseState: TokenLearningState, evidenceSummary: string[]): number {
  if (baseState === 'UNSEEN' || baseState === 'SEEN') {
    evidenceSummary.push(`State is ${baseState}; decayRisk is 0.`);
    return 0;
  }

  if (!input.memoryRecord || !input.memoryRecord.lastSeenAt) {
    evidenceSummary.push("lastSeenAt unavailable; decayRisk defaults to 1.0.");
    return 1.0;
  }

  const elapsedMs = input.now - input.memoryRecord.lastSeenAt;
  const elapsedDays = elapsedMs / MS_PER_DAY;

  let windowDays = 1;
  switch (baseState) {
    case 'FAMILIAR': windowDays = 3; break;
    case 'SEMANTICALLY_LINKED': windowDays = 5; break;
    case 'RECALLABLE': windowDays = 10; break;
    case 'STABLE': windowDays = 21; break;
    case 'AUTOMATIC': windowDays = 45; break;
    default: windowDays = 1; break;
  }

  const risk = Math.min(1.0, elapsedDays / windowDays);
  evidenceSummary.push(`Elapsed ${elapsedDays.toFixed(1)} days against ${windowDays}-day window yields decayRisk=${risk.toFixed(2)}.`);
  return risk;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function deriveConsolidationMomentum(familiarityScore: number, semanticLinkScore: number, state: TokenLearningState, evidenceSummary: string[]): number {
  let threshold = 1;
  switch (state) {
    case 'UNSEEN': threshold = 3; break;
    case 'SEEN': threshold = 3; break;
    case 'FAMILIAR': threshold = 5; break;
    case 'SEMANTICALLY_LINKED': threshold = 7; break;
    case 'RECALLABLE': threshold = 10; break;
    case 'STABLE': threshold = 15; break;
    case 'AUTOMATIC': 
      threshold = 15; 
      evidenceSummary.push("AUTOMATIC is terminal; clamping threshold to 15.");
      break;
    case 'FRAGILE': threshold = 10; break;
    case 'LOST': threshold = 5; break;
  }

  const momentum = clamp((familiarityScore * 0.4 + semanticLinkScore * 0.6) / threshold, 0, 1);
  evidenceSummary.push(`Momentum calculated as ${momentum.toFixed(2)} against threshold ${threshold}.`);
  return momentum;
}

export function deriveConfidence(input: CognitiveDerivationInput, evidenceSummary: string[]): number {
  let confidence = 0.35;
  evidenceSummary.push("Base confidence starts at 0.35.");

  if (input.memoryRecord) {
    if (input.memoryRecord.encounterCount >= 3) {
      confidence += 0.15;
      evidenceSummary.push("encounterCount >= 3 adds 0.15 to confidence.");
    }
    if (input.memoryRecord.reviewCount >= 1) {
      confidence += 0.15;
      evidenceSummary.push("reviewCount >= 1 adds 0.15 to confidence.");
    }
    if (input.memoryRecord.saveCount >= 1) {
      confidence += 0.10;
      evidenceSummary.push("saveCount >= 1 adds 0.10 to confidence.");
    }
    if (input.memoryRecord.lastSeenAt) {
      confidence += 0.10;
      evidenceSummary.push("lastSeenAt exists adds 0.10 to confidence.");
    }
    if (input.memoryRecord.lastReviewedAt) {
      confidence += 0.05;
      evidenceSummary.push("lastReviewedAt exists adds 0.05 to confidence.");
    }
  }

  // Schema limitations reduce evidence quality
  evidenceSummary.push("Missing fields (distinctSubtitleCount, distinctSessionCount, targetExposureCount, selectedCount) reduce overall evidence quality.");
  // We don't add the +0.10 for having enough fields because we are missing several.

  const finalConfidence = clamp(confidence, 0, 1);
  evidenceSummary.push(`Final confidence clamped to ${finalConfidence.toFixed(2)}.`);
  return finalConfidence;
}

export function deriveLearningState(input: CognitiveDerivationInput, evidenceSummary: string[]): { state: TokenLearningState, decayRisk: number } {
  if (!input.memoryRecord || input.memoryRecord.encounterCount === 0) {
    evidenceSummary.push("No memory record or encounterCount=0 supports UNSEEN state.");
    return { state: 'UNSEEN', decayRisk: 0 };
  }

  const encounterCount = input.memoryRecord.encounterCount;
  const reviewCount = input.memoryRecord.reviewCount;
  const saveCount = input.memoryRecord.saveCount;

  // 1. Determine base state (ignoring decay)
  let baseState: TokenLearningState = 'SEEN';

  if (encounterCount >= 15 && reviewCount >= 4) {
    baseState = 'AUTOMATIC';
  } else if (encounterCount >= 8 && reviewCount >= 3) {
    baseState = 'STABLE';
  } else if (encounterCount >= 5 && reviewCount >= 2) {
    baseState = 'RECALLABLE';
  } else if (reviewCount >= 1 || saveCount >= 1) {
    baseState = 'SEMANTICALLY_LINKED';
  } else if (encounterCount >= 3) {
    baseState = 'FAMILIAR';
  }

  // 2. Calculate decay risk for the base state
  const decayRisk = deriveDecayRisk(input, baseState, evidenceSummary);

  // 3. Apply decay transitions
  let finalState: TokenLearningState = baseState;

  if (baseState === 'AUTOMATIC' || baseState === 'STABLE' || baseState === 'RECALLABLE') {
    if (decayRisk >= 0.9) {
      finalState = 'LOST';
      evidenceSummary.push(`decayRisk=${decayRisk.toFixed(2)} >= 0.9 downgrades ${baseState} to LOST.`);
    } else if (decayRisk >= 0.5) {
      finalState = 'FRAGILE';
      evidenceSummary.push(`decayRisk=${decayRisk.toFixed(2)} >= 0.5 downgrades ${baseState} to FRAGILE.`);
    } else if (baseState === 'AUTOMATIC' && decayRisk >= 0.2) {
      finalState = 'STABLE';
      evidenceSummary.push(`decayRisk=${decayRisk.toFixed(2)} >= 0.2 downgrades AUTOMATIC to STABLE.`);
    } else if (baseState === 'STABLE' && decayRisk >= 0.35) {
      finalState = 'RECALLABLE';
      evidenceSummary.push(`decayRisk=${decayRisk.toFixed(2)} >= 0.35 downgrades STABLE to RECALLABLE.`);
    }
  } else if (baseState === 'SEMANTICALLY_LINKED' || baseState === 'FAMILIAR') {
    if (decayRisk >= 0.9) {
      finalState = 'LOST';
      evidenceSummary.push(`decayRisk=${decayRisk.toFixed(2)} >= 0.9 downgrades ${baseState} to LOST.`);
    }
  }

  if (finalState === baseState) {
    evidenceSummary.push(`Base state ${baseState} maintained with decayRisk=${decayRisk.toFixed(2)}.`);
  }

  return { state: finalState, decayRisk };
}

export function deriveProfile(input: CognitiveDerivationInput): TokenLearningProfile {
  const evidenceSummary: string[] = [];
  
  const familiarityScore = deriveFamiliarityScore(input, evidenceSummary);
  const semanticLinkScore = deriveSemanticLinkScore(input, evidenceSummary);
  
  const { state, decayRisk } = deriveLearningState(input, evidenceSummary);
  
  const consolidationMomentum = deriveConsolidationMomentum(familiarityScore, semanticLinkScore, state, evidenceSummary);
  const confidence = deriveConfidence(input, evidenceSummary);

  return {
    token: input.token,
    inferredState: state,
    confidence,
    decayRisk,
    consolidationMomentum,
    familiarityScore,
    semanticLinkScore,
    evidenceSummary,
    profileVersion: 1
  };
}
