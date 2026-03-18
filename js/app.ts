/**
 * PURPOSE: Application Entry Point.
 * WHY THIS EXISTS: Orchestrates initialization and lifecycle.
 */

import { initUI } from './uiBindings.ts';
import { parseSRT } from './subtitleParser.ts';
import { stateManager } from './state.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';

export const PEDAGOGICAL_DEMO = true;

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
你好，我们一起学习中文。(HSK1 Found)

2
00:00:05,000 --> 00:00:08,000
这是一个极其复杂的系统架构测试。(HSK4+ Rare)

3
00:00:09,000 --> 00:00:12,000
来到这个系统的用户。(Common Found)

4
00:00:13,000 --> 00:00:16,000
LinguaPlay is powerful. (Latin Non-Lexical)

5
00:00:17,000 --> 00:00:20,000
帮助帮助帮助帮助。(Curated/Common)

6
00:00:21,000 --> 00:00:24,000
这是一个极其罕见的词汇：饕餮。(Missing/Rare)

7
00:00:25,000 --> 00:00:28,000
标点符号测试：，。！？；：(Punctuation Non-Lexical)
  `;
  const subs = parseSRT(sampleSRT);
  stateManager.setState({ subtitles: subs, pedagogicalDemo: PEDAGOGICAL_DEMO });

  // Task 6: Pedagogical Demo - Auto-pause first subtitle
  if (PEDAGOGICAL_DEMO && subs.length > 0) {
    const video = document.querySelector('video') as HTMLVideoElement;
    video.currentTime = subs[0].start;
    video.pause();
  }

  console.log("LinguaPlay Ready.");
}

bootstrap();
