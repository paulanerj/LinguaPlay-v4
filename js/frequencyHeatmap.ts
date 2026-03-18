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

const HSK_LEVELS: Record<string, number> = {
  "我": 1, "你": 1, "他": 1, "她": 1, "它": 1, "们": 1, "我们": 1, "你们": 1, "他们": 1,
  "是": 1, "不": 1, "有": 1, "在": 1, "了": 1, "的": 1, "吗": 1, "呢": 1, "吧": 1, "也": 1,
  "你好": 1, "学习": 1, "中国": 1, "中文": 1, "可以": 1, "不是": 1, "什么": 1, "怎么": 1,
  "这": 1, "那": 1, "哪": 1, "谁": 1, "去": 1, "来": 1, "看": 1, "听": 1, "说": 1, "写": 1,
  "大": 1, "小": 1, "多": 1, "少": 1, "好": 1, "坏": 1, "对": 1, "错": 1, "要": 1, "想": 1,
  "欢迎": 1, "来到": 1, "一起": 1, "朋友": 1, "快乐": 1
};

export function getHSKLevel(token: string): number | null {
  return HSK_LEVELS[token] || null;
}

import { dictionaryEngine } from './dictionaryEngine.ts';

/**
 * Classifies a token based on priority:
 * 1. Saved Words -> known
 * 2. Curated Common -> common
 * 3. In Dictionary -> mid (shorter) or rare (longer)
 * 4. Not in Dictionary -> unknown
 */
export function classifyToken(token: string, savedWords: Set<string>): HeatLevel {
  let level: HeatLevel = 'unknown';

  if (savedWords.has(token)) {
    level = 'known';
  } else if (!/[\u4e00-\u9fa5]/.test(token)) {
    // Non-Chinese characters are "known" by default (ignored for learning)
    level = 'known';
  } else if (COMMON_TOKENS.has(token)) {
    level = 'common';
  } else {
    const entry = dictionaryEngine.getEntry(token);
    if (entry) {
      if (entry.frequencyBand) {
        level = entry.frequencyBand;
      } else if (entry.hsk && entry.hsk <= 2) {
        level = 'common';
      } else if (entry.hsk && entry.hsk <= 4) {
        level = 'mid';
      } else if (entry.hsk) {
        level = 'rare';
      } else {
        // Heuristic: Shorter words in dictionary are often more common
        level = token.length <= 2 ? 'mid' : 'rare';
      }
    } else {
      // Not in dictionary or common set
      level = 'unknown';
    }
  }
  
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
