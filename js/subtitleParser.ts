/**
 * PURPOSE: SRT Subtitle Parsing.
 * WHY THIS EXISTS: Converts raw SRT text into structured Subtitle objects.
 * FROZEN: parseSRT logic.
 * CONTRACT:
 *   - Input: Raw SRT string.
 *   - Output: Array of Subtitle objects.
 */

import { Subtitle } from './state.ts';

export function parseSRT(data: string): Subtitle[] {
  const subs: Subtitle[] = [];
  const blocks = data.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const id = parseInt(lines[0]);
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch) {
        const start = timeToSeconds(timeMatch[1]);
        const end = timeToSeconds(timeMatch[2]);
        const text = lines.slice(2).join(' ');
        
        subs.push({ id, start, end, text });
      }
    }
  }
  return subs;
}

function timeToSeconds(timeStr: string): number {
  const [hms, ms] = timeStr.split(',');
  const [h, m, s] = hms.split(':').map(parseFloat);
  return h * 3600 + m * 60 + s + parseFloat(ms) / 1000;
}
