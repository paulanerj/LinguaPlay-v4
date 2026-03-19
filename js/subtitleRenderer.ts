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
  
  return `
    <div class="subtitle-row ${extraClass}" data-id="${subtitle.id}" data-start="${subtitle.start}">
      ${tokens.map(token => {
        const isSaved = savedWords.has(token) ? 'saved' : '';
        const heatClass = getHeatClass(token, savedWords);
        const result = dictionaryEngine.getEntry(token);
        const truthClass = `truth-${result.truthStatus.toLowerCase().replace('_', '-')}`;
        
        // Task 4: data-stack (will be updated dynamically in uiBindings for attention/selected)
        const stack = `${heatClass.replace('heat-', '')}`;
        
        return `<span class="token ${isSaved} ${heatClass} ${truthClass}" data-token="${token}" data-stack="${stack}">${token}</span>`;
      }).join('')}
    </div>
  `;
}
