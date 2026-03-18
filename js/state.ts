/**
 * PURPOSE: Centralized application state management.
 * WHY THIS EXISTS: Provides a single source of truth for the learning engine.
 * CONTRACT: 
 *   - State is reactive via simple subscribers.
 *   - Inputs: Partial state updates.
 *   - Outputs: Notifies listeners of changes.
 */

import { Reducer, AppState, Subtitle } from '../engine/Reducer.ts';

export type { AppState, Subtitle };

class StateManager {
  private state: AppState = {
    videoLoaded: false,
    currentTime: 0,
    subtitles: [],
    activeSubtitleId: null,
    selectedToken: null,
    lexiconLoaded: false,
    savedWords: new Set()
  };

  private listeners: Set<(state: AppState) => void> = new Set();

  /**
   * SAFE TO CHANGE: Adding new state properties.
   * RISKY TO CHANGE: Modifying the notification loop.
   */
  setState(update: Partial<AppState>) {
    this.state = Reducer.reduce(this.state, update);
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
