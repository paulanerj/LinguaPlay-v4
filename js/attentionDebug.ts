/**
 * PURPOSE: Attention Engine Debug Overlay.
 * WHY THIS EXISTS: Provides transparency into the target selection process.
 */

import { stateManager } from './state.ts';
import { GravitySystem } from '../engine/GravitySystem.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';
import { BonusMaskSystem } from '../engine/BonusMaskSystem.ts';
import { attentionEngine } from './attentionEngine.ts';

let isDebugVisible = false;
let debugOverlay: HTMLElement | null = null;

export function initAttentionDebug() {
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
      isDebugVisible = !isDebugVisible;
      updateDebugOverlay();
    }
  });

  stateManager.subscribe(() => {
    if (isDebugVisible) {
      updateDebugOverlay();
    }
  });
}

function updateDebugOverlay() {
  if (!isDebugVisible) {
    if (debugOverlay) {
      debugOverlay.classList.add('hidden');
    }
    document.querySelectorAll('.token.dev-stack').forEach(el => el.classList.remove('dev-stack'));
    return;
  }

  if (!debugOverlay) {
    debugOverlay = document.createElement('div');
    debugOverlay.id = 'attention-debug-overlay';
    debugOverlay.className = 'fixed bottom-4 left-4 z-[100] bg-slate-900/95 border border-accent-primary/50 rounded-xl p-4 text-[10px] font-mono text-white shadow-2xl max-w-md pointer-events-none';
    document.body.appendChild(debugOverlay);
  }

  debugOverlay.classList.remove('hidden');

  const state = stateManager.getState();
  const subDisplay = document.getElementById('subtitle-display');
  const transcriptPanel = document.getElementById('transcript-panel');
  
  // Update all tokens with dev-stack info
  document.querySelectorAll('.token').forEach(el => {
    const token = el.getAttribute('data-token');
    if (!token) return;

    el.classList.add('dev-stack');
    const heatClass = Array.from(el.classList).find(c => c.startsWith('heat-'))?.replace('heat-', '') || '';
    const isAttention = el.classList.contains('attention-target') ? 'attention' : '';
    const isSelected = el.classList.contains('active') ? 'selected' : '';
    const isSaved = el.classList.contains('saved') ? 'saved' : '';
    
    const stack = [isSelected, isAttention, isSaved, heatClass].filter(Boolean).join('+');
    el.setAttribute('data-stack', stack);
  });

  const activeRow = subDisplay?.querySelector('.overlay-active') || transcriptPanel?.querySelector('.transcript-row.active');
  
  if (!activeRow) {
    debugOverlay.innerHTML = '<div class="opacity-50">No active subtitle row.</div>';
    return;
  }

  const tokenEls = Array.from(activeRow.querySelectorAll('.token')) as HTMLElement[];
  const tokens = tokenEls.map(el => el.getAttribute('data-token') || '');
  
  const trace = GravitySystem.getDecisionTrace(
    tokens,
    state.savedWords,
    attentionEngine.getReviewedInCycle(),
    attentionEngine.getReviewedInSession(),
    dictionaryEngine
  );

  const tokenRows = tokens.map(t => {
    const res = dictionaryEngine.getEntry(t);
    const level = BonusMaskSystem.classify(t, state.savedWords, dictionaryEngine);
    const isReviewedCycle = attentionEngine.getReviewedInCycle().has(t);
    const isReviewedSession = attentionEngine.getReviewedInSession().has(t);
    
    return `
      <div class="grid grid-cols-4 gap-2 border-b border-white/5 py-1 ${trace.chosenToken === t ? 'bg-accent-primary/20 text-accent-primary' : ''}">
        <div class="truncate font-bold">${t}</div>
        <div>${level}</div>
        <div>${res.truthStatus}</div>
        <div>${isReviewedCycle ? 'Cycle' : (isReviewedSession ? 'Session' : 'No')}</div>
      </div>
    `;
  }).join('');

  debugOverlay.innerHTML = `
    <div class="mb-2 text-accent-primary font-bold border-b border-accent-primary/30 pb-1">ATTENTION DEBUG MODE</div>
    
    <div class="mb-3">
      <div class="opacity-50 mb-1 uppercase tracking-widest">Current Row Tokens:</div>
      <div class="grid grid-cols-4 gap-2 border-b border-white/10 pb-1 opacity-40 font-bold">
        <div>Token</div>
        <div>Band</div>
        <div>Status</div>
        <div>Rev</div>
      </div>
      <div class="max-h-40 overflow-y-auto">
        ${tokenRows}
      </div>
    </div>

    <div class="mb-3">
      <div class="opacity-50 mb-1 uppercase tracking-widest">Decision Path:</div>
      <div class="flex gap-1 items-center">
        ${['unknown', 'rare', 'mid', 'common'].map(l => `
          <span class="${trace.evaluatedLevels.includes(l) ? 'text-white' : 'opacity-20'} ${trace.reason?.includes(l) ? 'text-accent-primary font-bold underline' : ''}">${l}</span>
          ${l !== 'common' ? '<span class="opacity-20">></span>' : ''}
        `).join('')}
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <div class="opacity-50 mb-1 uppercase tracking-widest">Selected Level:</div>
        <div class="text-accent-primary font-bold">${trace.reason || 'None'}</div>
      </div>
      <div>
        <div class="opacity-50 mb-1 uppercase tracking-widest">Chosen Token:</div>
        <div class="text-accent-primary font-bold">${trace.chosenToken || 'None'}</div>
      </div>
    </div>

    ${trace.skippedTokens.length > 0 ? `
      <div class="mt-3 pt-2 border-t border-white/10">
        <div class="opacity-50 mb-1 uppercase tracking-widest">Skipped (Already Reviewed):</div>
        <div class="flex flex-wrap gap-1">
          ${trace.skippedTokens.map(t => `<span class="bg-white/5 px-1 rounded opacity-60">${t}</span>`).join('')}
        </div>
      </div>
    ` : ''}
  `;
}
