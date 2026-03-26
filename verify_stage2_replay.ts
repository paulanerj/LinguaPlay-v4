import { stateManager } from './js/state.ts';
import { learningMemory } from './js/learningMemory.ts';
import { cognitiveSelectors } from './js/cognitiveSelectors.ts';
import { tokenTrie } from './js/tokenTrie.ts';
import { segmentationPostProcessor } from './js/segmentationPostProcessor.ts';
import { parseSRT } from './js/subtitleParser.ts';

// Mock localStorage
const mockStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
  }
};

const srtText = `
1
00:00:01,000 --> 00:00:04,000
你好，欢迎来到LinguaPlay。

2
00:00:05,000 --> 00:00:08,000
我们一起学习中文。
`;

async function runReplayTest() {
  console.log("--- PART E: COGNITIVE REPLAY REPRODUCTION TEST ---");
  
  const subtitles = parseSRT(srtText);
  const subsWithTokens = subtitles.map(sub => {
    const rawTokens = tokenTrie.segment(sub.text);
    const refinedTokens = segmentationPostProcessor.process(rawTokens);
    return { ...sub, tokens: refinedTokens };
  });

  const fixedNow = 1711470000000; // Fixed timestamp
  
  // Create a fixed memory snapshot
  learningMemory.recordReview('欢迎', fixedNow - 100000);
  learningMemory.recordReview('中文', fixedNow - 200000);
  learningMemory.recordSave('你好', fixedNow - 500000);

  const runCycle = (cycleNum: number) => {
    console.log(`\nCycle ${cycleNum}:`);
    const tokens = subsWithTokens[0].tokens!;
    const baselineTarget = '你好'; // Fixed baseline target
    
    const advice = cognitiveSelectors.getAttentionAdvice(tokens, baselineTarget, fixedNow);
    const candidates = cognitiveSelectors.getReinforcementCandidates(fixedNow);
    const reviewCandidates = cognitiveSelectors.getReviewCandidates(subsWithTokens, fixedNow);

    console.log(`  Attention Advice: Target=${advice.advisedTarget}, Override=${advice.shouldOverride}, Reason=${advice.reasonCode}`);
    console.log(`  Top 3 Reinforcement Candidates: ${candidates.slice(0, 3).map(c => c.token + '(' + c.reinforcementClass + ')').join(', ')}`);
    console.log(`  Top Review Candidate Subtitle ID: ${reviewCandidates.length > 0 ? reviewCandidates[0].subtitleId : 'None'}`);
    
    return { advice, candidates, reviewCandidates };
  };

  const out1 = runCycle(1);
  const out2 = runCycle(2);
  const out3 = runCycle(3);

  const identical = JSON.stringify(out1) === JSON.stringify(out2) && JSON.stringify(out2) === JSON.stringify(out3);
  console.log(`\nOutputs identical across 3 cycles: ${identical}`);
}

runReplayTest().catch(console.error);
