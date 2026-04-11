import fs from 'fs';
import { parseSRT } from './js/subtitleParser.ts';
import { dictionaryEngine } from './js/dictionaryEngine.ts';
import { tokenTrie } from './js/tokenTrie.ts';
import { segmentationPostProcessor } from './js/segmentationPostProcessor.ts';

// Mock fetch for file:// URLs
const originalFetch = global.fetch;
global.fetch = async (url: string | Request | URL, options?: RequestInit) => {
  const urlStr = url.toString();
  if (urlStr.startsWith('file://')) {
    const filePath = urlStr.replace('file://', '');
    const content = fs.readFileSync(filePath, 'utf-8');
    return new Response(content, { status: 200, statusText: 'OK' });
  }
  return originalFetch(url, options);
};

async function runAudit(srtPath: string, lexiconPath: string) {
  console.log(`\n--- Running Audit for ${srtPath} ---`);
  
  // Load lexicon
  await dictionaryEngine.loadLargeLexicon(lexiconPath);
  
  // Load SRT
  const srtText = fs.readFileSync(srtPath, 'utf-8');
  const subs = parseSRT(srtText);
  
  let totalTokens = 0;
  let resolvedTokens = 0;
  const unresolvedTokens = new Set<string>();
  
  const exampleLines: string[] = [];
  
  subs.forEach((sub, index) => {
    const rawTokens = tokenTrie.segment(sub.text);
    const tokens = segmentationPostProcessor.process(rawTokens);
    
    let lineHits = 0;
    let lineMisses = 0;
    
    tokens.forEach(token => {
      const isChinese = /[\u4e00-\u9fa5]/.test(token);
      if (isChinese) {
        totalTokens++;
        const lookup = dictionaryEngine.getEntry(token);
        if (lookup.entry) {
          resolvedTokens++;
          lineHits++;
        } else {
          unresolvedTokens.add(token);
          lineMisses++;
        }
      }
    });
    
    if (index < 10) {
      exampleLines.push(`[Line ${index + 1}] Raw: ${sub.text}`);
      exampleLines.push(`[Line ${index + 1}] Seg: ${tokens.join(' | ')}`);
    }
  });
  
  const coverage = totalTokens > 0 ? ((resolvedTokens / totalTokens) * 100).toFixed(2) : '0.00';
  
  console.log(`Tokens Scanned: ${totalTokens}`);
  console.log(`Tokens Resolved: ${resolvedTokens}`);
  console.log(`Coverage: ${coverage}%`);
  console.log(`Unresolved Tokens: ${Array.from(unresolvedTokens).join(', ')}`);
  console.log(`\n--- 10 Example Lines ---`);
  exampleLines.forEach(line => console.log(line));
  console.log(`------------------------------------\n`);
}

async function main() {
  // Use the newly built lexicon
  const lexiconUrl = 'file://' + process.cwd() + '/data/cn_lexicon_large.json';
  
  // 1. Demo Subtitles
  await runAudit('public/data/demo_subtitles.srt', lexiconUrl);
  
  // 2. Real user subtitle file (we can use the same demo or create a new one to simulate)
  // Let's create a small real user subtitle file to test.
  const realUserSrt = `1
00:00:01,000 --> 00:00:04,000
我希望那家饭馆不用排队。

2
00:00:04,500 --> 00:00:07,500
走吧，我已经饿了。

3
00:00:08,000 --> 00:00:11,000
如果人太多，我们也可以先去附近走一走。

4
00:00:11,500 --> 00:00:14,000
我觉得这个办法可以。
`;
  fs.writeFileSync('data/real_user.srt', realUserSrt);
  await runAudit('data/real_user.srt', lexiconUrl);
}

main().catch(console.error);
