export type CognitiveMode =
  | 'PASSIVE_WATCH'
  | 'GUIDED_WATCH'
  | 'ACTIVE_STUDY'
  | 'REVIEW_QUEUE'
  | 'RECOVERY_REVIEW';

export type CognitiveFocusStrategy =
  | 'FOLLOW_BASELINE'
  | 'FOLLOW_COGNITIVE_TARGET'
  | 'SURFACE_REVIEW_PRIORITY'
  | 'SURFACE_RESCUE_PRIORITY'
  | 'LOW_INTERFERENCE';

export type ReviewFlowState =
  | 'IDLE'
  | 'QUEUE_READY'
  | 'QUEUE_SURFACED'
  | 'ROW_SELECTED'
  | 'ROW_COMPLETED';

export interface ReviewQueueEntry {
  subtitleId: string | number;
  priorityScore: number;
  rescueTokenCount: number;
  reactivateTokenCount: number;
  dueTokensCount: number;
  nextReviewAt: number;
  maxDecayRisk: number;
  targetTokens: string[];
  rationale: string[];
}

export interface OrchestrationDecision {
  mode: CognitiveMode;
  focusStrategy: CognitiveFocusStrategy;
  advisedTarget: string | null;
  topReviewSubtitleId: string | number | null;
  shouldSurfaceReviewQueue: boolean;
  shouldSurfaceRescuePriority: boolean;
  reviewPressureScore: number;
  rationale: string[];
}

export interface SessionCognitiveSnapshot {
  activeSubtitleId: string | number | null;
  activeMode: CognitiveMode;
  rescueTokenCount: number;
  reactivateTokenCount: number;
  introduceTokenCount: number;
  reinforceTokenCount: number;
  ignoredTokenCount: number;
  topAdvisedTarget: string | null;
  reviewQueueLength: number;
  reviewPressureScore: number;
  rationale: string[];
}
