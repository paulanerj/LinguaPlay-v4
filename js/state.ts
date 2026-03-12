/**
 * PURPOSE: Centralized application state management.
 * WHY THIS EXISTS: Provides a single source of truth for the learning engine.
 * CONTRACT: 
 *   - State is reactive via simple subscribers.
 *   - Inputs: Partial state updates.
 *   - Outputs: Notifies listeners of changes.
 */

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
  savedWords: Set<string>;
}

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
    this.state = { ...this.state, ...update };
    this.notify();
  }

  getState(): AppState {
    return { ...this.state };
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
