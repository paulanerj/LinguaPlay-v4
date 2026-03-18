/**
 * PURPOSE: Frequency Heatmap Engine.
 * WHY THIS EXISTS: Classifies tokens into difficulty bands for cognitive guidance.
 * CONTRACT:
 *   - Pure visual metadata.
 *   - Does not influence segmentation or behavior.
 */

import { BonusMaskSystem, HeatLevel } from '../engine/BonusMaskSystem.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';

export type { HeatLevel };

export function getHSKLevel(token: string): number | null {
  const result = dictionaryEngine.getEntry(token);
  return result.entry?.hsk || null;
}

/**
 * Classifies a token based on priority:
 * 1. Saved Words -> known
 * 2. Curated Common -> common
 * 3. In Dictionary -> mid (shorter) or rare (longer)
 * 4. Not in Dictionary -> unknown
 */
export function classifyToken(token: string, savedWords: Set<string>): HeatLevel {
  const level = BonusMaskSystem.classify(token, savedWords, dictionaryEngine);
  console.log(`[HEATMAP] token=${token} level=${level}`);
  return level;
}

export function getHeatClass(token: string, savedWords: Set<string>): string {
  const level = classifyToken(token, savedWords);
  return `heat-${level}`;
}

export function getHeatLabel(token: string, savedWords: Set<string>): string {
  const level = classifyToken(token, savedWords);
  switch (level) {
    case 'known': return 'Known';
    case 'common': return 'Common';
    case 'mid': return 'Medium';
    case 'rare': return 'Rare';
    case 'unknown': return 'Unknown';
    default: return 'Unknown';
  }
}
