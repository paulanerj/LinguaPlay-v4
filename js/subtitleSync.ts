/**
 * PURPOSE: Real-time subtitle synchronization with video playback.
 * WHY THIS EXISTS: Ensures the correct subtitle row is displayed at all times.
 * FROZEN: syncSubtitles logic.
 * CONTRACT:
 *   - Input: Current video time, subtitle list.
 *   - Output: Active subtitle ID or null.
 * SIDE EFFECTS: Updates stateManager.
 * 
 * SYNC INVARIANTS:
 *   - Activation Gating: Subtitles only activate when currentTime is within [start, end].
 *   - Duplicate Prevention: State updates only occur when activeSubtitleId changes.
 *   - Skip Detection: Observes jumps in video time that bypass short subtitle windows.
 *   - Video Authority: video.currentTime is the only source used for activation.
 */

import { stateManager } from './state.ts';

let lastTime = 0;

export function syncSubtitles(currentTime: number) {
  const { subtitles, activeSubtitleId } = stateManager.getState();
  
  // Task 2: Detect skipped subtitles
  if (currentTime > lastTime) {
    const skipped = subtitles.filter(s => 
      s.start > lastTime && 
      s.end < currentTime && 
      s.id !== activeSubtitleId
    );
    
    skipped.forEach(s => {
      console.warn(`[SKIPPED SUBTITLE] id=${s.id} duration=${(s.end - s.start) * 1000}ms delta=${(currentTime - lastTime) * 1000}ms`);
    });
  }
  lastTime = currentTime;

  const active = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
  const newId = active ? active.id : null;

  if (newId !== activeSubtitleId) {
    stateManager.setState({ activeSubtitleId: newId });
  }
}
