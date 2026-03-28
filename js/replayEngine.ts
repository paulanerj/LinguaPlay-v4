import { timeAuthority } from './timeAuthority.ts';
import { learningMemory } from './learningMemory.ts';
import { stateManager } from './state.ts';
import { parseSRT } from './subtitleParser.ts';
import { attentionEngine } from './attentionEngine.ts';
import { cognitiveSelectors } from './cognitiveSelectors.ts';
import { cognitiveOrchestrator } from './cognitiveOrchestrator.ts';
import { guidedLearningController } from './guidedLearningController.ts';

export type ReplayEvent = 
  | { type: 'SUBTITLE_TRANSITION', timestamp: number, subtitleId: string | number }
  | { type: 'TOKEN_CLICK', timestamp: number, token: string }
  | { type: 'TOKEN_SAVE', timestamp: number, token: string };

export class ReplayEngine {
  private events: ReplayEvent[] = [];
  private isRecording: boolean = false;

  startRecording() {
    this.events = [];
    this.isRecording = true;
  }

  stopRecording() {
    this.isRecording = false;
  }

  recordEvent(event: ReplayEvent) {
    if (this.isRecording) {
      this.events.push(event);
    }
  }

  getEvents(): ReplayEvent[] {
    return [...this.events];
  }

  async replay(events: ReplayEvent[], initialSubtitles: string): Promise<string> {
    // 1. Reset State
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

    // 2. Parse Subtitles
    const subs = parseSRT(initialSubtitles);
    stateManager.setState({ subtitles: subs });

    // 3. Process Events
    for (const event of events) {
      timeAuthority.setNowForReplay(event.timestamp);

      if (event.type === 'SUBTITLE_TRANSITION') {
        stateManager.setState({ activeSubtitleId: event.subtitleId });
        
        const activeSub = subs.find(s => s.id === event.subtitleId);
        if (activeSub && activeSub.tokens) {
          // Simulate passive encounter
          activeSub.tokens.forEach(token => {
            learningMemory.recordEncounter(token, event.timestamp);
          });
        }
      } else if (event.type === 'TOKEN_CLICK') {
        learningMemory.recordReview(event.token, event.timestamp);
        attentionEngine.markTokenReviewed(event.token);
        stateManager.setState({ selectedToken: event.token });
      } else if (event.type === 'TOKEN_SAVE') {
        learningMemory.recordSave(event.token, event.timestamp);
        const state = stateManager.getState();
        const newSaved = new Set(state.savedWords);
        newSaved.add(event.token);
        stateManager.setState({ savedWords: newSaved });
      }

      // Run pipeline after each event to update state
      const state = stateManager.getState();
      const activeSub = subs.find(s => s.id === state.activeSubtitleId);
      const tokens = activeSub?.tokens || [];
      
      const baselineTarget = attentionEngine.getNextTargetToken(tokens, state.savedWords);
      const advice = cognitiveSelectors.getAttentionAdvice(tokens, baselineTarget, event.timestamp);
      const priority = cognitiveSelectors.getSubtitlePriority(state.activeSubtitleId!, tokens, event.timestamp);
      const reviewCandidates = cognitiveSelectors.getReviewCandidates(subs, event.timestamp);
      
      const allProfiles = cognitiveSelectors.getReinforcementCandidates(event.timestamp).map(c => c.profile);
      const reinforcementCandidates = cognitiveSelectors.getReinforcementCandidates(event.timestamp);
      
      const orchestrationDecision = cognitiveOrchestrator.orchestrate(
        state.activeSubtitleId,
        tokens,
        baselineTarget,
        advice.targetToken,
        allProfiles,
        reinforcementCandidates,
        priority,
        reviewCandidates,
        event.timestamp
      );

      const sessionSnapshot = {
        totalTokensEncountered: 0,
        totalTokensReviewed: 0,
        totalTokensSaved: 0,
        averageConfidence: 0,
        highRiskTokens: 0,
        rescueTokens: 0,
        reactivateTokens: 0
      };

      const controlDecision = guidedLearningController.deriveControlDecision(
        state.activeSubtitleId,
        orchestrationDecision,
        sessionSnapshot,
        [],
        'HIDDEN',
        'IDLE',
        state.controlHistory!,
        event.timestamp
      );
      
      stateManager.setState({
        activeCognitiveAttentionAdvice: advice,
        activeSubtitleCognitivePriority: priority,
        topReviewCandidates: reviewCandidates,
        activeOrchestrationDecision: orchestrationDecision,
        activeGuidedControlDecision: controlDecision
      });
    }

    // 4. Return Final State Snapshot
    const finalState = stateManager.getState();
    return JSON.stringify({
      memory: learningMemory.getAllMemory(),
      savedWords: Array.from(finalState.savedWords),
      selectedToken: finalState.selectedToken,
      activeSubtitleId: finalState.activeSubtitleId,
      orchestrationMode: finalState.activeOrchestrationDecision?.mode,
      controlMode: finalState.activeGuidedControlDecision?.controlMode
    }, null, 2);
  }
}

export const replayEngine = new ReplayEngine();
