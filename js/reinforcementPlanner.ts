import { ReinforcementCandidate, ReinforcementClass, TokenLearningProfile } from './cognitiveTypes.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';

export class ReinforcementPlanner {
  /**
   * Assigns a reinforcement class to a token based on its profile and lexical status.
   */
  classifyToken(profile: TokenLearningProfile): ReinforcementClass {
    const entry = dictionaryEngine.getEntry(profile.token);
    const isLexical = entry.truthStatus !== 'NON_LEXICAL';

    if (!isLexical || profile.inferredState === 'AUTOMATIC') {
      return 'IGNORE';
    }

    if (profile.inferredState === 'FRAGILE' || profile.inferredState === 'LOST') {
      return 'RESCUE';
    }

    if (profile.inferredState === 'RECALLABLE' || profile.inferredState === 'STABLE') {
      if (profile.decayRisk >= 0.4) {
        return 'REACTIVATE';
      }
      return 'IGNORE'; // If decayRisk < 0.4, no need to reactivate yet
    }

    if (profile.inferredState === 'FAMILIAR' || profile.inferredState === 'SEMANTICALLY_LINKED') {
      return 'REINFORCE';
    }

    if (profile.inferredState === 'UNSEEN' || profile.inferredState === 'SEEN') {
      return 'INTRODUCE';
    }

    return 'IGNORE';
  }

  /**
   * Computes a priority score for deterministic ordering across classes.
   * Lower score means higher priority.
   */
  private getClassPriority(cls: ReinforcementClass): number {
    switch (cls) {
      case 'RESCUE': return 1;
      case 'INTRODUCE': return 2;
      case 'REACTIVATE': return 3;
      case 'REINFORCE': return 4;
      case 'IGNORE': return 5;
    }
  }

  /**
   * Generates a sorted list of reinforcement candidates from a list of profiles.
   */
  planReinforcement(profiles: TokenLearningProfile[], tokenAppearanceOrder?: Map<string, number>): ReinforcementCandidate[] {
    const candidates: ReinforcementCandidate[] = profiles.map(profile => {
      const reinforcementClass = this.classifyToken(profile);
      return {
        token: profile.token,
        reinforcementClass,
        profile,
        priorityScore: this.getClassPriority(reinforcementClass)
      };
    });

    // Filter out IGNORE class to only return actionable candidates
    const actionableCandidates = candidates.filter(c => c.reinforcementClass !== 'IGNORE');

    // Deterministic sorting
    actionableCandidates.sort((a, b) => {
      // 1. Class Priority (RESCUE > INTRODUCE > REACTIVATE > REINFORCE)
      if (a.priorityScore !== b.priorityScore) {
        return a.priorityScore - b.priorityScore;
      }

      // 2. Higher decayRisk
      if (a.profile.decayRisk !== b.profile.decayRisk) {
        return b.profile.decayRisk - a.profile.decayRisk;
      }

      // 3. Lower confidence
      if (a.profile.confidence !== b.profile.confidence) {
        return a.profile.confidence - b.profile.confidence;
      }

      // 4. Token appearance order (if provided)
      if (tokenAppearanceOrder) {
        const orderA = tokenAppearanceOrder.get(a.token) ?? Number.MAX_SAFE_INTEGER;
        const orderB = tokenAppearanceOrder.get(b.token) ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
      }

      // 5. Lexical token string ascending
      return a.token < b.token ? -1 : (a.token > b.token ? 1 : 0);
    });

    return actionableCandidates;
  }
}

export const reinforcementPlanner = new ReinforcementPlanner();
