/**
 * PURPOSE: DOM-based subtitle rendering.
 * WHY THIS EXISTS: Transforms tokens into interactive UI elements.
 * CONTRACT:
 *   - Input: Subtitle object.
 *   - Output: HTML string or DOM nodes.
 */

import { tokenTrie } from './tokenTrie.ts';
import { Subtitle } from './state.ts';

export function renderSubtitleRow(subtitle: Subtitle, savedWords: Set<string>, extraClass: string = ''): string {
  const tokens = tokenTrie.segment(subtitle.text);
  
  return `
    <div class="subtitle-row ${extraClass}" data-id="${subtitle.id}" data-start="${subtitle.start}">
      ${tokens.map(token => {
        const isSaved = savedWords.has(token) ? 'saved' : '';
        return `<span class="token ${isSaved}" data-token="${token}">${token}</span>`;
      }).join('')}
    </div>
  `;
}
