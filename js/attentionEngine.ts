/**
 * PURPOSE: Attention Orchestration Engine.
 * WHY THIS EXISTS: Identifies the next optimal learning target to guide user focus.
 * CONTRACT:
 *   - Operates as a guidance overlay only.
 *   - Does not mutate existing token state.
 *   - Deterministic per subtitle row.
 */

import { dictionaryEngine } from './dictionaryEngine.ts';
import { classifyToken, HeatLevel } from './frequencyHeatmap.ts';

class AttentionEngine {
  private reviewedTokens: Set<string> = new Set();
  private sessionReviewedTokens: Set<string> = new Set();

  /**
   * The canonical priority sequence for learning targets.
   * Unknown -> Rare -> Mid -> Common.
   */
  private static getPriorityChain(): HeatLevel[] {
    return ['unknown', 'rare', 'mid', 'common'];
  }

  /**
   * Resets the attention cycle for the current subtitle row.
   */
  resetAttentionCycle() {
    this.reviewedTokens.clear();
  }

  /**
   * Resets the session-wide reviewed tokens (usually on full content swap).
   */
  resetSessionReviewedTokens() {
    this.sessionReviewedTokens.clear();
    this.reviewedTokens.clear();
  }

  /**
   * Marks a token as reviewed so it won't be targeted again in the current cycle.
   */
  markTokenReviewed(token: string) {
    console.log(`[ATTENTION] reviewed=${token}`);
    this.reviewedTokens.add(token);
    this.sessionReviewedTokens.add(token);
  }

  /**
   * Determines the next target token from a list of tokens.
   */
  getNextTargetToken(tokens: string[], savedWords: Set<string>): string | null {
    // Filter for meaningful tokens (excluding NON_LEXICAL)
    const meaningfulTokens = tokens.filter(t => {
      const result = dictionaryEngine.getEntry(t);
      return result.truthStatus !== 'NON_LEXICAL';
    });

    const priority = AttentionEngine.getPriorityChain();

    // Primary Pass: Respect session history
    for (const level of priority) {
      for (const token of meaningfulTokens) {
        if (this.reviewedTokens.has(token)) continue;
        
        const tokenLevel = classifyToken(token, savedWords);
        
        // Lower priority for tokens already seen in this session (if they are not unknown)
        if (tokenLevel !== 'unknown' && this.sessionReviewedTokens.has(token)) continue;

        if (tokenLevel === level) {
          console.log(`[ATTENTION] target=${token} (level=${level})`);
          return token;
        }
      }
    }

    // Fallback Pass: Allow session-reviewed tokens if no new targets exist
    for (const level of priority) {
      for (const token of meaningfulTokens) {
        if (this.reviewedTokens.has(token)) continue;
        const tokenLevel = classifyToken(token, savedWords);
        if (tokenLevel === level) {
          console.log(`[ATTENTION] target=${token} (level=${level}, fallback)`);
          return token;
        }
      }
    }

    console.log(`[ATTENTION] target=null (no valid targets remaining)`);
    return null;
  }

  /**
   * Returns a detailed trace of the decision process for the next target.
   * Used by Debug Overlay.
   */
  getDecisionTrace(tokens: string[], savedWords: Set<string>): any {
    const meaningfulTokens = tokens.filter(t => {
      const result = dictionaryEngine.getEntry(t);
      return result.truthStatus !== 'NON_LEXICAL';
    });

    const priority = AttentionEngine.getPriorityChain();
    const skippedTokens: string[] = [];
    const evaluatedLevels: string[] = [];

    // Primary Pass
    for (const level of priority) {
      evaluatedLevels.push(level);
      for (const token of meaningfulTokens) {
        if (this.reviewedTokens.has(token)) {
          if (!skippedTokens.includes(token)) skippedTokens.push(token);
          continue;
        }
        
        const tokenLevel = classifyToken(token, savedWords);
        
        if (tokenLevel !== 'unknown' && this.sessionReviewedTokens.has(token)) {
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
        if (this.reviewedTokens.has(token)) continue;
        const tokenLevel = classifyToken(token, savedWords);
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

  getReviewedInCycle(): Set<string> {
    return this.reviewedTokens;
  }

  getReviewedInSession(): Set<string> {
    return this.sessionReviewedTokens;
  }
}

export const attentionEngine = new AttentionEngine();
