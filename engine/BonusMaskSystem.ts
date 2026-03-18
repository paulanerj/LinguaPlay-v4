/**
 * ENGINE PRIMITIVE: BonusMaskSystem
 * PURPOSE: Token difficulty classification.
 * INVARIANT: Deterministic mapping of token + context to HeatLevel.
 */

import { LexiconResult, LexiconTruthStatus } from '../js/dictionaryEngine.ts';

export type HeatLevel = 'known' | 'common' | 'mid' | 'rare' | 'unknown';

export interface DictionaryLookup {
  getEntry(token: string): LexiconResult;
}

export class BonusMaskSystem {
  /**
   * Classifies a token into a difficulty band.
   */
  static classify(token: string, savedWords: Set<string>, dictionary: DictionaryLookup): HeatLevel | null {
    // 1. savedWords -> known
    if (savedWords.has(token)) {
      return 'known';
    }

    const result = dictionary.getEntry(token);
    const entry = result.entry;

    // 2. truthStatus CURATED -> common
    if (result.truthStatus === LexiconTruthStatus.CURATED) {
      return 'common';
    }

    // 3. truthStatus FOUND -> use metadata band
    if (result.truthStatus === LexiconTruthStatus.FOUND && entry) {
      if (entry.hsk && entry.hsk <= 2) return 'common';
      if (entry.hsk && entry.hsk <= 4) return 'mid';
      if (entry.frequencyBand) return entry.frequencyBand;
      return 'rare';
    }

    // 4. truthStatus MISSING -> unknown
    if (result.truthStatus === LexiconTruthStatus.MISSING) {
      return 'unknown';
    }

    // 5. NON_LEXICAL -> skip classification
    if (result.truthStatus === LexiconTruthStatus.NON_LEXICAL) {
      return null;
    }

    return 'unknown';
  }
}
