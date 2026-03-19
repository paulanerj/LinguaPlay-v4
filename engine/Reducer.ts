/**
 * ENGINE PRIMITIVE: Reducer
 * PURPOSE: Pure state transition logic.
 * INVARIANT: No side effects. No DOM.
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
  pedagogicalDemo?: boolean;
}

export class Reducer {
  /**
   * Performs a pure state update.
   * @param currentState The current application state.
   * @param update Partial update to apply.
   * @returns A new state object.
   */
  static reduce(currentState: AppState, update: Partial<AppState>): AppState {
    const nextState = { ...currentState, ...update };
    
    // Ensure structural integrity of collections
    if (update.subtitles) {
      nextState.subtitles = [...update.subtitles];
    }
    if (update.savedWords) {
      nextState.savedWords = new Set(update.savedWords);
    }
    
    return nextState;
  }
}
