/**
 * PURPOSE: Segmentation Post-Processor Layer.
 * WHY THIS EXISTS: Refines raw greedy MaxMatch tokens into intelligent linguistic chunks.
 * 
 * HYPER-COMMENT:
 *   - This is a post-processing refinement layer.
 *   - It does NOT replace the frozen trie segmentation (tokenTrie.ts).
 *   - Conservative merging is preferred over aggressive incorrect grouping.
 * 
 * CONTRACT:
 *   - Input: Array of raw tokens.
 *   - Output: Array of refined tokens.
 *   - Side Effects: None. Pure function.
 */

export class SegmentationPostProcessor {
  // TASK 1 — Compound Override Dictionary
  // Forces merging of tokens that the greedy trie might split incorrectly or that should always be treated as a unit.
  private compoundOverrides: Map<string, boolean> = new Map([
    ["不是", true],
    ["可以", true],
    ["应该", true],
    ["中国人", true],
    ["为什么", true],
    ["是什么", true],
    ["常常", true],
    ["丽丽", true],
    ["不用", true],
    ["已经", true],
    ["还是", true],
    ["还有", true],
    ["有点", true],
    ["一起", true],
    ["怎么样", true],
    ["没关系", true],
    ["对不起", true],
    ["因为", true],
    ["如果", true],
    ["然后", true],
    ["马上", true]
  ]);

  // TASK 2 — Phrase Priority Weighting
  // Resolves ambiguities by preferring known high-priority compounds.
  private phrasePriority: Map<string, number> = new Map([
    ["你好", 10],
    ["欢迎", 8],
    ["来到", 8]
  ]);

  /**
   * Processes raw tokens and applies intelligence heuristics.
   */
  process(rawTokens: string[]): string[] {
    if (!rawTokens || rawTokens.length === 0) return [];

    // Step 1: Latin Character Merging (Proper Noun Heuristic part 1)
    // The trie splits unknown English words into single characters. We must re-assemble them.
    const preProcessed: string[] = [];
    let currentLatin = "";
    
    for (const token of rawTokens) {
      if (/^[a-zA-Z]+$/.test(token)) {
        currentLatin += token;
      } else {
        if (currentLatin) {
          preProcessed.push(currentLatin);
          currentLatin = "";
        }
        preProcessed.push(token);
      }
    }
    if (currentLatin) {
      preProcessed.push(currentLatin);
    }

    // Step 2: Apply Overrides and Priorities
    const refined: string[] = [];
    let i = 0;

    while (i < preProcessed.length) {
      const current = preProcessed[i];

      // Lookahead for 3-token compounds
      if (i + 2 < preProcessed.length) {
        const merged3 = current + preProcessed[i + 1] + preProcessed[i + 2];
        if (this.compoundOverrides.has(merged3) || this.phrasePriority.has(merged3)) {
          refined.push(merged3);
          i += 3;
          continue;
        }
      }

      // Lookahead for 2-token compounds
      if (i + 1 < preProcessed.length) {
        const merged2 = current + preProcessed[i + 1];
        if (this.compoundOverrides.has(merged2) || this.phrasePriority.has(merged2)) {
          refined.push(merged2);
          i += 2;
          continue;
        }
      }

      // No merges applied, keep the token
      refined.push(current);
      i++;
    }

    return refined;
  }

  /**
   * TASK 5 — Segmentation Confidence Score
   * Evaluates the quality of the segmentation.
   * Returns a score between 0.0 and 1.0.
   */
  scoreSegmentation(tokens: string[]): number {
    if (tokens.length === 0) return 1.0;

    let score = 1.0;
    let singleCharCount = 0;
    let knownCompoundCount = 0;

    for (const token of tokens) {
      // Penalize isolated single Chinese characters (often a sign of failed max-match)
      if (token.length === 1 && /[\u4e00-\u9fa5]/.test(token)) {
        singleCharCount++;
      }
      
      // Reward known overrides or priorities
      if (this.compoundOverrides.has(token) || this.phrasePriority.has(token)) {
        knownCompoundCount++;
      }
    }

    // Penalty: Up to 0.4 deduction for too many single characters
    const singleCharRatio = singleCharCount / tokens.length;
    score -= (singleCharRatio * 0.4);

    // Bonus: Up to 0.2 addition for known compounds
    const compoundBonus = Math.min(knownCompoundCount * 0.05, 0.2);
    score += compoundBonus;

    // Clamp between 0 and 1
    return Math.max(0.0, Math.min(1.0, score));
  }
}

export const segmentationPostProcessor = new SegmentationPostProcessor();
