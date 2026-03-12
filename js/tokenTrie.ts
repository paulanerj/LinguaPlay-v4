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
        tokens.push(text[i]);
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
}

export const tokenTrie = new TokenTrie();
