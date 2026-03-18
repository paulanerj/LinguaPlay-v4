/**
 * ENGINE PRIMITIVE: GravitySystem
 * PURPOSE: Target selection logic.
 * INVARIANT: Deterministic selection based on priority and history.
 */

import { BonusMaskSystem, DictionaryLookup } from './BonusMaskSystem.ts';
import { ChainEngine } from './ChainEngine.ts';

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
    // Filter for meaningful tokens (Chinese characters or in dictionary)
    const meaningfulTokens = tokens.filter(t => 
      /[\u4e00-\u9fa5]/.test(t) || dictionary.getEntry(t) !== null
    );

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
}
