/**
 * PURPOSE: Frequency Heatmap Engine.
 * WHY THIS EXISTS: Classifies tokens into difficulty bands for cognitive guidance.
 * CONTRACT:
 *   - Pure visual metadata.
 *   - Does not influence segmentation or behavior.
 */

import { dictionaryEngine } from './dictionaryEngine.ts';
import { learningMemory } from './learningMemory.ts';

export type HeatLevel = 'known' | 'common' | 'mid' | 'rare' | 'unknown';

export function getHSKLevel(token: string): number | null {
  const result = dictionaryEngine.getEntry(token);
  return result.entry?.hsk || null;
}

/**
 * Classifies a token based on priority:
 * 1. Saved Words -> known
 * 2. Curated Common -> common
 * 3. Explicit metadata from lexicon -> mid / rare
 * 4. Missing Chinese -> unknown
 * 5. Non-lexical -> null
 * 
 * FALLBACK POLICY: 
 * If a token is FOUND but has no explicit frequencyBand or HSK level,
 * it is classified as 'rare' to maintain epistemic honesty (we don't know it's common).
 */
export function classifyToken(token: string, savedWords: Set<string>): HeatLevel | null {
  // 1. Saved Words -> known
  if (savedWords.has(token)) return 'known';

  const result = dictionaryEngine.getEntry(token);
  
  // 2. Non-lexical -> no heat class
  if (result.truthStatus === 'NON_LEXICAL') return null;

  // 3. Curated -> common (Curated entries are by definition common learning targets)
  if (result.truthStatus === 'CURATED') return 'common';

  // 4. Found in Dictionary -> use metadata
  if (result.truthStatus === 'FOUND' && result.entry) {
    const entry = result.entry;
    if (entry.frequencyBand === 'common') return 'common';
    if (entry.hsk && entry.hsk <= 2) return 'common';
    if (entry.hsk && entry.hsk <= 4) return 'mid';
    if (entry.frequencyBand) return entry.frequencyBand;
    
    // Honest fallback: If we found it but don't have frequency data, it's 'rare'
    return 'rare';
  }

  // 5. Missing from Dictionary -> unknown
  if (result.truthStatus === 'MISSING') return 'unknown';

  return 'unknown';
}

export function getHeatClass(token: string, savedWords: Set<string>): string {
  const record = learningMemory.getRecord(token);
  if (savedWords.has(token)) return 'heat-known';
  if (record) {
    if (record.reviewCount > 2) return 'heat-common';
    if (record.reviewCount > 0) return 'heat-mid';
    if (record.encounterCount > 2) return 'heat-rare';
    if (record.encounterCount > 0) return 'heat-unknown';
  }
  
  const level = classifyToken(token, savedWords);
  return level ? `heat-${level}` : '';
}

export function getHeatLabel(token: string, savedWords: Set<string>): string {
  const level = classifyToken(token, savedWords);
  if (!level) return 'None';
  switch (level) {
    case 'known': return 'Known';
    case 'common': return 'Common';
    case 'mid': return 'Medium';
    case 'rare': return 'Rare';
    case 'unknown': return 'Unknown';
    default: return 'Unknown';
  }
}
