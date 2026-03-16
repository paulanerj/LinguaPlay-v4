/**
 * PURPOSE: Frequency Heatmap Engine.
 * WHY THIS EXISTS: Classifies tokens into difficulty bands for cognitive guidance.
 * CONTRACT:
 *   - Pure visual metadata.
 *   - Does not influence segmentation or behavior.
 */

export type HeatLevel = 'known' | 'common' | 'mid' | 'rare' | 'unknown';

const COMMON_TOKENS = new Set([
  "我", "你", "他", "她", "它", "们", "我们", "你们", "他们",
  "是", "不", "有", "在", "了", "的", "吗", "呢", "吧", "也",
  "你好", "学习", "中国", "中文", "可以", "不是", "什么", "怎么",
  "这", "那", "哪", "谁", "去", "来", "看", "听", "说", "写",
  "大", "小", "多", "少", "好", "坏", "对", "错", "要", "想"
]);

import { dictionaryEngine } from './dictionaryEngine.ts';

/**
 * Classifies a token based on priority:
 * 1. Saved Words -> known
 * 2. Curated Common -> common
 * 3. In Dictionary -> mid (shorter) or rare (longer)
 * 4. Not in Dictionary -> unknown
 */
export function classifyToken(token: string, savedWords: Set<string>): HeatLevel {
  if (savedWords.has(token)) return 'known';
  if (COMMON_TOKENS.has(token)) return 'common';
  
  const entry = dictionaryEngine.getEntry(token);
  if (entry) {
    // Heuristic: Shorter words in dictionary are often more common
    return token.length <= 2 ? 'mid' : 'rare';
  }
  
  // Not in dictionary or common set
  return 'unknown';
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
