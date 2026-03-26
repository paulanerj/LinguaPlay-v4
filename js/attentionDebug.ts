/**
 * PURPOSE: Attention Engine Debug Overlay.
 * WHY THIS EXISTS: Provides transparency into the target selection process.
 */

import { stateManager } from './state.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';
import { classifyToken } from './frequencyHeatmap.ts';
import { attentionEngine } from './attentionEngine.ts';
import { cognitiveInference } from './cognitiveInference.ts';
import { reinforcementPlanner } from './reinforcementPlanner.ts';
import { inferenceDebug } from './inferenceDebug.ts';
import { formatOrchestrationDecision, formatReviewQueuePreview } from './orchestrationDebug.ts';

let debugOverlay: HTMLElement | null = null;
let cognitiveDebugOverlay: HTMLElement | null = null;

export function initAttentionDebug() {
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
      const current = stateManager.getState().debugEnabled;
      stateManager.setState({ debugEnabled: !current });
    }
    if (e.key.toLowerCase() === 'c') {
      const current = stateManager.getState().cognitiveDebugEnabled;
      stateManager.setState({ cognitiveDebugEnabled: !current });
    }
  });

  stateManager.subscribe((state) => {
    if (state.debugEnabled) {
      updateDebugOverlay();
    } else {
      if (debugOverlay) {
        debugOverlay.classList.add('hidden');
      }
      document.querySelectorAll('.token.dev-stack').forEach(el => el.classList.remove('dev-stack'));
    }

    if (state.cognitiveDebugEnabled) {
      updateCognitiveDebugOverlay();
    } else {
      if (cognitiveDebugOverlay) {
        cognitiveDebugOverlay.classList.add('hidden');
      }
    }
  });
}

function updateCognitiveDebugOverlay() {
  const state = stateManager.getState();
  if (!state.cognitiveDebugEnabled) return;

  if (!cognitiveDebugOverlay) {
    cognitiveDebugOverlay = document.createElement('div');
    cognitiveDebugOverlay.id = 'cognitive-debug-overlay';
    cognitiveDebugOverlay.className = 'fixed top-4 right-4 z-[100] bg-slate-900/95 border border-accent-secondary/50 rounded-xl p-4 text-[10px] font-mono text-white shadow-2xl max-w-md pointer-events-none overflow-y-auto max-h-[90vh]';
    document.body.appendChild(cognitiveDebugOverlay);
  }

  cognitiveDebugOverlay.classList.remove('hidden');

  let content = `
    <div class="mb-2 text-accent-secondary font-bold border-b border-accent-secondary/30 pb-1 flex justify-between">
      <span>COGNITIVE DEBUG MODE</span>
    </div>
  `;

  if (state.activeOrchestrationDecision) {
    content += formatOrchestrationDecision(state.activeOrchestrationDecision);
  }

  if (state.reviewQueuePreview) {
    content += formatReviewQueuePreview(state.reviewQueuePreview);
  }

  if (state.activeCognitiveAttentionAdvice) {
    const advice = state.activeCognitiveAttentionAdvice;
    content += `
      <div class="mb-4 bg-slate-800/50 p-2 rounded border border-white/10">
        <div class="text-accent-secondary font-bold mb-1">ATTENTION ADVICE</div>
        <div class="grid grid-cols-2 gap-2">
          <div><span class="opacity-50">Baseline:</span> ${advice.baselineTarget || 'None'}</div>
          <div><span class="opacity-50">Advised:</span> <span class="${advice.shouldOverride ? 'text-accent-primary font-bold' : ''}">${advice.advisedTarget || 'None'}</span></div>
        </div>
        ${advice.shouldOverride ? `<div class="mt-1 text-accent-primary">Override: ${advice.reasonCode}</div>` : ''}
      </div>
    `;
  }

  if (state.activeSubtitleCognitivePriority) {
    const priority = state.activeSubtitleCognitivePriority;
    content += `
      <div class="mb-4 bg-slate-800/50 p-2 rounded border border-white/10">
        <div class="text-accent-secondary font-bold mb-1">SUBTITLE PRIORITY</div>
        <div class="flex justify-between mb-1">
          <span>Score: <span class="text-accent-primary font-bold">${priority.priorityScore.toFixed(1)}</span></span>
          <span class="opacity-50">Top: ${priority.topTokens.slice(0, 3).join(', ')}</span>
        </div>
        <div class="text-[8px] opacity-70">
          ${priority.rationale.map(r => `<div>• ${r}</div>`).join('')}
        </div>
      </div>
    `;
  }

  if (state.topReviewCandidates && state.topReviewCandidates.length > 0) {
    content += `
      <div class="mb-4 bg-slate-800/50 p-2 rounded border border-white/10">
        <div class="text-accent-secondary font-bold mb-1">REVIEW PLANNER (TOP 3)</div>
        ${state.topReviewCandidates.slice(0, 3).map(c => `
          <div class="border-b border-white/5 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
            <div class="flex justify-between">
              <span>Sub #${c.subtitleId}</span>
              <span class="text-accent-primary font-bold">${c.priorityScore.toFixed(1)}</span>
            </div>
            <div class="text-[8px] opacity-70">Tokens: ${c.topTokens.slice(0, 3).join(', ')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (state.selectedToken) {
    const now = Date.now();
    const profile = cognitiveInference.deriveTokenProfile(state.selectedToken, now);
    content += inferenceDebug.formatProfile(profile);
  } else {
    content += `<div class="opacity-50 mb-4">Select a token to view its cognitive profile.</div>`;
  }

  const now = Date.now();
  const allProfiles = cognitiveInference.deriveAllProfiles(now);
  const candidates = reinforcementPlanner.planReinforcement(allProfiles);
  
  content += `<div class="mt-4 border-t border-white/10 pt-4">`;
  content += inferenceDebug.formatCandidates(candidates.slice(0, 10)); // Top 10
  content += `</div>`;

  cognitiveDebugOverlay.innerHTML = content;
}

function updateDebugOverlay() {
  const state = stateManager.getState();
  if (!state.debugEnabled) return;

  if (!debugOverlay) {
    debugOverlay = document.createElement('div');
    debugOverlay.id = 'attention-debug-overlay';
    debugOverlay.className = 'fixed bottom-4 left-4 z-[100] bg-slate-900/95 border border-accent-primary/50 rounded-xl p-4 text-[10px] font-mono text-white shadow-2xl max-w-md pointer-events-none';
    document.body.appendChild(debugOverlay);
  }

  debugOverlay.classList.remove('hidden');

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
  
  const trace = attentionEngine.getDecisionTrace(
    tokens,
    state.savedWords
  );

  const tokenRows = tokens.map(t => {
    const res = dictionaryEngine.getEntry(t);
    const level = classifyToken(t, state.savedWords);
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
    <div class="mb-2 text-accent-primary font-bold border-b border-accent-primary/30 pb-1 flex justify-between">
      <span>ATTENTION DEBUG MODE</span>
      <span class="opacity-50 text-[8px]">${state.lexiconMode || 'UNKNOWN'}</span>
    </div>
    
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
