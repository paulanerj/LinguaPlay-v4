/**
 * PURPOSE: Real-time subtitle synchronization with video playback.
 * WHY THIS EXISTS: Ensures the correct subtitle row is displayed at all times.
 * FROZEN: syncSubtitles logic.
 * CONTRACT:
 *   - Input: Current video time, subtitle list.
 *   - Output: Active subtitle ID or null.
 * SIDE EFFECTS: Updates stateManager.
 */

import { stateManager } from './state.ts';

export function syncSubtitles(currentTime: number) {
  const { subtitles, activeSubtitleId } = stateManager.getState();
  
  const active = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
  const newId = active ? active.id : null;

  if (newId !== activeSubtitleId) {
    stateManager.setState({ activeSubtitleId: newId });
  }
}
