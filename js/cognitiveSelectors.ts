import { stateManager } from './state.ts';
import { cognitiveInference } from './cognitiveInference.ts';
import { reinforcementPlanner } from './reinforcementPlanner.ts';
import { computeCognitiveAttentionAdvice } from './cognitiveAttention.ts';
import { computeSubtitlePriority } from './subtitleCognitivePriority.ts';
import { generateReviewCandidates } from './reviewPlanner.ts';
import { timeAuthority } from './timeAuthority.ts';

export const cognitiveSelectors = {
  getProfile(token: string, now: number = timeAuthority.getNow()) {
    return cognitiveInference.deriveTokenProfile(token, now);
  },

  getReinforcementCandidates(now: number = timeAuthority.getNow()) {
    const allProfiles = cognitiveInference.deriveAllProfiles(now);
    return reinforcementPlanner.planReinforcement(now, allProfiles);
  },

  getAttentionAdvice(tokens: string[], baselineTarget: string | null, now: number = timeAuthority.getNow()) {
    const candidates = this.getReinforcementCandidates(now);
    return computeCognitiveAttentionAdvice(tokens, baselineTarget, candidates);
  },

  getSubtitlePriority(subtitleId: string | number, tokens: string[], now: number = timeAuthority.getNow()) {
    const candidates = this.getReinforcementCandidates(now);
    return computeSubtitlePriority(subtitleId, tokens, candidates);
  },

  getReviewCandidates(subtitles: { id: string | number; tokens?: string[] }[], now: number = timeAuthority.getNow()) {
    const candidates = this.getReinforcementCandidates(now);
    const priorities = new Map();
    for (const subtitle of subtitles) {
      if (subtitle.tokens) {
        priorities.set(subtitle.id, computeSubtitlePriority(subtitle.id, subtitle.tokens, candidates));
      }
    }
    return generateReviewCandidates(subtitles, priorities, candidates);
  }
};
