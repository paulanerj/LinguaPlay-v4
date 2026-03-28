export type GuidedControlMode =
  | 'OPEN_WATCH'
  | 'GUIDED_WATCH'
  | 'STUDY_FOCUS'
  | 'REVIEW_READY'
  | 'REVIEW_ACTIVE'
  | 'RECOVERY_ACTIVE';

export type SessionPhase =
  | 'DISCOVERY'
  | 'FOCUS'
  | 'REVIEW'
  | 'RECOVERY'
  | 'FLOW';

export type ReviewEntryState =
  | 'NOT_AVAILABLE'
  | 'AVAILABLE'
  | 'SURFACED'
  | 'ACCEPTED'
  | 'DECLINED';

export type ReviewProgressState =
  | 'IDLE'
  | 'ROW_PROPOSED'
  | 'ROW_ACTIVE'
  | 'ROW_RESOLVED'
  | 'QUEUE_COMPLETE';

export interface ControlActionAvailability {
  canEnterReview: boolean;
  canAdvanceReview: boolean;
  canExitReview: boolean;
  shouldSurfaceRescuePrompt: boolean;
  shouldSurfaceStudyPrompt: boolean;
}

export interface GuidedControlDecision {
  controlMode: GuidedControlMode;
  sessionPhase: SessionPhase;
  reviewEntryState: ReviewEntryState;
  reviewProgressState: ReviewProgressState;
  proposedReviewSubtitleId: string | number | null;
  proposedTargetToken: string | null;
  shouldSurfaceReviewEntry: boolean;
  shouldSurfaceRescuePrompt: boolean;
  shouldSurfaceStudyPrompt: boolean;
  shouldRemainInWatchFlow: boolean;
  rationale: string[];
}

export interface ControlHistorySnapshot {
  lastDeclinedReviewPressure: number | null;
  lastDeclinedTimestamp: number | null;
  consecutiveDowngrades: number;
  lastProposedReviewSubtitleId: string | number | null;
}
