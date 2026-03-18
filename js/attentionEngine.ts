/**
 * PURPOSE: Attention Orchestration Engine.
 * WHY THIS EXISTS: Identifies the next optimal learning target to guide user focus.
 * CONTRACT:
 *   - Operates as a guidance overlay only.
 *   - Does not mutate existing token state.
 *   - Deterministic per subtitle row.
 */

import { classifyToken, HeatLevel } from './frequencyHeatmap.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';

class AttentionEngine {
  private reviewedTokens: Set<string> = new Set();
  private sessionReviewedTokens: Set<string> = new Set();
  private priority: HeatLevel[] = ['unknown', 'rare', 'mid', 'common'];

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
    // Filter for meaningful tokens (Chinese characters or in dictionary)
    // LAW D & E: Must never target punctuation or latin tokens
    const meaningfulTokens = tokens.filter(t => 
      /[\u4e00-\u9fa5]/.test(t) || dictionaryEngine.getEntry(t) !== null
    );

    for (const level of this.priority) {
      for (const token of meaningfulTokens) {
        // Skip tokens already reviewed in this cycle
        if (this.reviewedTokens.has(token)) continue;
        
        // Lower priority for tokens already seen in this session (if they are not unknown)
        const tokenLevel = classifyToken(token, savedWords);
        if (tokenLevel !== 'unknown' && this.sessionReviewedTokens.has(token)) continue;

        if (tokenLevel === level) {
          console.log(`[ATTENTION] target=${token} level=${level}`);
          return token;
        }
      }
    }

    // Fallback: If all meaningful tokens were reviewed in session, allow session-reviewed ones
    for (const level of this.priority) {
      for (const token of meaningfulTokens) {
        if (this.reviewedTokens.has(token)) continue;
        const tokenLevel = classifyToken(token, savedWords);
        if (tokenLevel === level) {
          console.log(`[ATTENTION] target=${token} level=${level} (session fallback)`);
          return token;
        }
      }
    }

    console.log(`[ATTENTION] target=null (no valid targets remaining)`);
    return null;
  }
}

export const attentionEngine = new AttentionEngine();
