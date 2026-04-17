import { stateManager } from './js/state.ts';
import { dictionaryEngine } from './js/dictionaryEngine.ts';
import { learningMemory } from './js/learningMemory.ts';
import { attentionEngine } from './js/attentionEngine.ts';
import { cognitiveSelectors } from './js/cognitiveSelectors.ts';
import { parseSRT } from './js/subtitleParser.ts';
import { tokenTrie } from './js/tokenTrie.ts';
import { segmentationPostProcessor } from './js/segmentationPostProcessor.ts';
import { timeAuthority } from './js/timeAuthority.ts';

// Mock localStorage for Node.js
if (typeof global !== 'undefined' && !global.localStorage) {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null
  } as any;
}

async function runVerification() {
  // Setup
  try {
    await dictionaryEngine.loadLargeLexicon('http://localhost:3000/data/cn_lexicon_large.json');
  } catch (e) {
    console.log("Lexicon Error:", e);
    console.log("Fallback Mode: Using curated entries only.");
  }
  
  const sampleSRT = `
1
00:00:01,000 --> 00:00:04,000
你好，欢迎来到LinguaPlay。

2
00:00:05,000 --> 00:00:08,000
我们一起学习中文。
  `;
  const subtitles = parseSRT(sampleSRT);
  
  // Actually tokenize them
  for (const sub of subtitles) {
    const rawTokens = tokenTrie.segment(sub.text);
    sub.tokens = segmentationPostProcessor.process(rawTokens);
  }
  
  console.log("=== PART B: RUNTIME PRESERVATION PROOF ===");
  console.log("Subtitles parsed:", JSON.stringify(subtitles, null, 2));
  
  const tokens1 = subtitles[0].tokens || [];
  const tokens2 = subtitles[1].tokens || [];
  
  console.log("Tokens Row 1:", tokens1);
  console.log("Tokens Row 2:", tokens2);
  
  const savedWords = new Set<string>();
  
  const baselineTarget1 = attentionEngine.getNextTargetToken(tokens1, savedWords);
  console.log("Baseline Attention Target Row 1:", baselineTarget1);
  
  const baselineTarget2 = attentionEngine.getNextTargetToken(tokens2, savedWords);
  console.log("Baseline Attention Target Row 2:", baselineTarget2);

  console.log("\\n=== PART D: OVERRIDE EXPLAINABILITY PROOF ===");
  
  const now = timeAuthority.getNow();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  
  // Setup memory for tokens
  // Row 1: 你好 (nǐ hǎo), 欢迎 (huān yíng), 来到 (lái dào), LinguaPlay
  // Row 2: 我们 (wǒ men), 一起 (yì qǐ), 学习 (xué xí), 中文 (zhōng wén)
  
  // Case 1: INTRODUCE_OVERRIDE
  // Baseline target will likely be '你好' (common) or '欢迎'. Let's see.
  // Actually, baseline target is usually the first unknown/rare token.
  // With empty memory, all are UNSEEN.
  const advice1 = cognitiveSelectors.getAttentionAdvice(tokens1, baselineTarget1);
  console.log("Case 1 (INTRODUCE_OVERRIDE):");
  console.log("Tokens:", tokens1);
  console.log("Baseline Target:", baselineTarget1);
  console.log("Advised Target:", advice1.advisedTarget);
  console.log("Should Override:", advice1.shouldOverride);
  console.log("Reason Code:", advice1.reasonCode);
  console.log("Rationale:", advice1.rationale);
  
  // Case 2: RESCUE_OVERRIDE
  // Let's make '欢迎' a RESCUE candidate (LOST state)
  learningMemory.recordEncounter('欢迎', now - 50 * MS_PER_DAY);
  for(let i=0; i<15; i++) learningMemory.recordEncounter('欢迎', now - 50 * MS_PER_DAY);
  for(let i=0; i<4; i++) learningMemory.recordReview('欢迎', now - 50 * MS_PER_DAY);
  
  const advice2 = cognitiveSelectors.getAttentionAdvice(tokens1, baselineTarget1);
  console.log("\\nCase 2 (RESCUE_OVERRIDE):");
  console.log("Tokens:", tokens1);
  console.log("Baseline Target:", baselineTarget1);
  console.log("Advised Target:", advice2.advisedTarget);
  console.log("Should Override:", advice2.shouldOverride);
  console.log("Reason Code:", advice2.reasonCode);
  console.log("Rationale:", advice2.rationale);
  
  // Case 3: KEEP_BASELINE
  // Let's make baseline target '你好' a RESCUE candidate too, so it keeps it.
  learningMemory.recordEncounter('你好', now - 50 * MS_PER_DAY);
  for(let i=0; i<15; i++) learningMemory.recordEncounter('你好', now - 50 * MS_PER_DAY);
  for(let i=0; i<4; i++) learningMemory.recordReview('你好', now - 50 * MS_PER_DAY);
  
  const advice3 = cognitiveSelectors.getAttentionAdvice(tokens1, '你好');
  console.log("\\nCase 3 (KEEP_BASELINE):");
  console.log("Tokens:", tokens1);
  console.log("Baseline Target:", '你好');
  console.log("Advised Target:", advice3.advisedTarget);
  console.log("Should Override:", advice3.shouldOverride);
  console.log("Reason Code:", advice3.reasonCode);
  console.log("Rationale:", advice3.rationale);

  console.log("\\n=== PART E: DETERMINISM PROOF ===");
  const run1 = cognitiveSelectors.getAttentionAdvice(tokens1, baselineTarget1);
  const run2 = cognitiveSelectors.getAttentionAdvice(tokens1, baselineTarget1);
  const run3 = cognitiveSelectors.getAttentionAdvice(tokens1, baselineTarget1);
  console.log("Run 1 Advised Target:", run1.advisedTarget);
  console.log("Run 2 Advised Target:", run2.advisedTarget);
  console.log("Run 3 Advised Target:", run3.advisedTarget);
  console.log("Are runs identical?", JSON.stringify(run1) === JSON.stringify(run2) && JSON.stringify(run2) === JSON.stringify(run3));

  console.log("\\n=== PART F: REVIEW PLANNER PROOF ===");
  const reviewCandidates = cognitiveSelectors.getReviewCandidates(subtitles);
  console.log(JSON.stringify(reviewCandidates, null, 2));

}

runVerification();
