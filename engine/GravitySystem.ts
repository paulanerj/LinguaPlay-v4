/**
 * ENGINE PRIMITIVE: GravitySystem
 * PURPOSE: Target selection logic.
 * INVARIANT: Deterministic selection based on priority and history.
 */

import { BonusMaskSystem, DictionaryLookup } from './BonusMaskSystem.ts';
import { ChainEngine } from './ChainEngine.ts';
import { LexiconTruthStatus } from '../js/dictionaryEngine.ts';

export class GravitySystem {
  /**
   * Selects the next optimal target token.
   * LAW D & E: Excludes non-lexical tokens.
   * LAW F: Follows ChainEngine priority.
   */
  static selectTarget(
    tokens: string[],
    savedWords: Set<string>,
    reviewedInCycle: Set<string>,
    reviewedInSession: Set<string>,
    dictionary: DictionaryLookup
  ): string | null {
    // Filter for meaningful tokens (Chinese characters or in dictionary, excluding NON_LEXICAL)
    const meaningfulTokens = tokens.filter(t => {
      const result = dictionary.getEntry(t);
      return result.truthStatus !== LexiconTruthStatus.NON_LEXICAL && 
             result.truthStatus !== LexiconTruthStatus.PENDING;
    });

    const priority = ChainEngine.getPriorityChain();

    // Primary Pass: Respect session history
    for (const level of priority) {
      for (const token of meaningfulTokens) {
        if (reviewedInCycle.has(token)) continue;
        
        const tokenLevel = BonusMaskSystem.classify(token, savedWords, dictionary);
        
        // Lower priority for tokens already seen in this session (if they are not unknown)
        if (tokenLevel !== 'unknown' && reviewedInSession.has(token)) continue;

        if (tokenLevel === level) {
          return token;
        }
      }
    }

    // Fallback Pass: Allow session-reviewed tokens if no new targets exist
    for (const level of priority) {
      for (const token of meaningfulTokens) {
        if (reviewedInCycle.has(token)) continue;
        const tokenLevel = BonusMaskSystem.classify(token, savedWords, dictionary);
        if (tokenLevel === level) {
          return token;
        }
      }
    }

    return null;
  }

  /**
   * Returns a detailed trace of the decision process for the next target.
   * O(n) performance.
   */
  static getDecisionTrace(
    tokens: string[],
    savedWords: Set<string>,
    reviewedInCycle: Set<string>,
    reviewedInSession: Set<string>,
    dictionary: DictionaryLookup
  ): any {
    const meaningfulTokens = tokens.filter(t => {
      const result = dictionary.getEntry(t);
      return result.truthStatus !== LexiconTruthStatus.NON_LEXICAL && 
             result.truthStatus !== LexiconTruthStatus.PENDING;
    });

    const priority = ChainEngine.getPriorityChain();
    const skippedTokens: string[] = [];
    const evaluatedLevels: string[] = [];

    // Primary Pass
    for (const level of priority) {
      evaluatedLevels.push(level);
      for (const token of meaningfulTokens) {
        if (reviewedInCycle.has(token)) {
          if (!skippedTokens.includes(token)) skippedTokens.push(token);
          continue;
        }
        
        const tokenLevel = BonusMaskSystem.classify(token, savedWords, dictionary);
        
        if (tokenLevel !== 'unknown' && reviewedInSession.has(token)) {
          if (!skippedTokens.includes(token)) skippedTokens.push(token);
          continue;
        }

        if (tokenLevel === level) {
          return {
            evaluatedLevels,
            skippedTokens,
            chosenToken: token,
            reason: level
          };
        }
      }
    }

    // Fallback Pass
    for (const level of priority) {
      for (const token of meaningfulTokens) {
        if (reviewedInCycle.has(token)) continue;
        const tokenLevel = BonusMaskSystem.classify(token, savedWords, dictionary);
        if (tokenLevel === level) {
          return {
            evaluatedLevels,
            skippedTokens,
            chosenToken: token,
            reason: level + " (fallback)"
          };
        }
      }
    }

    return {
      evaluatedLevels,
      skippedTokens,
      chosenToken: null,
      reason: null
    };
  }
}
