/**
 * PURPOSE: Centralized application state management.
 * WHY THIS EXISTS: Provides a single source of truth for the learning engine.
 * CONTRACT: 
 *   - State is reactive via simple subscribers.
 *   - Inputs: Partial state updates.
 *   - Outputs: Notifies listeners of changes.
 */

import { TokenLearningProfile, ReinforcementCandidate, ReinforcementClass } from './cognitiveTypes.ts';
import { CognitiveAttentionAdvice } from './cognitiveAttention.ts';
import { SubtitleCognitivePriority } from './subtitleCognitivePriority.ts';
import { ReviewCandidate } from './reviewPlanner.ts';
import { CognitiveMode, CognitiveFocusStrategy, OrchestrationDecision, SessionCognitiveSnapshot, ReviewFlowState, ReviewQueueEntry } from './orchestrationTypes.ts';

export enum LexiconMode {
  FULL = 'FULL',
  FALLBACK = 'FALLBACK'
}

export enum EncounterPolicy {
  PER_ACTIVATION = 'PER_ACTIVATION',
  PER_SESSION = 'PER_SESSION',
  PER_TIME_WINDOW = 'PER_TIME_WINDOW'
}

export interface Subtitle {
  id: number;
  start: number;
  end: number;
  text: string;
  tokens?: string[];
}

export interface AppState {
  videoLoaded: boolean;
  currentTime: number;
  subtitles: Subtitle[];
  activeSubtitleId: number | null;
  selectedToken: string | null;
  lexiconLoaded: boolean;
  lexiconMode: LexiconMode | null;
  debugEnabled: boolean;
  encounterPolicy: EncounterPolicy;
  savedWords: Set<string>;
  pedagogicalDemo?: boolean;
  selectedTokenLearningProfile?: TokenLearningProfile | null;
  topReinforcementCandidates?: ReinforcementCandidate[];
  cognitiveDebugEnabled?: boolean;
  activeCognitiveAttentionAdvice?: CognitiveAttentionAdvice | null;
  activeSubtitleCognitivePriority?: SubtitleCognitivePriority | null;
  topReviewCandidates?: ReviewCandidate[];
  selectedTokenReinforcementClass?: ReinforcementClass | null;

  // Stage-3 Orchestration Fields
  activeCognitiveMode?: CognitiveMode;
  activeFocusStrategy?: CognitiveFocusStrategy;
  activeOrchestrationDecision?: OrchestrationDecision | null;
  sessionCognitiveSnapshot?: SessionCognitiveSnapshot | null;
  reviewFlowState?: ReviewFlowState;
  reviewQueuePreview?: ReviewQueueEntry[];
}

class StateManager {
  private state: AppState = {
    videoLoaded: false,
    currentTime: 0,
    subtitles: [],
    activeSubtitleId: null,
    selectedToken: null,
    lexiconLoaded: false,
    lexiconMode: null,
    debugEnabled: false,
    encounterPolicy: EncounterPolicy.PER_ACTIVATION,
    savedWords: new Set(),
    pedagogicalDemo: true,
    cognitiveDebugEnabled: false
  };

  private listeners: Set<(state: AppState) => void> = new Set();

  /**
   * Performs a pure state update.
   */
  private static reduce(currentState: AppState, update: Partial<AppState>): AppState {
    const nextState = { ...currentState, ...update };
    
    if (update.subtitles) {
      nextState.subtitles = [...update.subtitles];
    }
    if (update.savedWords) {
      nextState.savedWords = new Set(update.savedWords);
    }
    
    return nextState;
  }

  setState(update: Partial<AppState>) {
    this.state = StateManager.reduce(this.state, update);
    this.notify();
  }

  getState(): AppState {
    return {
      ...this.state,
      subtitles: [...this.state.subtitles],
      savedWords: new Set(this.state.savedWords)
    };
  }

  subscribe(callback: (state: AppState) => void) {
    this.listeners.add(callback);
    callback(this.state);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.state));
  }
}

export const stateManager = new StateManager();
