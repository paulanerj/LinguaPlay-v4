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
}

class DictionaryEngine {
  private dictionary: Map<string, DictEntry> = new Map();
  private curatedEntries: Map<string, DictEntry> = new Map();

  constructor() {
    // Initial curated entries (High priority)
    this.curatedEntries.set("你好", { pinyin: "nǐ hǎo", meaning: "Hello" });
    this.curatedEntries.set("学习", { pinyin: "xué xí", meaning: "To study; to learn" });
    this.curatedEntries.set("LinguaPlay", { pinyin: "Líng-guǎ-Plāy", meaning: "The name of this language learning application." });
    this.curatedEntries.set("欢迎", { pinyin: "huān yíng", meaning: "Welcome" });
    this.curatedEntries.set("来到", { pinyin: "lái dào", meaning: "To arrive at; to come to" });
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
          if (Array.isArray(info) && info.length >= 2 && typeof info[0] === 'string' && typeof info[1] === 'string') {
            if (!this.curatedEntries.has(word)) {
              const [pinyin, meaning, pos] = info as [string, string, string | undefined];
              this.dictionary.set(word, { pinyin, meaning, pos });
              accepted++;
            }
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

  getEntry(token: string): DictEntry | null {
    if (!token) return null;
    const entry = this.dictionary.get(token);
    if (entry) return entry;

    // Fallback: Case-insensitive lookup for Latin characters
    if (/^[a-zA-Z]+$/.test(token)) {
      const lower = token.toLowerCase();
      for (const [key, val] of this.dictionary.entries()) {
        if (key.toLowerCase() === lower) return val;
      }
    }

    return null;
  }
}

export const dictionaryEngine = new DictionaryEngine();
