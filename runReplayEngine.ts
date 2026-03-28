import './mockLocalStorage.ts';
import { replayEngine, ReplayEvent } from './js/replayEngine.ts';
import { timeAuthority } from './js/timeAuthority.ts';

const sampleSRT = `
1
00:00:01,000 --> 00:00:04,000
你好，欢迎来到LinguaPlay。

2
00:00:05,000 --> 00:00:08,000
我们一起学习中文。
`;

async function run() {
  console.log("\\n=== RUNNING REPLAY ENGINE ===");

  const startTime = 1700000000000;
  
  const events: ReplayEvent[] = [
    { type: 'SUBTITLE_TRANSITION', timestamp: startTime, subtitleId: 1 },
    { type: 'TOKEN_CLICK', timestamp: startTime + 1000, token: '你好' },
    { type: 'TOKEN_SAVE', timestamp: startTime + 2000, token: '你好' },
    { type: 'SUBTITLE_TRANSITION', timestamp: startTime + 5000, subtitleId: 2 },
    { type: 'TOKEN_CLICK', timestamp: startTime + 6000, token: '学习' }
  ];

  // Run 1
  console.log("Executing Run 1...");
  const output1 = await replayEngine.replay(events, sampleSRT);

  // Run 2
  console.log("Executing Run 2...");
  const output2 = await replayEngine.replay(events, sampleSRT);

  if (output1 === output2) {
    console.log("\\n[SUCCESS] Replay Engine produced identical final states.");
    console.log("\\nFinal State Snapshot:");
    console.log(output1);
  } else {
    console.error("\\n[REPLAY FAILURE] Final states diverged.");
    console.error("\\nRun 1 Output:\\n", output1);
    console.error("\\nRun 2 Output:\\n", output2);
    process.exit(1);
  }
}

run();
