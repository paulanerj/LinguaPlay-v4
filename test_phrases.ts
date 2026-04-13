import { tokenTrie } from './js/tokenTrie.ts';
import { segmentationPostProcessor } from './js/segmentationPostProcessor.ts';
import { dictionaryEngine } from './js/dictionaryEngine.ts';
import fs from 'fs';

async function run() {
  // Load lexicon
  const lexiconData = JSON.parse(fs.readFileSync('./public/data/cn_lexicon_large.json', 'utf-8'));
  for (const [word, info] of Object.entries(lexiconData)) {
    if (typeof info === 'object' && info !== null && !Array.isArray(info)) {
      const entry = info as any;
      if (entry.pinyin && entry.meaning) {
        dictionaryEngine['dictionary'].set(word, entry);
      }
    } else if (Array.isArray(info) && info.length >= 2) {
      const [pinyin, meaning, pos] = info as [string, string, string | undefined];
      dictionaryEngine['dictionary'].set(word, { pinyin, meaning, pos });
    }
  }
  dictionaryEngine['rebuildTrie']();
  dictionaryEngine.ready = true;

  const lines = [
    "我希望那家饭馆不用排队。",
    "走吧，我已经饿了。",
    "你不用担心。",
    "我觉得这个办法可以。",
    "如果人太多，我们也可以先去附近走一走。"
  ];

  for (const line of lines) {
    console.log(`\nRaw line: ${line}`);
    const rawTokens = tokenTrie.segment(line);
    console.log(`Base tokens: ${rawTokens.join(' / ')}`);
    const phraseTokens = segmentationPostProcessor.process(rawTokens);
    console.log(`Phrase units: ${phraseTokens.join(' / ')}`);
    
    const matches = phraseTokens.map(t => {
      const res = dictionaryEngine.getEntry(t);
      return `${t}: ${res.truthStatus === 'FOUND' || res.truthStatus === 'CURATED' ? 'FOUND' : 'MISSING'}`;
    });
    console.log(`Dictionary matches: ${matches.join(', ')}`);
    
    const translation = phraseTokens.map(t => {
      const res = dictionaryEngine.getEntry(t);
      return res.entry?.meaning ? res.entry.meaning.split(';')[0].trim() : t;
    }).join(' ');
    console.log(`Sentence translation: ${translation}`);
  }
}

run();