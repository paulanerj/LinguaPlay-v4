import { CognitiveMode } from './orchestrationTypes.ts';

export interface SchedulerState {
  currentMode: CognitiveMode;
  modePersistenceCounter: number;
  consecutiveLowValueSubtitles: number;
  consecutiveHighPriorityRescueSubtitles: number;
  recentlySurfacedSubtitleId: string | number | null;
}

export class SessionScheduler {
  private state: SchedulerState = {
    currentMode: 'PASSIVE_WATCH',
    modePersistenceCounter: 0,
    consecutiveLowValueSubtitles: 0,
    consecutiveHighPriorityRescueSubtitles: 0,
    recentlySurfacedSubtitleId: null
  };

  public getState(): SchedulerState {
    return { ...this.state };
  }

  public recordSubtitleTransition(
    subtitlePriorityScore: number,
    rescueTokenCount: number,
    surfacedReviewSubtitleId: string | number | null
  ) {
    // Quiet-content rule tracking
    if (subtitlePriorityScore < 3 && rescueTokenCount === 0) {
      this.state.consecutiveLowValueSubtitles++;
    } else {
      this.state.consecutiveLowValueSubtitles = 0;
    }

    // Rescue-escalation rule tracking
    if (rescueTokenCount > 0 || subtitlePriorityScore >= 5) {
      this.state.consecutiveHighPriorityRescueSubtitles++;
    } else {
      this.state.consecutiveHighPriorityRescueSubtitles = 0;
    }

    if (surfacedReviewSubtitleId !== null) {
      this.state.recentlySurfacedSubtitleId = surfacedReviewSubtitleId;
    }
  }

  public determineNextMode(
    proposedMode: CognitiveMode,
    rescuePressureSpike: boolean
  ): CognitiveMode {
    const modeHierarchy: Record<CognitiveMode, number> = {
      'PASSIVE_WATCH': 1,
      'GUIDED_WATCH': 2,
      'ACTIVE_STUDY': 3,
      'REVIEW_QUEUE': 4,
      'RECOVERY_REVIEW': 5
    };

    const currentRank = modeHierarchy[this.state.currentMode];
    const proposedRank = modeHierarchy[proposedMode];

    // Anti-thrashing rule 1: Immediate upgrade allowed for rescue pressure spike or higher rank
    if (proposedRank > currentRank || rescuePressureSpike) {
      this.state.currentMode = proposedMode;
      this.state.modePersistenceCounter = 0;
      return proposedMode;
    }

    // Anti-thrashing rule 2: Minimum persistence before downgrade
    if (proposedRank < currentRank) {
      if (this.state.modePersistenceCounter >= 2) {
        this.state.currentMode = proposedMode;
        this.state.modePersistenceCounter = 0;
        return proposedMode;
      } else {
        // Persist current mode
        this.state.modePersistenceCounter++;
        return this.state.currentMode;
      }
    }

    // Same mode
    this.state.modePersistenceCounter++;
    return this.state.currentMode;
  }

  // For replay testing
  public reset() {
    this.state = {
      currentMode: 'PASSIVE_WATCH',
      modePersistenceCounter: 0,
      consecutiveLowValueSubtitles: 0,
      consecutiveHighPriorityRescueSubtitles: 0,
      recentlySurfacedSubtitleId: null
    };
  }
}

export const sessionScheduler = new SessionScheduler();
