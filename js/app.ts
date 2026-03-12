/**
 * PURPOSE: Application Entry Point.
 * WHY THIS EXISTS: Orchestrates initialization and lifecycle.
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

  // 3. Load Sample Subtitles
  const sampleSRT = `
1
00:00:01,000 --> 00:00:04,000
你好，欢迎来到LinguaPlay。

2
00:00:05,000 --> 00:00:08,000
我们一起学习中文。
  `;
  const subs = parseSRT(sampleSRT);
  stateManager.setState({ subtitles: subs });

  console.log("LinguaPlay Ready.");
}

bootstrap();
