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
  }

  /**
   * PHASE 3 TASK: Lexicon Installation.
   * PURPOSE: Merges large-scale lexicon with curated data.
   * CONTRACT: Never overwrites curated entries.
   */
  async loadLargeLexicon(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Lexicon load failed");
      
      const data = await response.json();
      
      // Merge logic
      for (const [word, info] of Object.entries(data)) {
        if (!this.curatedEntries.has(word)) {
          const [pinyin, meaning, pos] = info as [string, string, string];
          this.dictionary.set(word, { pinyin, meaning, pos });
        }
      }

      // Merge curated back in
      this.curatedEntries.forEach((val, key) => {
        this.dictionary.set(key, val);
      });

      this.rebuildTrie();
      stateManager.setState({ lexiconLoaded: true });
      console.log(`Lexicon Loaded: ${this.dictionary.size} entries.`);
    } catch (e) {
      console.error("Lexicon Error:", e);
      // Fallback to curated only
      this.rebuildTrie();
    }
  }

  private rebuildTrie() {
    tokenTrie.clear();
    this.dictionary.forEach((_, word) => {
      tokenTrie.insert(word);
    });
  }

  getEntry(token: string): DictEntry | null {
    return this.dictionary.get(token) || null;
  }
}

export const dictionaryEngine = new DictionaryEngine();
