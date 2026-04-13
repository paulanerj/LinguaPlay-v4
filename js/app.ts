/**
 * PURPOSE: Application Entry Point.
 * WHY THIS EXISTS: Orchestrates initialization and lifecycle.
 * 
 * RUNTIME INVARIANTS:
 *   - Video Time Authority: video.currentTime is the sole source of truth for subtitle sync.
 *   - Deterministic Tokenization: Identical input text + lexicon always produces identical token streams.
 *   - Attention Determinism: Target selection is a pure function of current tokens and review history.
 *   - Observational Memory: Memory records raw exposure events; no cognitive inference is performed in this layer.
 *   - Lexicon Authority: dictionaryEngine manages the truth of what constitutes a valid learning token.
 *   - No Inference Layer: This baseline does not guess learner knowledge; it only records observations.
 */

import { initUI } from './uiBindings.ts';
import { parseSRT } from './subtitleParser.ts';
import { stateManager } from './state.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';
import { tokenTrie } from './tokenTrie.ts';
import { segmentationPostProcessor } from './segmentationPostProcessor.ts';

function runSegmentationTest() {
  console.log("\n--- Segmentation Validation Test ---");
  const testLines = [
    "我希望那家饭馆不用排队。",
    "走吧，我已经饿了。",
    "今晚可能很忙。",
    "你不用担心。",
    "我觉得这个办法可以。",
    "如果人太多，我们也可以先去附近走一走。"
  ];

  testLines.forEach(line => {
    const rawTokens = tokenTrie.segment(line);
    const tokens = segmentationPostProcessor.process(rawTokens);
    
    let hits = 0;
    let misses = 0;
    
    tokens.forEach(token => {
      const isChinese = /[\u4e00-\u9fa5]/.test(token);
      if (isChinese) {
        if (dictionaryEngine.getEntry(token).entry) {
          hits++;
        } else {
          misses++;
        }
      }
    });

    console.log(`[Test] Raw line: ${line}`);
    console.log(`[Test] Segmented tokens: ${tokens.join(' | ')}`);
    console.log(`[Test] Dictionary hits: ${hits}, misses: ${misses}\n`);
  });
  console.log("------------------------------------\n");
}

async function bootstrap() {
  console.log("LinguaPlay Initializing...");

  // 1. Load Lexicon (Hard Initialization Gate)
  try {
    await dictionaryEngine.initialize();
    console.log("[Lexicon] Initialization complete");
  } catch (err) {
    console.error("[Lexicon] Failed to load", err);
    document.body.innerHTML = "<h1 style='color:red; text-align:center; margin-top:20vh;'>Dictionary failed to load</h1>";
    throw err;
  }

  // 2. Initialize UI
  const { loadDemo } = initUI();

  // Run Segmentation Test
  runSegmentationTest();

  // 3. Initial Demo Load
  await loadDemo();

  const finalState = stateManager.getState();
  console.log(`LinguaPlay Ready. LexiconMode: ${finalState.lexiconMode}`);
}

bootstrap();
