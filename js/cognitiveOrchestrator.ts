import { 
  CognitiveMode, 
  CognitiveFocusStrategy, 
  OrchestrationDecision, 
  SessionCognitiveSnapshot, 
  ReviewQueueEntry 
} from './orchestrationTypes.ts';
import { TokenLearningProfile, ReinforcementCandidate } from './cognitiveTypes.ts';
import { SubtitleCognitivePriority } from './subtitleCognitivePriority.ts';
import { ReviewCandidate } from './reviewPlanner.ts';
import { sessionScheduler } from './sessionScheduler.ts';
import { buildReviewQueue } from './reviewQueue.ts';

export class CognitiveOrchestrator {
  public orchestrate(
    activeSubtitleId: string | number | null,
    activeSubtitleTokens: string[],
    baselineTarget: string | null,
    advisedTarget: string | null,
    allProfiles: TokenLearningProfile[],
    reinforcementCandidates: ReinforcementCandidate[],
    subtitlePriority: SubtitleCognitivePriority | null,
    reviewCandidates: ReviewCandidate[],
    now: number
  ): OrchestrationDecision {
    const rationale: string[] = [];
    
    // 1. Compute Review Pressure Score
    let totalRescueTokensInQueue = 0;
    let totalReactivateTokensInQueue = 0;
    let totalLostTokensVisible = 0;
    let highPriorityReviewRows = 0;

    for (const token of activeSubtitleTokens) {
      const profile = allProfiles.find(p => p.token === token);
      if (profile && profile.inferredState === 'LOST') {
        totalLostTokensVisible++;
      }
    }

    for (const rc of reviewCandidates) {
      if (rc.priorityScore >= 5) highPriorityReviewRows++;
      for (const token of rc.topTokens) {
        const candidate = reinforcementCandidates.find(c => c.token === token);
        if (candidate) {
          if (candidate.reinforcementClass === 'RESCUE') totalRescueTokensInQueue++;
          if (candidate.reinforcementClass === 'REACTIVATE') totalReactivateTokensInQueue++;
        }
      }
    }

    const reviewPressureScore = 
      (totalRescueTokensInQueue * 3) +
      (totalReactivateTokensInQueue * 2) +
      (totalLostTokensVisible * 2) +
      (highPriorityReviewRows * 1.5);

    rationale.push(`Review Pressure Score: ${reviewPressureScore.toFixed(2)}`);

    // 2. Build Deterministic Review Queue
    const schedulerState = sessionScheduler.getState();
    const reviewQueue = buildReviewQueue(reviewCandidates, reinforcementCandidates, schedulerState.recentlySurfacedSubtitleId, now);
    
    // 3. Determine Proposed Mode
    let proposedMode: CognitiveMode = 'PASSIVE_WATCH';
    let rescuePressureSpike = false;
    
    const activePriorityScore = subtitlePriority ? subtitlePriority.priorityScore : 0;
    const activeRescueTokens = subtitlePriority ? subtitlePriority.rescueCount : 0;
    const activeIntroduceTokens = subtitlePriority ? subtitlePriority.introduceCount : 0;
    const activeReinforceTokens = subtitlePriority ? subtitlePriority.reinforceCount : 0;

    if (reviewPressureScore >= 15 || reviewQueue.filter(q => q.rescueTokenCount > 1).length >= 2 || totalLostTokensVisible > 2) {
      proposedMode = 'RECOVERY_REVIEW';
      rescuePressureSpike = true;
      rationale.push('Proposed RECOVERY_REVIEW: High review pressure or multiple rescue rows.');
    } else if (activeRescueTokens >= 1 || activePriorityScore >= 5) {
      proposedMode = 'ACTIVE_STUDY';
      rescuePressureSpike = true;
      rationale.push('Proposed ACTIVE_STUDY: Active subtitle contains rescue tokens or high priority.');
    } else if (activePriorityScore < 3 && reviewQueue.length > 0 && reviewQueue[0].priorityScore > activePriorityScore + 2) {
      proposedMode = 'REVIEW_QUEUE';
      rationale.push('Proposed REVIEW_QUEUE: Active subtitle urgency is low, queue contains stronger candidates.');
    } else if (activeIntroduceTokens > 0 || activeReinforceTokens > 0) {
      proposedMode = 'GUIDED_WATCH';
      rationale.push('Proposed GUIDED_WATCH: Active subtitle has useful introduce/reinforce targets.');
    } else {
      proposedMode = 'PASSIVE_WATCH';
      rationale.push('Proposed PASSIVE_WATCH: Active subtitle priority < 3, no rescue tokens, low pressure.');
    }

    // Apply Quiet-Content Rule
    if (schedulerState.consecutiveLowValueSubtitles >= 3 && proposedMode !== 'RECOVERY_REVIEW') {
      proposedMode = 'PASSIVE_WATCH';
      rationale.push('Quiet-content rule applied: 3 consecutive low-value subtitles.');
    }

    // Apply Rescue-Escalation Rule
    if (schedulerState.consecutiveHighPriorityRescueSubtitles >= 2 && proposedMode !== 'RECOVERY_REVIEW') {
      proposedMode = 'ACTIVE_STUDY';
      rescuePressureSpike = true;
      rationale.push('Rescue-escalation rule applied: 2 consecutive high-priority rescue subtitles.');
    }

    // 4. Determine Final Mode via Scheduler (Anti-Thrashing)
    const finalMode = sessionScheduler.determineNextMode(proposedMode, rescuePressureSpike);
    if (finalMode !== proposedMode) {
      rationale.push(`Anti-thrashing rule applied: Persisting ${finalMode} instead of downgrading to ${proposedMode}.`);
    }

    // 5. Determine Focus Strategy
    let focusStrategy: CognitiveFocusStrategy = 'FOLLOW_BASELINE';
    
    if (finalMode === 'PASSIVE_WATCH' && schedulerState.consecutiveLowValueSubtitles >= 3) {
      focusStrategy = 'LOW_INTERFERENCE';
      rationale.push('Strategy LOW_INTERFERENCE: System staying quiet on low-value content.');
    } else if (finalMode === 'RECOVERY_REVIEW' || (activeRescueTokens > 0 && reviewPressureScore > 10)) {
      focusStrategy = 'SURFACE_RESCUE_PRIORITY';
      rationale.push('Strategy SURFACE_RESCUE_PRIORITY: High rescue density.');
    } else if (finalMode === 'REVIEW_QUEUE') {
      focusStrategy = 'SURFACE_REVIEW_PRIORITY';
      rationale.push('Strategy SURFACE_REVIEW_PRIORITY: Review queue contains stronger candidates.');
    } else if (advisedTarget !== baselineTarget && advisedTarget !== null) {
      focusStrategy = 'FOLLOW_COGNITIVE_TARGET';
      rationale.push('Strategy FOLLOW_COGNITIVE_TARGET: Stage-2 advice recommends override.');
    } else {
      focusStrategy = 'FOLLOW_BASELINE';
      rationale.push('Strategy FOLLOW_BASELINE: Baseline target is adequate.');
    }

    // 6. Determine Deterministic Exposure Guidance
    const shouldSurfaceReviewQueue = (finalMode === 'REVIEW_QUEUE' || finalMode === 'RECOVERY_REVIEW') && reviewQueue.length > 0;
    const shouldSurfaceRescuePriority = focusStrategy === 'SURFACE_RESCUE_PRIORITY';
    const topReviewSubtitleId = reviewQueue.length > 0 ? reviewQueue[0].subtitleId : null;

    return {
      mode: finalMode,
      focusStrategy,
      advisedTarget: focusStrategy === 'FOLLOW_COGNITIVE_TARGET' ? advisedTarget : baselineTarget,
      topReviewSubtitleId,
      shouldSurfaceReviewQueue,
      shouldSurfaceRescuePriority,
      reviewPressureScore,
      rationale
    };
  }

  public generateSnapshot(
    activeSubtitleId: string | number | null,
    decision: OrchestrationDecision,
    reinforcementCandidates: ReinforcementCandidate[],
    reviewQueue: ReviewQueueEntry[]
  ): SessionCognitiveSnapshot {
    let rescueTokenCount = 0;
    let reactivateTokenCount = 0;
    let introduceTokenCount = 0;
    let reinforceTokenCount = 0;
    let ignoredTokenCount = 0;

    for (const rc of reinforcementCandidates) {
      if (rc.reinforcementClass === 'RESCUE') rescueTokenCount++;
      if (rc.reinforcementClass === 'REACTIVATE') reactivateTokenCount++;
      if (rc.reinforcementClass === 'INTRODUCE') introduceTokenCount++;
      if (rc.reinforcementClass === 'REINFORCE') reinforceTokenCount++;
      if (rc.reinforcementClass === 'IGNORE') ignoredTokenCount++;
    }

    return {
      activeSubtitleId,
      activeMode: decision.mode,
      rescueTokenCount,
      reactivateTokenCount,
      introduceTokenCount,
      reinforceTokenCount,
      ignoredTokenCount,
      topAdvisedTarget: decision.advisedTarget,
      reviewQueueLength: reviewQueue.length,
      reviewPressureScore: decision.reviewPressureScore,
      rationale: [...decision.rationale]
    };
  }
}

export const cognitiveOrchestrator = new CognitiveOrchestrator();
