/**
 * PURPOSE: Lexical intelligence and dictionary management.
 * WHY THIS EXISTS: Maps raw tokens to meaning, pinyin, and metadata.
 * CONTRACT:
 *   - Input: Token string.
 *   - Output: Dictionary entry or null.
 * SIDE EFFECTS: Rebuilds TokenTrie on lexicon load.
 */

import { tokenTrie } from './tokenTrie.ts';
import { stateManager } from './state.ts';

export interface DictEntry {
  pinyin: string;
  meaning: string;
  pos?: string;
  hsk?: number;
  frequencyBand?: 'common' | 'mid' | 'rare';
}

export enum LexiconTruthStatus {
  FOUND = 'FOUND',
  CURATED = 'CURATED',
  MISSING = 'MISSING',
  NON_LEXICAL = 'NON_LEXICAL',
  PENDING = 'PENDING'
}

export interface LexiconResult {
  entry: DictEntry | null;
  truthStatus: LexiconTruthStatus;
  reason: string;
}

class DictionaryEngine {
  private dictionary: Map<string, DictEntry> = new Map();
  private curatedEntries: Map<string, DictEntry> = new Map();

  constructor() {
    // Initial curated entries (High priority)
    // Common / HSK 1
    this.curatedEntries.set("你好", { pinyin: "nǐ hǎo", meaning: "Hello", hsk: 1, frequencyBand: 'common' });
    this.curatedEntries.set("学习", { pinyin: "xué xí", meaning: "To study; to learn", hsk: 1, frequencyBand: 'common' });
    this.curatedEntries.set("欢迎", { pinyin: "huān yíng", meaning: "Welcome", hsk: 1, frequencyBand: 'common' });
    this.curatedEntries.set("来到", { pinyin: "lái dào", meaning: "To arrive at; to come to", hsk: 1, frequencyBand: 'common' });
    this.curatedEntries.set("我们", { pinyin: "wǒ men", meaning: "We; us", hsk: 1, frequencyBand: 'common' });
    this.curatedEntries.set("一起", { pinyin: "yì qǐ", meaning: "Together", hsk: 1, frequencyBand: 'common' });
    
    // Mid
    this.curatedEntries.set("LinguaPlay", { pinyin: "Líng-guǎ-Plāy", meaning: "The name of this language learning application.", frequencyBand: 'mid' });
    this.curatedEntries.set("学习者", { pinyin: "xué xí zhě", meaning: "Learner", frequencyBand: 'mid' });
    
    // Rare
    this.curatedEntries.set("认知", { pinyin: "rèn zhī", meaning: "Cognition", frequencyBand: 'rare' });
    this.curatedEntries.set("引擎", { pinyin: "yǐng qíng", meaning: "Engine", frequencyBand: 'rare' });
  }

  /**
   * PHASE 3 TASK: Lexicon Installation.
   * PURPOSE: Merges large-scale lexicon with curated data.
   * CONTRACT: Never overwrites curated entries.
   */
  async loadLargeLexicon(url: string) {
    // TASK 1: Ensure curated entries populate dictionary BEFORE any external load
    this.curatedEntries.forEach((val, key) => {
      this.dictionary.set(key, val);
    });

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Lexicon load failed");
      
      const data = await response.json();
      
      let accepted = 0;
      let rejected = 0;

      // TASK 2: Strict validation of lexicon JSON structure
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        for (const [word, info] of Object.entries(data)) {
          if (this.curatedEntries.has(word)) continue;

          // Support new object format
          if (typeof info === 'object' && info !== null && !Array.isArray(info)) {
            const entry = info as DictEntry;
            if (entry.pinyin && entry.meaning) {
              this.dictionary.set(word, entry);
              accepted++;
            } else {
              rejected++;
            }
          } 
          // Support legacy array format
          else if (Array.isArray(info) && info.length >= 2 && typeof info[0] === 'string' && typeof info[1] === 'string') {
            const [pinyin, meaning, pos] = info as [string, string, string | undefined];
            this.dictionary.set(word, { pinyin, meaning, pos });
            accepted++;
          } else {
            rejected++;
          }
        }
      } else {
        throw new Error("Invalid lexicon format: Root is not an object.");
      }

      console.log(`Lexicon Loaded: ${accepted} accepted, ${rejected} rejected. Total: ${this.dictionary.size}`);
      this.rebuildTrie();
      stateManager.setState({ lexiconLoaded: true });
    } catch (e) {
      console.error("Lexicon Error:", e);
      console.log("Fallback Mode: Using curated entries only.");
      // Fallback to curated only
      this.rebuildTrie();
      stateManager.setState({ lexiconLoaded: true }); // Reflect fallback success
    }
  }

  private rebuildTrie() {
    tokenTrie.clear();
    this.dictionary.forEach((_, word) => {
      tokenTrie.insert(word);
    });
  }

  getEntry(token: string): LexiconResult {
    if (!stateManager.getState().lexiconLoaded && this.dictionary.size === 0) {
      return { entry: null, truthStatus: LexiconTruthStatus.PENDING, reason: "Dictionary loading..." };
    }

    if (!token || token.trim() === "") {
      return { entry: null, truthStatus: LexiconTruthStatus.NON_LEXICAL, reason: "Empty token" };
    }

    // Latin / Punctuation check
    const isChinese = /[\u4e00-\u9fa5]/.test(token);
    const isLatin = /^[a-zA-Z0-9\s]+$/.test(token);
    const isPunctuation = /^[.,!?;:，。！？；：、""''（）《》【】]+$/.test(token);

    if (!isChinese && (isLatin || isPunctuation)) {
      return { entry: null, truthStatus: LexiconTruthStatus.NON_LEXICAL, reason: "Non-lexical token (Latin or Punctuation)" };
    }

    // Curated check
    const curated = this.curatedEntries.get(token);
    if (curated) {
      return { entry: curated, truthStatus: LexiconTruthStatus.CURATED, reason: "Curated override" };
    }

    // Dictionary check
    const entry = this.dictionary.get(token);
    if (entry) {
      return { entry, truthStatus: LexiconTruthStatus.FOUND, reason: "Found in lexicon" };
    }

    // Fallback: Case-insensitive lookup for Latin characters
    if (isLatin) {
      const lower = token.toLowerCase();
      for (const [key, val] of this.dictionary.entries()) {
        if (key.toLowerCase() === lower) {
          return { entry: val, truthStatus: LexiconTruthStatus.FOUND, reason: "Found in lexicon (case-insensitive)" };
        }
      }
    }

    if (isChinese) {
      return { entry: null, truthStatus: LexiconTruthStatus.MISSING, reason: "Chinese token missing from lexicon" };
    }

    return { entry: null, truthStatus: LexiconTruthStatus.NON_LEXICAL, reason: "Non-lexical token" };
  }
}

export const dictionaryEngine = new DictionaryEngine();
