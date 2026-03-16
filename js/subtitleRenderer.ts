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

export function renderSubtitleRow(subtitle: Subtitle, savedWords: Set<string>, extraClass: string = ''): string {
  const rawTokens = tokenTrie.segment(subtitle.text);
  const tokens = segmentationPostProcessor.process(rawTokens);
  
  return `
    <div class="subtitle-row ${extraClass}" data-id="${subtitle.id}" data-start="${subtitle.start}">
      ${tokens.map(token => {
        const isSaved = savedWords.has(token) ? 'saved' : '';
        const heatClass = getHeatClass(token, savedWords);
        return `<span class="token ${isSaved} ${heatClass}" data-token="${token}">${token}</span>`;
      }).join('')}
    </div>
  `;
}
