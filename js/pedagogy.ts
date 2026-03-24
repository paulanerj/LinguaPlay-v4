/**
 * PURPOSE: Pedagogical Truth Model.
 * WHY THIS EXISTS: Defines the cognitive architecture for language acquisition.
 * CONTRACT:
 *   - Pure structural definitions in Phase R2.2.
 *   - No logic or persistence yet.
 */

/**
 * The deterministic cognitive states of a token in the learner's mind.
 */
export enum CognitiveState {
  UNSEEN = 'UNSEEN',
  VISUALLY_FAMILIAR = 'VISUALLY_FAMILIAR',
  SEMANTICALLY_LINKED = 'SEMANTICALLY_LINKED',
  RECALLABLE = 'RECALLABLE',
  STABLE = 'STABLE',
  AUTOMATIC = 'AUTOMATIC',
  FRAGILE = 'FRAGILE',
  LOST = 'LOST'
}

/**
 * Types of attention states during exposure.
 */
export type AttentionState = 'passive' | 'target' | 'selected';

/**
 * Types of user interactions with a token.
 */
export type InteractionType = 'view' | 'click' | 'hover';

/**
 * The schema for a single token exposure event.
 */
export interface TokenExposureEvent {
  token: string;
  timestamp: number;
  subtitleIndex: number | null;
  attentionState: AttentionState;
  interactionType: InteractionType;
}

/**
 * The persistent record of a learner's history with a specific token.
 */
export interface TokenMemoryRecord {
  token: string;
  encounterCount: number;
  reviewCount: number;
  saveCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
  lastReviewedAt?: number;
  lastSavedAt?: number;
}

/**
 * The collection of all token memory records.
 */
export type TokenMemoryStore = Record<string, TokenMemoryRecord>;

/**
 * Instruments exposure logging for Phase R2.2.
 * Observational only. No storage.
 */
export function logExposure(event: TokenExposureEvent) {
  const { token, attentionState, interactionType, subtitleIndex } = event;
  console.log(
    `[PEDAGOGY] exposure: token=${token} | state=${attentionState} | type=${interactionType} | sub=${subtitleIndex}`
  );
}
