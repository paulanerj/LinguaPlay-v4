import { stateManager } from './state.ts';
import { timeAuthority } from './timeAuthority.ts';
import { learningMemory } from './learningMemory.ts';
import { attentionEngine } from './attentionEngine.ts';
import { cognitiveSelectors } from './cognitiveSelectors.ts';
import { cognitiveInference } from './cognitiveInference.ts';
import { reinforcementPlanner } from './reinforcementPlanner.ts';
import { cognitiveOrchestrator } from './cognitiveOrchestrator.ts';
import { buildReviewQueue } from './reviewQueue.ts';
import { guidedLearningController } from './guidedLearningController.ts';
import { sessionScheduler } from './sessionScheduler.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';

export type EngineEvent = 
  | { type: 'SUBTITLE_TRANSITION', subtitleId: number | null, tokens: string[] }
  | { type: 'TOKEN_CLICK', token: string }
  | { type: 'TOKEN_SAVE', token: string }
  | { type: 'REVIEW_ACCEPT' }
  | { type: 'REVIEW_DECLINE' }
  | { type: 'REVIEW_RESOLVE' }
  | { type: 'REVIEW_GOT_IT', token: string }
  | { type: 'REVIEW_STILL_LEARNING', token: string }
  | { type: 'REVIEW_SKIP' };

export class EngineLoop {
  processEvent(event: EngineEvent) {
    const now = timeAuthority.getNow();
    const state = stateManager.getState();

    // 1. Handle Event & Mutate Memory/State
    switch (event.type) {
      case 'SUBTITLE_TRANSITION':
        stateManager.setState({ activeSubtitleId: event.subtitleId });
        if (event.subtitleId !== null && event.tokens.length > 0) {
          let newTokensSeen = 0;
          event.tokens.forEach(token => {
            const lookup = dictionaryEngine.getEntry(token);
            if (lookup.truthStatus !== 'NON_LEXICAL') {
              const record = learningMemory.getRecord(token);
              if (!record || record.encounterCount === 0) {
                newTokensSeen++;
              }
              learningMemory.recordEncounter(token, now);
            }
          });
          
          if (newTokensSeen > 0) {
            const metrics = state.sessionMetrics || { tokensSeen: 0, tokensReviewed: 0, rescueTokensResolved: 0, sessionStartTime: now };
            stateManager.setState({
              sessionMetrics: {
                ...metrics,
                tokensSeen: metrics.tokensSeen + newTokensSeen
              }
            });
          }
        }
        break;
      case 'TOKEN_CLICK':
        learningMemory.recordReview(event.token, now);
        attentionEngine.markTokenReviewed(event.token);
        
        const profile = cognitiveSelectors.getProfile(event.token, now);
        const candidates = cognitiveSelectors.getReinforcementCandidates(now);
        const candidate = candidates.find(c => c.token === event.token);
        
        const metrics = state.sessionMetrics || { tokensSeen: 0, tokensReviewed: 0, rescueTokensResolved: 0, sessionStartTime: now };
        let rescueResolved = 0;
        if (candidate && candidate.reinforcementClass === 'RESCUE') {
          rescueResolved = 1;
        }

        stateManager.setState({ 
          selectedToken: event.token,
          selectedTokenLearningProfile: profile,
          selectedTokenReinforcementClass: candidate ? candidate.reinforcementClass : null,
          sessionMetrics: {
            ...metrics,
            tokensReviewed: metrics.tokensReviewed + 1,
            rescueTokensResolved: metrics.rescueTokensResolved + rescueResolved
          }
        });
        break;
      case 'TOKEN_SAVE':
        learningMemory.recordSave(event.token, now);
        const newSaved = new Set(state.savedWords);
        if (newSaved.has(event.token)) {
          newSaved.delete(event.token);
        } else {
          newSaved.add(event.token);
        }
        stateManager.setState({ savedWords: newSaved });
        break;
      case 'REVIEW_ACCEPT':
        if (state.reviewEntryState === 'SURFACED') {
          stateManager.setState({ reviewEntryState: 'ACCEPTED' });
        }
        break;
      case 'REVIEW_DECLINE':
        if (state.reviewEntryState === 'SURFACED') {
          const history = state.controlHistory || {
            lastDeclinedReviewPressure: null,
            lastDeclinedTimestamp: null,
            consecutiveDowngrades: 0,
            lastProposedReviewSubtitleId: null
          };
          stateManager.setState({ 
            reviewEntryState: 'DECLINED',
            controlHistory: {
              ...history,
              lastDeclinedReviewPressure: state.activeOrchestrationDecision?.reviewPressureScore || null,
              lastDeclinedTimestamp: now
            }
          });
        }
        break;
      case 'REVIEW_RESOLVE':
        if (state.reviewProgressState === 'ROW_ACTIVE') {
          stateManager.setState({ reviewProgressState: 'ROW_RESOLVED' });
        }
        break;
      case 'REVIEW_GOT_IT': {
        learningMemory.recordReview(event.token, now);
        if (state.reviewProgressState === 'ROW_ACTIVE') {
          const candidate = cognitiveSelectors.getReinforcementCandidates(now).find(c => c.token === event.token);
          const rescueResolved = (candidate && candidate.reinforcementClass === 'RESCUE') ? 1 : 0;
          const metrics = state.sessionMetrics || { tokensSeen: 0, tokensReviewed: 0, rescueTokensResolved: 0, sessionStartTime: now };
          stateManager.setState({ 
            reviewProgressState: 'ROW_RESOLVED',
            sessionMetrics: {
              ...metrics,
              tokensReviewed: metrics.tokensReviewed + 1,
              rescueTokensResolved: metrics.rescueTokensResolved + rescueResolved
            }
          });
        }
        break;
      }
      case 'REVIEW_STILL_LEARNING': {
        learningMemory.recordEncounter(event.token, now);
        if (state.reviewProgressState === 'ROW_ACTIVE') {
          const candidate = cognitiveSelectors.getReinforcementCandidates(now).find(c => c.token === event.token);
          const rescueResolved = (candidate && candidate.reinforcementClass === 'RESCUE') ? 1 : 0;
          const metrics = state.sessionMetrics || { tokensSeen: 0, tokensReviewed: 0, rescueTokensResolved: 0, sessionStartTime: now };
          stateManager.setState({ 
            reviewProgressState: 'ROW_RESOLVED',
            sessionMetrics: {
              ...metrics,
              tokensReviewed: metrics.tokensReviewed + 1,
              rescueTokensResolved: metrics.rescueTokensResolved + rescueResolved
            }
          });
        }
        break;
      }
      case 'REVIEW_SKIP':
        if (state.reviewProgressState === 'ROW_ACTIVE') {
          stateManager.setState({ reviewProgressState: 'ROW_RESOLVED' });
        }
        break;
    }

    // 2. Run Pipeline (if we have an active subtitle)
    this.runPipeline(now);
  }

  runPipeline(now: number = timeAuthority.getNow()) {
    const state = stateManager.getState();
    
    if (state.activeSubtitleId === null) {
      stateManager.setState({ 
        activeCognitiveAttentionAdvice: null,
        activeSubtitleCognitivePriority: null
      });
      return;
    }

    const activeSub = state.subtitles.find(s => s.id === state.activeSubtitleId);
    const tokens = activeSub?.tokens || [];

    const baselineTarget = attentionEngine.getNextTargetToken(tokens, state.savedWords);
    
    const advice = cognitiveSelectors.getAttentionAdvice(tokens, baselineTarget, now);
    const priority = cognitiveSelectors.getSubtitlePriority(state.activeSubtitleId, tokens, now);
    const reviewCandidates = cognitiveSelectors.getReviewCandidates(state.subtitles, now);

    const allProfiles = cognitiveInference.deriveAllProfiles(now);
    const reinforcementCandidates = reinforcementPlanner.planReinforcement(now, allProfiles);
    
    sessionScheduler.recordSubtitleTransition(
      priority.priorityScore,
      priority.rescueCount,
      null
    );

    const orchestrationDecision = cognitiveOrchestrator.orchestrate(
      state.activeSubtitleId,
      tokens,
      baselineTarget,
      advice.shouldOverride ? advice.advisedTarget : null,
      allProfiles,
      reinforcementCandidates,
      priority,
      reviewCandidates,
      now
    );

    const reviewQueue = buildReviewQueue(reviewCandidates, reinforcementCandidates, sessionScheduler.getState().recentlySurfacedSubtitleId, now);
    const snapshot = cognitiveOrchestrator.generateSnapshot(state.activeSubtitleId, orchestrationDecision, reinforcementCandidates, reviewQueue);

    const currentEntryState = state.reviewEntryState || 'NOT_AVAILABLE';
    const currentProgressState = state.reviewProgressState || 'IDLE';
    const history = state.controlHistory || {
      lastDeclinedReviewPressure: null,
      lastDeclinedTimestamp: null,
      consecutiveDowngrades: 0,
      lastProposedReviewSubtitleId: null
    };

    const guidedControlDecision = guidedLearningController.deriveControlDecision(
      state.activeSubtitleId,
      orchestrationDecision,
      snapshot,
      reviewQueue,
      currentEntryState,
      currentProgressState,
      history,
      now
    );

    const lastAttentionTarget = orchestrationDecision.advisedTarget || baselineTarget;

    stateManager.setState({
      activeCognitiveAttentionAdvice: advice,
      activeSubtitleCognitivePriority: priority,
      topReviewCandidates: reviewCandidates,
      activeCognitiveMode: orchestrationDecision.mode,
      activeFocusStrategy: orchestrationDecision.focusStrategy,
      activeOrchestrationDecision: orchestrationDecision,
      sessionCognitiveSnapshot: snapshot,
      reviewQueuePreview: reviewQueue,
      activeGuidedControlDecision: guidedControlDecision,
      activeGuidedControlMode: guidedControlDecision.controlMode,
      activeSessionPhase: guidedControlDecision.sessionPhase,
      reviewEntryState: guidedControlDecision.reviewEntryState,
      reviewProgressState: guidedControlDecision.reviewProgressState,
      proposedReviewSubtitleId: guidedControlDecision.proposedReviewSubtitleId,
      lastAttentionTarget
    });
  }
}

export const engineLoop = new EngineLoop();
