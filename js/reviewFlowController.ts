import { ReviewEntryState, ReviewProgressState, ControlHistorySnapshot } from './controlTypes.ts';
import { ReviewQueueEntry } from './orchestrationTypes.ts';

export const reviewFlowController = {
  deriveEntryState(
    currentEntryState: ReviewEntryState,
    reviewQueue: ReviewQueueEntry[],
    reviewPressure: number,
    history: ControlHistorySnapshot,
    now: number
  ): ReviewEntryState {
    const REVIEW_ENTRY_THRESHOLD = 4.0;
    const PRESSURE_INCREASE_REQUIRED = 1.5;

    if (currentEntryState === 'ACCEPTED' || currentEntryState === 'SURFACED') {
      return currentEntryState;
    }

    if (reviewQueue.length === 0) {
      return 'NOT_AVAILABLE';
    }

    const hasDueTokens = reviewQueue.some(q => q.dueTokensCount > 0);

    if (reviewPressure < REVIEW_ENTRY_THRESHOLD && !hasDueTokens) {
      return 'NOT_AVAILABLE';
    }

    if (currentEntryState === 'DECLINED') {
      const pressureIncreased = history.lastDeclinedReviewPressure !== null && 
        (reviewPressure >= history.lastDeclinedReviewPressure + PRESSURE_INCREASE_REQUIRED);
      
      if (!pressureIncreased && !hasDueTokens) {
        return 'DECLINED';
      }
    }

    return 'AVAILABLE';
  },

  deriveProgressState(
    currentProgressState: ReviewProgressState,
    currentEntryState: ReviewEntryState,
    reviewQueue: ReviewQueueEntry[],
    activeSubtitleId: string | number | null,
    proposedReviewSubtitleId: string | number | null
  ): ReviewProgressState {
    if (currentEntryState !== 'ACCEPTED') {
      return 'IDLE';
    }

    if (reviewQueue.length === 0) {
      return 'QUEUE_COMPLETE';
    }

    if (currentProgressState === 'IDLE' || currentProgressState === 'QUEUE_COMPLETE') {
      return 'ROW_PROPOSED';
    }

    if (currentProgressState === 'ROW_PROPOSED') {
      if (activeSubtitleId !== null && activeSubtitleId === proposedReviewSubtitleId) {
        return 'ROW_ACTIVE';
      }
      return 'ROW_PROPOSED';
    }

    if (currentProgressState === 'ROW_ACTIVE') {
      // Resolution is handled externally by explicit action, so we just return current state
      // unless it was externally marked RESOLVED
      return 'ROW_ACTIVE';
    }

    if (currentProgressState === 'ROW_RESOLVED') {
      // If there are more items, we propose the next one. Otherwise complete.
      return reviewQueue.length > 0 ? 'ROW_PROPOSED' : 'QUEUE_COMPLETE';
    }

    return currentProgressState;
  },

  proposeNextRow(
    reviewQueue: ReviewQueueEntry[],
    history: ControlHistorySnapshot
  ): string | number | null {
    if (reviewQueue.length === 0) return null;

    // Propose top row, avoiding immediate re-proposal if possible
    const topRow = reviewQueue[0];
    if (topRow.subtitleId === history.lastProposedReviewSubtitleId && reviewQueue.length > 1) {
      return reviewQueue[1].subtitleId;
    }
    return topRow.subtitleId;
  }
};
