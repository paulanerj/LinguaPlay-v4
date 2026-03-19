/**
 * PURPOSE: Attention Orchestration Engine.
 * WHY THIS EXISTS: Identifies the next optimal learning target to guide user focus.
 * CONTRACT:
 *   - Operates as a guidance overlay only.
 *   - Does not mutate existing token state.
 *   - Deterministic per subtitle row.
 */

import { classifyToken, HeatLevel } from './frequencyHeatmap.ts';

class AttentionEngine {
  private reviewedTokens: Set<string> = new Set();
  private priority: HeatLevel[] = ['unknown', 'rare', 'mid', 'common'];

  /**
   * Resets the attention cycle (usually on new subtitle row).
   */
  resetAttentionCycle() {
    this.reviewedTokens.clear();
  }

  /**
   * Marks a token as reviewed so it won't be targeted again in the current cycle.
   */
  markTokenReviewed(token: string) {
    this.reviewedTokens.add(token);
  }

  /**
   * Determines the next target token from a list of tokens.
   * Priority: Unknown > Rare > Mid > Common.
   * Excludes Known tokens.
   */
  getNextTargetToken(tokens: string[], savedWords: Set<string>): string | null {
    for (const level of this.priority) {
      for (const token of tokens) {
        // Skip tokens already reviewed in this cycle
        if (this.reviewedTokens.has(token)) continue;

        const tokenLevel = classifyToken(token, savedWords);
        if (tokenLevel === level) {
          return token;
        }
      }
    }
    return null;
  }
}

export const attentionEngine = new AttentionEngine();
