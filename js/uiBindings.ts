/**
 * PURPOSE: UI Event Bindings and DOM manipulation.
 * WHY THIS EXISTS: Connects user interactions to the state and engine.
 */

import { stateManager } from './state.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';
import { renderSubtitleRow } from './subtitleRenderer.ts';
import { syncSubtitles } from './subtitleSync.ts';
import { getHeatLabel } from './frequencyHeatmap.ts';
import { attentionEngine } from './attentionEngine.ts';

export function initUI() {
  const video = document.querySelector('video') as HTMLVideoElement;
  const subDisplay = document.getElementById('subtitle-display')!;
  const transcriptPanel = document.getElementById('transcript-panel')!;
  const focusPanel = document.getElementById('focus-panel')!;
  const tooltip = document.getElementById('quick-preview-tooltip')!;

  let transcriptRendered = false;
  let lastActiveId: number | null = null;
  let lastSelectedToken: string | null = null;
  let lastSavedWordsRef: Set<string> | null = null;
  let lastAttentionTarget: string | null = null;

  function updateAttentionTarget() {
    const state = stateManager.getState();
    if (state.activeSubtitleId === null) {
      lastAttentionTarget = null;
      return;
    }

    const activeRow = subDisplay.querySelector('.overlay-active');
    if (!activeRow) return;

    const tokenEls = Array.from(activeRow.querySelectorAll('.token')) as HTMLElement[];
    const tokens = tokenEls.map(el => el.getAttribute('data-token') || '');
    
    lastAttentionTarget = attentionEngine.getNextTargetToken(tokens, state.savedWords);
    
    // Remove existing target class
    document.querySelectorAll('.token.attention-target').forEach(el => el.classList.remove('attention-target'));
    
    if (lastAttentionTarget) {
      // Add to all instances of this token in the active row
      activeRow.querySelectorAll(`.token[data-token="${lastAttentionTarget}"]`).forEach(el => {
        el.classList.add('attention-target');
      });
    }
  }

  // Video Time Update
  video.addEventListener('timeupdate', () => {
    const currentTime = video.currentTime;
    stateManager.setState({ currentTime });
    syncSubtitles(currentTime);
  });

  // State Subscription for Rendering
  stateManager.subscribe((state) => {
    // Update Lexicon Status
    const statusEl = document.getElementById('status-lexicon');
    if (statusEl) {
      statusEl.textContent = state.lexiconLoaded ? 'Lexicon: Ready' : 'Lexicon: Loading...';
      statusEl.classList.toggle('text-green-400', state.lexiconLoaded);
    }

    // 1. Render Transcript Once
    if (!transcriptRendered && state.subtitles.length > 0) {
      transcriptPanel.innerHTML = state.subtitles.map(s => renderSubtitleRow(s, state.savedWords, 'transcript-row')).join('');
      transcriptRendered = true;
    }

    // 2. Handle Active Subtitle Change (Multi-line Overlay + Transcript Scroll)
    if (state.activeSubtitleId !== lastActiveId) {
      lastActiveId = state.activeSubtitleId;
      
      if (state.activeSubtitleId !== null) {
        const activeIdx = state.subtitles.findIndex(s => s.id === state.activeSubtitleId);
        const startIdx = Math.max(0, activeIdx - 2);
        const visibleSubs = state.subtitles.slice(startIdx, activeIdx + 1);
        
        subDisplay.innerHTML = visibleSubs.map((s, i) => {
          const isLast = i === visibleSubs.length - 1;
          return renderSubtitleRow(s, state.savedWords, isLast ? 'overlay-active' : 'overlay-past');
        }).join('');
        subDisplay.classList.remove('hidden');

        // Transcript highlight & scroll
        document.querySelectorAll('.transcript-row.active').forEach(el => el.classList.remove('active'));
        const activeRow = transcriptPanel.querySelector(`.transcript-row[data-id="${state.activeSubtitleId}"]`);
        if (activeRow) {
          activeRow.classList.add('active');
          activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Attention Engine Integration
        attentionEngine.resetAttentionCycle();
        updateAttentionTarget();
      } else {
        subDisplay.innerHTML = '';
        subDisplay.classList.add('hidden');
        document.querySelectorAll('.transcript-row.active').forEach(el => el.classList.remove('active'));
      }
    }

    // 3. Handle Focus Panel & Example Sandbox
    if (state.selectedToken !== lastSelectedToken || state.savedWords !== lastSavedWordsRef) {
      // Visual feedback for selected token
      if (state.selectedToken !== lastSelectedToken) {
        document.querySelectorAll('.token.active').forEach(el => el.classList.remove('active'));
        if (state.selectedToken) {
          document.querySelectorAll(`.token[data-token="${state.selectedToken}"]`).forEach(el => el.classList.add('active'));
        }
      }

      lastSelectedToken = state.selectedToken;
      lastSavedWordsRef = state.savedWords;

      if (state.selectedToken) {
        const entry = dictionaryEngine.getEntry(state.selectedToken);
        const isSaved = state.savedWords.has(state.selectedToken);
        const heatLabel = getHeatLabel(state.selectedToken, state.savedWords);
        const isSuggested = state.selectedToken === lastAttentionTarget;
        
        // Find examples (limit to 5 for performance)
        const examples = state.subtitles.filter(s => s.text.includes(state.selectedToken!)).slice(0, 5);
        const examplesHtml = examples.map(s => renderSubtitleRow(s, state.savedWords, 'example-row')).join('');

        focusPanel.innerHTML = `
          ${isSuggested ? '<div class="text-[10px] uppercase tracking-widest text-accent-primary mb-1 font-bold opacity-80">Suggested Focus</div>' : ''}
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-3xl font-bold text-accent-primary">${state.selectedToken}</h2>
            <button id="btn-save-word" class="save-btn ${isSaved ? 'saved' : ''}">
              ${isSaved ? '★ Saved' : '☆ Save'}
            </button>
          </div>
          <div class="mb-6">
            <p class="text-xl italic opacity-80">${entry?.pinyin || 'pinyin'}</p>
            <p class="text-lg mt-2">${entry?.meaning || 'Meaning not found in current lexicon.'}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-sm mb-4">
            <div class="bg-slate-800 p-2 rounded border border-slate-700">
              <span class="opacity-50">Difficulty:</span> 
              <span class="font-semibold text-accent-primary">${heatLabel}</span>
            </div>
            <div class="bg-slate-800 p-2 rounded border border-slate-700 opacity-50">
              <span>Freq Rank:</span> --
            </div>
            <div class="bg-slate-800 p-2 rounded border border-slate-700 opacity-50">
              <span>HSK Level:</span> --
            </div>
          </div>

          <!-- Heatmap Legend -->
          <div class="mb-8 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
            <h4 class="text-xs uppercase tracking-wider opacity-40 mb-2 font-bold">Difficulty Guide</h4>
            <div class="flex flex-wrap gap-2 text-[10px]">
              <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-400"></span> Known</div>
              <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-400"></span> Common</div>
              <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-yellow-400"></span> Mid</div>
              <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-500"></span> Rare</div>
              <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500"></span> Unknown</div>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-3 border-b border-slate-700 pb-1">Example Sandbox</h3>
            <div class="flex flex-col gap-2">
              ${examplesHtml}
            </div>
          </div>
        `;
      } else {
        focusPanel.innerHTML = `
          <div class="flex h-full flex-col items-center justify-center opacity-30 text-center gap-4">
            <p>Select a token to view details and examples.</p>
            <div class="w-full max-w-[200px] p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-left">
              <h4 class="text-xs uppercase tracking-wider opacity-40 mb-2 font-bold">Difficulty Guide</h4>
              <div class="flex flex-col gap-1 text-[10px]">
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span> Known (Saved)</div>
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-blue-400"></span> Common (Basic)</div>
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-yellow-400"></span> Medium (Short)</div>
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-orange-500"></span> Rare (Long)</div>
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-500"></span> Unknown</div>
              </div>
            </div>
          </div>
        `;
      }
    }
  });

  // Global Event Delegation (Clicks)
  document.body.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Token Click
    if (target.classList.contains('token')) {
      const token = target.getAttribute('data-token');
      if (token) {
        attentionEngine.markTokenReviewed(token);
        stateManager.setState({ selectedToken: token });
        updateAttentionTarget();
      }
      return;
    }

    // Transcript / Example Row Click (Seek)
    const row = target.closest('.subtitle-row') as HTMLElement;
    if (row && (row.classList.contains('transcript-row') || row.classList.contains('example-row'))) {
      const start = parseFloat(row.getAttribute('data-start') || '0');
      video.currentTime = start;
      // Removed video.play() to respect current playback state
      return;
    }

    // Save Button Click
    if (target.id === 'btn-save-word') {
      const state = stateManager.getState();
      if (state.selectedToken) {
        const newSaved = new Set(state.savedWords);
        if (newSaved.has(state.selectedToken)) {
          newSaved.delete(state.selectedToken);
        } else {
          newSaved.add(state.selectedToken);
        }
        stateManager.setState({ savedWords: newSaved });
        
        // Efficient DOM update for saved tokens across the app
        document.querySelectorAll(`.token[data-token="${state.selectedToken}"]`).forEach(el => {
          el.classList.toggle('saved', newSaved.has(state.selectedToken!));
        });
      }
      return;
    }
  });

  // Tooltip Logic
  let tooltipTimeout: ReturnType<typeof setTimeout>;

  const showTooltip = (target: HTMLElement) => {
    const token = target.getAttribute('data-token')!;
    const entry = dictionaryEngine.getEntry(token);
    
    if (entry) {
      tooltip.innerHTML = `<div class="font-bold">${entry.pinyin}</div><div class="text-xs opacity-80">${entry.meaning}</div>`;
      const rect = target.getBoundingClientRect();
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.top}px`;
      tooltip.classList.remove('hidden');
    }
  };

  const hideTooltip = () => {
    clearTimeout(tooltipTimeout);
    tooltip.classList.add('hidden');
  };

  // Quick Preview Tooltip (Hover Delegation)
  document.body.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('token')) {
      clearTimeout(tooltipTimeout);
      showTooltip(target);
    }
  });

  document.body.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('token')) {
      tooltipTimeout = setTimeout(hideTooltip, 100);
    }
  });

  // Mobile Token Preview Fallback (Long-press / Tap-hold)
  let touchTimeout: ReturnType<typeof setTimeout>;
  
  document.body.addEventListener('touchstart', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('token')) {
      clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => {
        showTooltip(target);
      }, 400); // 400ms long-press
    }
  }, { passive: true });

  document.body.addEventListener('touchend', () => {
    clearTimeout(touchTimeout);
    tooltipTimeout = setTimeout(hideTooltip, 1500); // Hide after a delay on mobile
  });

  document.body.addEventListener('touchmove', () => {
    clearTimeout(touchTimeout);
    hideTooltip();
  }, { passive: true });
}
