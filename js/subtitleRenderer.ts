/**
 * PURPOSE: DOM-based subtitle rendering.
 * WHY THIS EXISTS: Transforms tokens into interactive UI elements.
 * CONTRACT:
 *   - Input: Subtitle object.
 *   - Output: HTML string or DOM nodes.
 */

import { tokenTrie } from './tokenTrie.ts';
import { Subtitle } from './state.ts';
import { segmentationPostProcessor } from './segmentationPostProcessor.ts';
import { getHeatClass } from './frequencyHeatmap.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';

export function renderSubtitleRow(subtitle: Subtitle, savedWords: Set<string>, extraClass: string = ''): string {
  const rawTokens = tokenTrie.segment(subtitle.text);
  const tokens = segmentationPostProcessor.process(rawTokens);
  
  // Tokenization Trace
  console.log(`[Subtitle] raw line: ${subtitle.text}`);
  console.log(`[Tokenizer] produced tokens:\n${tokens.join('\n')}`);
  
  let unknownCount = 0;
  let rareCount = 0;
  let totalLexical = 0;

  const tokenHtml = tokens.map(token => {
    const isSaved = savedWords.has(token) ? 'saved' : '';
    const result = dictionaryEngine.getEntry(token);
    let heatClass = getHeatClass(token, savedWords);
    const truthClass = `truth-${result.truthStatus.toLowerCase().replace('_', '-')}`;
    
    if (result.entry?.hsk === 1) heatClass = 'heat-hsk1';
    else if (result.entry?.hsk === 2) heatClass = 'heat-hsk2';
    else if (result.entry?.hsk === 3) heatClass = 'heat-hsk3';
    else if (result.entry?.hsk && result.entry.hsk >= 4) heatClass = 'heat-hsk4';
    else if (!result.entry && result.truthStatus === 'MISSING') heatClass = 'heat-unknown';
    
    if (result.truthStatus !== 'NON_LEXICAL') {
      totalLexical++;
      if (heatClass === 'heat-unknown') unknownCount++;
      if (heatClass === 'heat-rare') rareCount++;
    }

    const stack = `${heatClass.replace('heat-', '')}`;
    const pinyin = result.entry?.pinyin || '';
    const isPhrase = token.length > 1 ? 'phrase' : '';
    const hskTag = result.entry?.hsk ? `<span class="text-[0.4em] opacity-50 ml-0.5 align-top">(HSK${result.entry.hsk})</span>` : '';
    const freqTag = result.entry?.frequencyBand ? `<span class="text-[0.4em] opacity-50 ml-0.5 align-top">(${result.entry.frequencyBand})</span>` : '';
    const tags = hskTag + freqTag;
    
    return `
      <span class="token-container inline-flex flex-col items-center">
        <span class="pinyin text-[0.6em] opacity-0 group-hover:opacity-80 transition-opacity leading-none mb-1">${pinyin}</span>
        <span class="token ${isSaved} ${heatClass} ${truthClass} ${isPhrase}" data-token="${token}" data-stack="${stack}">${token}${tags}</span>
      </span>
    `;
  }).join('');

  let rowHeatClass = '';
  if (totalLexical > 0) {
    const difficultyScore = (unknownCount * 2 + rareCount) / totalLexical;
    if (difficultyScore > 0.5) rowHeatClass = 'border-l-4 border-red-500/50';
    else if (difficultyScore > 0.2) rowHeatClass = 'border-l-4 border-orange-500/50';
    else if (difficultyScore > 0) rowHeatClass = 'border-l-4 border-yellow-500/50';
    else rowHeatClass = 'border-l-4 border-green-500/50';
  }

  // Generate a full line pinyin for the row (used in transcript)
  const fullPinyin = tokens.map(t => dictionaryEngine.getEntry(t).entry?.pinyin || '').join(' ');

  const isOverlay = extraClass.includes('overlay-active');
  const justifyClass = isOverlay ? 'justify-center' : 'justify-start';
  const textClass = isOverlay ? 'text-center' : 'text-left';
  const replayBtnHtml = isOverlay ? '' : `<button class="replay-btn text-slate-500 hover:text-accent-primary transition-colors mt-1 shrink-0" onclick="event.stopPropagation(); window.replayFrom(${subtitle.start})">▶</button>`;

  return `
    <div class="subtitle-row group ${extraClass} ${rowHeatClass} flex items-start gap-2" data-id="${subtitle.id}" data-start="${subtitle.start}">
      ${replayBtnHtml}
      <div class="flex-1">
        <div class="chinese-line flex flex-wrap ${justifyClass} items-end gap-x-1">
          ${tokenHtml}
        </div>
        <div class="pinyin-line hidden ${textClass} mt-1 opacity-60 font-light italic">${fullPinyin}</div>
      </div>
    </div>
  `;
}
