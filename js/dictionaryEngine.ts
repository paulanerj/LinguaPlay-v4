/**
 * PURPOSE: Lexical intelligence and dictionary management.
 * WHY THIS EXISTS: Maps raw tokens to meaning, pinyin, and metadata.
 * CONTRACT:
 *   - Input: Token string.
 *   - Output: Dictionary entry or null.
 * SIDE EFFECTS: Rebuilds TokenTrie on lexicon load.
 */

import { tokenTrie } from './tokenTrie.ts';
import { stateManager, LexiconMode } from './state.ts';

export interface DictEntry {
  pinyin: string;
  meaning: string;
  pos?: string;
  hsk?: number;
  frequencyBand?: 'common' | 'mid' | 'rare';
}

export type LexiconTruthStatus = 'CURATED' | 'FOUND' | 'MISSING' | 'NON_LEXICAL';

export interface LexiconLookupResult {
  entry: DictEntry | null;
  truthStatus: LexiconTruthStatus;
  reason: string;
}

class DictionaryEngine {
  private dictionary: Map<string, DictEntry> = new Map();
  private curatedEntries: Map<string, DictEntry> = new Map();
  public ready: boolean = false;

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
  async initialize() {
    console.log("[Lexicon] Loading dictionary...");
    
    // Ensure curated entries populate dictionary BEFORE any external load
    this.curatedEntries.forEach((val, key) => {
      this.dictionary.set(key, val);
    });

    try {
      const response = await fetch("/data/cn_lexicon_large.json");
      if (!response.ok) throw new Error(`Lexicon load failed: ${response.statusText}`);
      
      const data = await response.json();
      
      let accepted = 0;
      let rejected = 0;

      // Strict validation of lexicon JSON structure
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

      console.log("[Lexicon] Entries loaded:", this.dictionary.size);
      this.rebuildTrie();
      console.log("[Lexicon] Trie nodes created:", tokenTrie.getNodeCount());
      console.log("[Lexicon] Mode: FULL");
      this.ready = true;
      stateManager.setState({ lexiconLoaded: true, lexiconMode: LexiconMode.FULL });
    } catch (e) {
      console.error("Lexicon Error:", e);
      throw e; // Hard fail on initialization
    }
  }

  private rebuildTrie() {
    tokenTrie.clear();
    this.dictionary.forEach((_, word) => {
      tokenTrie.insert(word);
    });
  }

  /**
   * UPGRADED LOOKUP LOGIC
   * Distinguishes between curated, found, missing, and non-lexical tokens.
   */
  getEntry(token: string): LexiconLookupResult {
    if (!this.ready) {
      throw new Error("Dictionary not initialized");
    }

    if (!token || token.trim() === "") {
      return { entry: null, truthStatus: 'NON_LEXICAL', reason: "Empty token" };
    }

    // 1. CURATED check (High priority)
    const curated = this.curatedEntries.get(token);
    if (curated) {
      return { 
        entry: curated, 
        truthStatus: 'CURATED', 
        reason: "From curated learning vocabulary" 
      };
    }

    // 2. NON_LEXICAL check (Punctuation / Latin / Non-Chinese)
    const isChinese = /[\u4e00-\u9fa5]/.test(token);
    const isLatin = /^[a-zA-Z0-9\s]+$/.test(token);
    const isPunctuation = /^[.,!?;:，。！？；：、""''（）《》【】]+$/.test(token);

    if (!isChinese && (isLatin || isPunctuation)) {
      return { 
        entry: null, 
        truthStatus: 'NON_LEXICAL', 
        reason: "Not a Chinese lexical token (Latin or Punctuation)" 
      };
    }

    // 3. FOUND check (Dictionary)
    const entry = this.dictionary.get(token);
    if (entry) {
      return { 
        entry, 
        truthStatus: 'FOUND', 
        reason: "From loaded lexicon" 
      };
    }

    // 4. MISSING check (Chinese token not in dictionary)
    if (isChinese) {
      return { 
        entry: null, 
        truthStatus: 'MISSING', 
        reason: "Chinese token missing from lexicon" 
      };
    }

    // Default to NON_LEXICAL for everything else
    return { 
      entry: null, 
      truthStatus: 'NON_LEXICAL', 
      reason: "Not a Chinese lexical token" 
    };
  }
}

export const dictionaryEngine = new DictionaryEngine();

if (typeof window !== 'undefined') {
  (window as any).debugDictionary = () => {
    console.log(`Dictionary entries: ${dictionaryEngine['dictionary'].size}`);
    console.log(`Trie nodes: ${tokenTrie.getNodeCount()}`);
    console.log(`Memory usage: ${(performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + ' MB' : 'N/A'}`);
  };
}
