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

async function bootstrap() {
  console.log("LinguaPlay Initializing...");

  // 1. Initialize UI
  initUI();

  // 2. Load Lexicon (Phase 3 Task)
  await dictionaryEngine.loadLargeLexicon('/data/cn_lexicon_large.json');

  // 3. Initial Demo Load
  document.getElementById('btn-demo')?.click();

  const finalState = stateManager.getState();
  console.log(`LinguaPlay Ready. LexiconMode: ${finalState.lexiconMode}`);
}

bootstrap();
