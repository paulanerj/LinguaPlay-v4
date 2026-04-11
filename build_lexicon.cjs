const fs = require('fs');
const data = require('cedict-json');

// Map of pinyin vowels to tone marks
const toneMarks = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
};

function convertPinyin(pinyin) {
  if (!pinyin) return '';
  return pinyin.split(' ').map(syl => {
    const match = syl.match(/^([a-zA-Züv]+)(\d)$/);
    if (!match) return syl.replace(/v/g, 'ü');
    
    let [_, letters, toneStr] = match;
    const tone = parseInt(toneStr, 10);
    if (tone < 1 || tone > 5) return letters.replace(/v/g, 'ü');
    
    letters = letters.replace(/v/g, 'ü');
    
    // Find vowel to mark
    let vowelToMark = '';
    if (letters.includes('a')) vowelToMark = 'a';
    else if (letters.includes('e')) vowelToMark = 'e';
    else if (letters.includes('ou')) vowelToMark = 'o';
    else {
      // Mark the last vowel
      const vowels = letters.match(/[aeiouü]/g);
      if (vowels) {
        vowelToMark = vowels[vowels.length - 1];
      }
    }
    
    if (vowelToMark) {
      return letters.replace(vowelToMark, toneMarks[vowelToMark][tone - 1]);
    }
    return letters;
  }).join(' ');
}

const lexicon = {};

data.forEach(entry => {
  const { simplified, pinyin, english } = entry;
  // If multiple entries exist for the same simplified word, we can combine meanings or just take the first.
  // We will combine meanings if it already exists.
  const meaning = english.join('; ');
  const py = convertPinyin(pinyin);
  
  if (lexicon[simplified]) {
    if (!lexicon[simplified][1].includes(meaning)) {
      lexicon[simplified][1] += ' | ' + meaning;
    }
  } else {
    lexicon[simplified] = [py, meaning, 'unknown'];
  }
});

fs.writeFileSync('data/cn_lexicon_large.json', JSON.stringify(lexicon, null, 2));
console.log(`Lexicon built with ${Object.keys(lexicon).length} unique simplified entries.`);
