import { stateManager } from './state.ts';
import { GuidedControlDecision, ControlActionAvailability } from './controlTypes.ts';

export const controlSelectors = {
  getGuidedControlDecision(): GuidedControlDecision | null {
    return stateManager.getState().activeGuidedControlDecision || null;
  },

  getControlActionAvailability(): ControlActionAvailability {
    const decision = this.getGuidedControlDecision();
    if (!decision) {
      return {
        canEnterReview: false,
        canAdvanceReview: false,
        canExitReview: false,
        shouldSurfaceRescuePrompt: false,
        shouldSurfaceStudyPrompt: false
      };
    }

    return {
      canEnterReview: decision.reviewEntryState === 'SURFACED' || decision.reviewEntryState === 'AVAILABLE',
      canAdvanceReview: decision.reviewProgressState === 'ROW_RESOLVED',
      canExitReview: decision.reviewEntryState === 'ACCEPTED',
      shouldSurfaceRescuePrompt: decision.shouldSurfaceRescuePrompt,
      shouldSurfaceStudyPrompt: decision.shouldSurfaceStudyPrompt
    };
  }
};
