/**
 * ENGINE PRIMITIVE: BonusMaskSystem
 * PURPOSE: Token difficulty classification.
 * INVARIANT: Deterministic mapping of token + context to HeatLevel.
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

export interface DictionaryLookup {
  getEntry(token: string): { hsk?: number; frequencyBand?: HeatLevel } | null;
}

export class BonusMaskSystem {
  /**
   * Classifies a token into a difficulty band.
   */
  static classify(token: string, savedWords: Set<string>, dictionary: DictionaryLookup): HeatLevel {
    if (savedWords.has(token)) {
      return 'known';
    }
    
    if (!/[\u4e00-\u9fa5]/.test(token)) {
      return 'known';
    }
    
    if (COMMON_TOKENS.has(token)) {
      return 'common';
    }
    
    const entry = dictionary.getEntry(token);
    if (entry) {
      if (entry.frequencyBand) {
        return entry.frequencyBand;
      }
      
      const hsk = entry.hsk || HSK_LEVELS[token];
      if (hsk) {
        if (hsk <= 2) return 'common';
        if (hsk <= 4) return 'mid';
        return 'rare';
      }
      
      // Heuristic fallback
      return token.length <= 2 ? 'mid' : 'rare';
    }
    
    return 'unknown';
  }
}
