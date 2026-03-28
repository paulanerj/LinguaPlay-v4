import { parseSRT } from './subtitleParser.ts';
import { tokenTrie } from './tokenTrie.ts';
import { segmentationPostProcessor } from './segmentationPostProcessor.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';
import { learningMemory } from './learningMemory.ts';
import { attentionEngine } from './attentionEngine.ts';
import { cognitiveSelectors } from './cognitiveSelectors.ts';
import { cognitiveOrchestrator } from './cognitiveOrchestrator.ts';
import { guidedLearningController } from './guidedLearningController.ts';
import { timeAuthority } from './timeAuthority.ts';
import { stateManager } from './state.ts';

/**
 * Determinism Harness
 * Runs the full pipeline with identical inputs and compares outputs across multiple runs.
 */
export class DeterminismHarness {
  private sampleSRT = `
1
00:00:01,000 --> 00:00:04,000
你好，欢迎来到LinguaPlay。

2
00:00:05,000 --> 00:00:08,000
我们一起学习中文。
`;

  private fixedTime = 1700000000000; // Fixed timestamp for determinism

  async runHarness(runs: number = 3): Promise<boolean> {
    console.log(`\\n=== RUNNING DETERMINISM HARNESS (${runs} RUNS) ===`);
    
    const outputs: string[] = [];

    for (let i = 0; i < runs; i++) {
      outputs.push(await this.executePipeline());
    }

    let isDeterministic = true;
    const referenceOutput = outputs[0];

    for (let i = 1; i < runs; i++) {
      if (outputs[i] !== referenceOutput) {
        console.error(`\\n[DETERMINISM FAILURE] Run ${i + 1} diverged from Run 1.`);
        console.error(`\\nRun 1 Output:\\n${referenceOutput}`);
        console.error(`\\nRun ${i + 1} Output:\\n${outputs[i]}`);
        isDeterministic = false;
      }
    }

    if (isDeterministic) {
      console.log(`\\n[SUCCESS] Pipeline is fully deterministic across ${runs} runs.`);
    }

    return isDeterministic;
  }

  private async executePipeline(): Promise<string> {
    // 1. Reset State & Time
    timeAuthority.setNowForReplay(this.fixedTime);
    learningMemory.clearAllMemory();
    stateManager.setState({
      subtitles: [],
      activeSubtitleId: null,
      selectedToken: null,
      savedWords: new Set(),
      controlHistory: {
        lastDeclinedReviewPressure: null,
        lastDeclinedTimestamp: null,
        consecutiveDowngrades: 0,
        lastProposedReviewSubtitleId: null
      }
    });

    // 2. Parse & Segment
    const subs = parseSRT(this.sampleSRT);
    
    // 3. Simulate some memory state
    learningMemory.recordEncounter('你好', this.fixedTime - 100000);
    learningMemory.recordReview('学习', this.fixedTime - 50000);
    
    // 4. Run Selectors & Orchestration for the first subtitle
    const activeSub = subs[0];
    const tokens = activeSub.tokens || [];
    
    const baselineTarget = attentionEngine.getNextTargetToken(tokens, new Set());
    const advice = cognitiveSelectors.getAttentionAdvice(tokens, baselineTarget, this.fixedTime);
    const priority = cognitiveSelectors.getSubtitlePriority(activeSub.id, tokens, this.fixedTime);
    const reviewCandidates = cognitiveSelectors.getReviewCandidates(subs, this.fixedTime);
    
    const allProfiles = cognitiveSelectors.getReinforcementCandidates(this.fixedTime).map(c => c.profile);
    const reinforcementCandidates = cognitiveSelectors.getReinforcementCandidates(this.fixedTime);
    
    const orchestrationDecision = cognitiveOrchestrator.orchestrate(
      activeSub.id,
      tokens,
      baselineTarget,
      advice.advisedTarget,
      allProfiles,
      reinforcementCandidates,
      priority,
      reviewCandidates,
      this.fixedTime
    );

    const sessionSnapshot = {
      activeSubtitleId: activeSub.id,
      activeMode: 'PASSIVE_WATCH' as const,
      rescueTokenCount: 0,
      reactivateTokenCount: 0,
      introduceTokenCount: 0,
      reinforceTokenCount: 0,
      ignoredTokenCount: 0,
      topAdvisedTarget: null,
      reviewQueueLength: 0,
      reviewPressureScore: 0,
      rationale: []
    };

    const reviewQueue: any[] = [];

    const controlDecision = guidedLearningController.deriveControlDecision(
      activeSub.id,
      orchestrationDecision,
      sessionSnapshot,
      reviewQueue,
      'NOT_AVAILABLE',
      'IDLE',
      {
        lastDeclinedReviewPressure: null,
        lastDeclinedTimestamp: null,
        consecutiveDowngrades: 0,
        lastProposedReviewSubtitleId: null
      },
      this.fixedTime
    );

    // 5. Serialize the critical outputs for comparison
    const outputState = {
      parsedSubtitles: subs,
      baselineTarget,
      advice,
      priority,
      reviewCandidates,
      orchestrationDecision,
      controlDecision
    };

    return JSON.stringify(outputState, null, 2);
  }
}

export const determinismHarness = new DeterminismHarness();
