/**
 * PURPOSE: Attention Orchestration Engine.
 * WHY THIS EXISTS: Identifies the next optimal learning target to guide user focus.
 * CONTRACT:
 *   - Operates as a guidance overlay only.
 *   - Does not mutate existing token state.
 *   - Deterministic per subtitle row.
 */

import { GravitySystem } from '../engine/GravitySystem.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';

class AttentionEngine {
  private reviewedTokens: Set<string> = new Set();
  private sessionReviewedTokens: Set<string> = new Set();

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
   * Also tracks it for the session to lower its priority later (future task).
   */
  markTokenReviewed(token: string) {
    console.log(`[ATTENTION] reviewed=${token}`);
    this.reviewedTokens.add(token);
    this.sessionReviewedTokens.add(token);
  }

  /**
   * Determines the next target token from a list of tokens.
   * Priority: Unknown > Rare > Mid > Common.
   * Excludes Known tokens, punctuation, and already reviewed tokens.
   */
  getNextTargetToken(tokens: string[], savedWords: Set<string>): string | null {
    const target = GravitySystem.selectTarget(
      tokens,
      savedWords,
      this.reviewedTokens,
      this.sessionReviewedTokens,
      dictionaryEngine
    );

    if (target) {
      console.log(`[ATTENTION] target=${target}`);
    } else {
      console.log(`[ATTENTION] target=null (no valid targets remaining)`);
    }

    return target;
  }

  getReviewedInCycle(): Set<string> {
    return this.reviewedTokens;
  }

  getReviewedInSession(): Set<string> {
    return this.sessionReviewedTokens;
  }
}

export const attentionEngine = new AttentionEngine();
