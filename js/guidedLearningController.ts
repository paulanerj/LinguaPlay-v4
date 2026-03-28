import { 
  GuidedControlMode, 
  SessionPhase,
  GuidedControlDecision, 
  ReviewEntryState, 
  ReviewProgressState,
  ControlHistorySnapshot
} from './controlTypes.ts';
import { OrchestrationDecision, SessionCognitiveSnapshot, ReviewQueueEntry } from './orchestrationTypes.ts';
import { reviewFlowController } from './reviewFlowController.ts';

export const guidedLearningController = {
  deriveControlDecision(
    activeSubtitleId: string | number | null,
    orchestrationDecision: OrchestrationDecision,
    sessionSnapshot: SessionCognitiveSnapshot,
    reviewQueue: ReviewQueueEntry[],
    currentEntryState: ReviewEntryState,
    currentProgressState: ReviewProgressState,
    history: ControlHistorySnapshot,
    now: number
  ): GuidedControlDecision {
    const rationale: string[] = [];
    let shouldSurfaceReviewEntry = false;
    let shouldSurfaceRescuePrompt = false;
    let shouldSurfaceStudyPrompt = false;
    let shouldRemainInWatchFlow = true;

    // 1. Derive Review Entry State
    const nextEntryState = reviewFlowController.deriveEntryState(
      currentEntryState,
      reviewQueue,
      orchestrationDecision.reviewPressureScore,
      history,
      now
    );

    if (nextEntryState === 'AVAILABLE') {
      shouldSurfaceReviewEntry = true;
      rationale.push('Review entry available: high pressure and candidates exist.');
    } else if (nextEntryState === 'DECLINED') {
      rationale.push('Review entry declined: pressure has not increased materially.');
    }

    // 2. Derive Review Progress State
    let proposedReviewSubtitleId: string | number | null = null;
    let proposedTargetToken: string | null = null;

    if (nextEntryState === 'ACCEPTED') {
      proposedReviewSubtitleId = reviewFlowController.proposeNextRow(reviewQueue, history);
      if (proposedReviewSubtitleId !== null) {
        const proposedEntry = reviewQueue.find(q => q.subtitleId === proposedReviewSubtitleId);
        if (proposedEntry && proposedEntry.targetTokens && proposedEntry.targetTokens.length > 0) {
          proposedTargetToken = proposedEntry.targetTokens[0];
        }
      }
    }

    const nextProgressState = reviewFlowController.deriveProgressState(
      currentProgressState,
      nextEntryState,
      reviewQueue,
      activeSubtitleId,
      proposedReviewSubtitleId
    );

    // 3. Derive Control Mode
    let controlMode: GuidedControlMode = 'OPEN_WATCH';

    if (nextEntryState === 'ACCEPTED' && (nextProgressState === 'ROW_PROPOSED' || nextProgressState === 'ROW_ACTIVE')) {
      shouldRemainInWatchFlow = false;
      if (orchestrationDecision.mode === 'RECOVERY_REVIEW') {
        controlMode = 'RECOVERY_ACTIVE';
        rationale.push('Mode RECOVERY_ACTIVE: Review accepted under recovery pressure.');
      } else {
        controlMode = 'REVIEW_ACTIVE';
        rationale.push('Mode REVIEW_ACTIVE: Review accepted and in progress.');
      }
    } else if (nextEntryState === 'AVAILABLE' || nextEntryState === 'SURFACED') {
      controlMode = 'REVIEW_READY';
      rationale.push('Mode REVIEW_READY: Review entry surfaced to learner.');
    } else {
      // Watch flow modes
      if (orchestrationDecision.mode === 'PASSIVE_WATCH') {
        controlMode = 'OPEN_WATCH';
        rationale.push('Mode OPEN_WATCH: Orchestrator suggests passive watch.');
      } else if (orchestrationDecision.mode === 'GUIDED_WATCH') {
        controlMode = 'GUIDED_WATCH';
        rationale.push('Mode GUIDED_WATCH: Orchestrator suggests guided watch.');
        shouldSurfaceStudyPrompt = true;
      } else if (orchestrationDecision.mode === 'ACTIVE_STUDY') {
        controlMode = 'STUDY_FOCUS';
        rationale.push('Mode STUDY_FOCUS: Orchestrator suggests active study.');
        shouldSurfaceStudyPrompt = true;
      } else if (orchestrationDecision.mode === 'RECOVERY_REVIEW') {
        // If review is not available/accepted but orchestrator wants recovery (e.g. queue empty but pressure high? unlikely, but fallback)
        controlMode = 'STUDY_FOCUS';
        rationale.push('Mode STUDY_FOCUS: Fallback for recovery without active review.');
      }
    }

    // 4. Derive Session Phase
    let sessionPhase: SessionPhase = 'DISCOVERY';

    if (controlMode === 'RECOVERY_ACTIVE') {
      sessionPhase = 'RECOVERY';
    } else if (controlMode === 'REVIEW_ACTIVE' || controlMode === 'REVIEW_READY') {
      sessionPhase = 'REVIEW';
    } else if (controlMode === 'STUDY_FOCUS' || controlMode === 'GUIDED_WATCH') {
      sessionPhase = 'FOCUS';
    } else if (orchestrationDecision.reviewPressureScore < 2 && reviewQueue.length === 0) {
      sessionPhase = 'FLOW';
    } else {
      sessionPhase = 'DISCOVERY';
    }

    // 5. Derive Prompts
    if (orchestrationDecision.focusStrategy === 'SURFACE_RESCUE_PRIORITY') {
      shouldSurfaceRescuePrompt = true;
      rationale.push('Surfacing rescue prompt: Orchestrator focus strategy targets rescue.');
    }

    return {
      controlMode,
      sessionPhase,
      reviewEntryState: nextEntryState === 'AVAILABLE' && shouldSurfaceReviewEntry ? 'SURFACED' : nextEntryState,
      reviewProgressState: nextProgressState,
      proposedReviewSubtitleId,
      proposedTargetToken,
      shouldSurfaceReviewEntry,
      shouldSurfaceRescuePrompt,
      shouldSurfaceStudyPrompt,
      shouldRemainInWatchFlow,
      rationale
    };
  }
};
