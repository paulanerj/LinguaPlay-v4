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
  
  let unknownCount = 0;
  let rareCount = 0;
  let totalLexical = 0;

  const tokenHtml = tokens.map(token => {
    const isSaved = savedWords.has(token) ? 'saved' : '';
    const heatClass = getHeatClass(token, savedWords);
    const result = dictionaryEngine.getEntry(token);
    const truthClass = `truth-${result.truthStatus.toLowerCase().replace('_', '-')}`;
    
    if (result.truthStatus !== 'NON_LEXICAL') {
      totalLexical++;
      if (heatClass === 'heat-unknown') unknownCount++;
      if (heatClass === 'heat-rare') rareCount++;
    }

    // Task 4: data-stack (will be updated dynamically in uiBindings for attention/selected)
    const stack = `${heatClass.replace('heat-', '')}`;
    
    return `<span class="token ${isSaved} ${heatClass} ${truthClass}" data-token="${token}" data-stack="${stack}">${token}</span>`;
  }).join('');

  let rowHeatClass = '';
  if (totalLexical > 0) {
    const difficultyScore = (unknownCount * 2 + rareCount) / totalLexical;
    if (difficultyScore > 0.5) rowHeatClass = 'border-l-4 border-red-500/50';
    else if (difficultyScore > 0.2) rowHeatClass = 'border-l-4 border-orange-500/50';
    else if (difficultyScore > 0) rowHeatClass = 'border-l-4 border-yellow-500/50';
    else rowHeatClass = 'border-l-4 border-green-500/50';
  }

  return `
    <div class="subtitle-row ${extraClass} ${rowHeatClass}" data-id="${subtitle.id}" data-start="${subtitle.start}">
      ${tokenHtml}
    </div>
  `;
}
