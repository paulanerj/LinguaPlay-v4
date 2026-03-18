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
你好，我们一起学习中文。

2
00:00:05,000 --> 00:00:08,000
这个认知系统帮助学习者。

3
00:00:09,000 --> 00:00:12,000
学习者学习再学习！

4
00:00:13,000 --> 00:00:16,000
来到这个系统的用户。

5
00:00:17,000 --> 00:00:20,000
LinguaPlay is powerful.

6
00:00:21,000 --> 00:00:24,000
这是一个极其复杂的系统架构测试。

7
00:00:25,000 --> 00:00:28,000
帮助帮助帮助帮助。

8
00:00:29,000 --> 00:00:32,000
再学习，再理解，再进步。
  `;
  const subs = parseSRT(sampleSRT);
  stateManager.setState({ subtitles: subs });

  console.log("LinguaPlay Ready.");
}

bootstrap();
