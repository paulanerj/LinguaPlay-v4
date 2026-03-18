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
  static classify(token: string, savedWords: Set<string>, dictionary: DictionaryLookup): HeatLevel {
    if (savedWords.has(token)) {
      return 'known';
    }

    const result = dictionary.getEntry(token);
    const entry = result.entry;

    // 1. Non-lexical check
    if (result.truthStatus === LexiconTruthStatus.NON_LEXICAL) {
      return 'known'; // Treat as known to avoid highlighting
    }

    // 2. Curated check
    if (result.truthStatus === LexiconTruthStatus.CURATED) {
      return 'common';
    }

    // 3. Found check
    if (result.truthStatus === LexiconTruthStatus.FOUND && entry) {
      if (entry.hsk && entry.hsk <= 2) return 'common';
      if (entry.hsk && entry.hsk <= 4) return 'mid';
      if (entry.frequencyBand) return entry.frequencyBand;
      return 'rare';
    }

    // 4. Missing check
    if (result.truthStatus === LexiconTruthStatus.MISSING) {
      return 'unknown';
    }

    return 'unknown';
  }
}
