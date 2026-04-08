const fs = require('fs');

const lexicon = JSON.parse(fs.readFileSync('./public/data/demo_lexicon.json', 'utf8'));
const srt = fs.readFileSync('./public/data/demo_subtitles.srt', 'utf8');

class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }
}

class TokenTrie {
  constructor() {
    this.root = new TrieNode();
  }
  insert(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }
    node.isEndOfWord = true;
  }
  segment(text) {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      let longestMatch = "";
      let node = this.root;
      let currentMatch = "";
      for (let j = i; j < text.length; j++) {
        const char = text[j];
        if (node.children.has(char)) {
          node = node.children.get(char);
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
        tokens.push(text[i]);
        i++;
      }
    }
    return tokens;
  }
}

const trie = new TokenTrie();
for (const word of Object.keys(lexicon)) {
  trie.insert(word);
}

const curated = ["你好", "学习", "欢迎", "来到", "我们", "一起"];
for (const word of curated) {
  trie.insert(word);
}

const lines = srt.split('\n');
const missing = new Set();
for (const line of lines) {
  if (line.trim() === '' || !isNaN(line.trim()) || line.includes('-->')) continue;
  const tokens = trie.segment(line);
  for (const token of tokens) {
    const isChinese = /[\u4e00-\u9fa5]/.test(token);
    if (isChinese && !lexicon[token] && !curated.includes(token)) {
      missing.add(token);
      console.log("Missing token:", token, "in line:", line);
    }
  }
}

console.log(Array.from(missing).join(', '));
