/**
 * PURPOSE: High-performance prefix tree for string segmentation.
 * WHY THIS EXISTS: Enables real-time compound word recognition in subtitles.
 * CONTRACT:
 *   - Input: Dictionary keys (strings).
 *   - Output: Segmented arrays of tokens.
 * INVARIANTS:
 *   - Max Match algorithm (Greedy).
 *   - Case sensitivity preserved for CJK.
 */

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
}

export class TokenTrie {
  private root: TrieNode = new TrieNode();

  /**
   * PURPOSE: Insert a word into the trie.
   * SAFE TO CHANGE: Internal node structure.
   */
  insert(word: string) {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEndOfWord = true;
  }

  /**
   * FROZEN: Max Match Segmentation Logic.
   * WHY FROZEN: Core stability of the learning surface depends on predictable segmentation.
   * CONTRACT:
   *   - Input: Raw string.
   *   - Output: Array of strings (tokens).
   */
  segment(text: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < text.length) {
      let longestMatch = "";
      let node = this.root;
      let currentMatch = "";
      
      for (let j = i; j < text.length; j++) {
        const char = text[j];
        if (node.children.has(char)) {
          node = node.children.get(char)!;
          currentMatch += char;
          if (node.isEndOfWord) {
            longestMatch = currentMatch;
          }
        } else {
          break;
        }
      }

      if (longestMatch.length > 0) {
        tokens.push(longestMatch);
        i += longestMatch.length;
      } else {
        // Fallback to single character if no match found
        const char = text[i];
        const isChinese = /[\u4e00-\u9fa5]/.test(char);
        
        // Pass 4: Fallback strategy - prefer 2-character chunks over single characters when plausible
        if (isChinese && i + 1 < text.length) {
            const nextChar = text[i+1];
            const isNextChinese = /[\u4e00-\u9fa5]/.test(nextChar);
            if (isNextChinese) {
                // Group 2 characters
                const chunk = char + nextChar;
                tokens.push(chunk);
                console.log(`[Tokenizer] Unresolved fallback (2-char): ${chunk}`);
                i += 2;
                continue;
            }
        }
        
        tokens.push(char);
        if (isChinese) {
            console.log(`[Tokenizer] Unresolved fallback (1-char): ${char}`);
        }
        i++;
      }
    }
    return tokens;
  }

  /**
   * PURPOSE: Clear and rebuild the trie.
   * SIDE EFFECTS: Replaces the root node.
   */
  clear() {
    this.root = new TrieNode();
  }

  /**
   * PURPOSE: Count total nodes in the trie.
   */
  getNodeCount(): number {
    let count = 0;
    const traverse = (node: TrieNode) => {
      count++;
      node.children.forEach(traverse);
    };
    traverse(this.root);
    return count;
  }
}

export const tokenTrie = new TokenTrie();
