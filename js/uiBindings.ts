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
import { parseSRT } from './subtitleParser.ts';

export function initUI() {
  const video = document.querySelector('video') as HTMLVideoElement;
  const subDisplay = document.getElementById('subtitle-display')!;
  const transcriptPanel = document.getElementById('transcript-panel')!;
  const focusPanel = document.getElementById('focus-panel')!;
  const tooltip = document.getElementById('quick-preview-tooltip')!;
  const loadStatus = document.getElementById('load-status')!;

  const inputVideo = document.getElementById('input-video') as HTMLInputElement;
  const inputSRT = document.getElementById('input-srt') as HTMLInputElement;
  const btnLoadVideo = document.getElementById('btn-load-video')!;
  const btnLoadSRT = document.getElementById('btn-load-srt')!;
  const btnLoadDemo = document.getElementById('btn-load-demo')!;

  let transcriptRendered = false;
  let lastActiveId: number | null = null;
  let lastSelectedToken: string | null = null;
  let lastSavedWordsRef: Set<string> | null = null;
  let lastAttentionTarget: string | null = null;

  function updateAttentionTarget() {
    const state = stateManager.getState();
    console.log(`[AttentionSignal] Subtitle Change/Update: ${state.activeSubtitleId}`);
    
    if (state.activeSubtitleId === null) {
      lastAttentionTarget = null;
      document.querySelectorAll('.token.attention-target').forEach(el => el.classList.remove('attention-target'));
      return;
    }

    // Find tokens in the active row (overlay or transcript)
    const activeRow = subDisplay.querySelector('.overlay-active') || transcriptPanel.querySelector('.transcript-row.active');
    if (!activeRow) {
      console.log(`[AttentionSignal] No active row found for target extraction.`);
      return;
    }

    const tokenEls = Array.from(activeRow.querySelectorAll('.token')) as HTMLElement[];
    const tokens = tokenEls.map(el => el.getAttribute('data-token') || '');
    console.log(`[AttentionSignal] Tokens extracted: ${tokens.join(', ')}`);
    
    lastAttentionTarget = attentionEngine.getNextTargetToken(tokens, state.savedWords);
    console.log(`[AttentionSignal] Attention target selected: ${lastAttentionTarget}`);
    
    // Remove existing target class
    document.querySelectorAll('.token.attention-target').forEach(el => el.classList.remove('attention-target'));
    
    if (lastAttentionTarget) {
      // Add to all instances of this token in active contexts
      document.querySelectorAll(`.token[data-token="${lastAttentionTarget}"]`).forEach(el => {
        const row = el.closest('.subtitle-row');
        if (row && (row.classList.contains('overlay-active') || row.classList.contains('active'))) {
          el.classList.add('attention-target');
        }
      });
      console.log(`[AttentionSignal] DOM highlight applied to: ${lastAttentionTarget}`);
    }
  }

  function renderFocusPanel() {
    const state = stateManager.getState();
    const token = state.selectedToken || lastAttentionTarget;
    const isSuggested = !state.selectedToken && !!lastAttentionTarget;

    if (!token) {
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
      return;
    }

    const entry = dictionaryEngine.getEntry(token);
    const isSaved = state.savedWords.has(token);
    const heatLabel = getHeatLabel(token, state.savedWords);
    
    // Find examples (limit to 5 for performance)
    const examples = state.subtitles.filter(s => s.text.includes(token)).slice(0, 5);
    const examplesHtml = examples.map(s => renderSubtitleRow(s, state.savedWords, 'example-row')).join('');

    focusPanel.innerHTML = `
      ${isSuggested ? '<div class="text-[10px] uppercase tracking-widest text-accent-primary mb-1 font-bold opacity-80 animate-pulse">Suggested Focus</div>' : ''}
      <div class="flex justify-between items-start mb-4">
        <h2 class="text-3xl font-bold text-accent-primary">${token}</h2>
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
    console.log(`[AttentionSignal] Focus panel synced for: ${token} (Suggested: ${isSuggested})`);
  }

  function updateLoadStatus(msg: string) {
    loadStatus.textContent = msg;
  }

  function resetContentState() {
    attentionEngine.resetAttentionCycle();
    stateManager.setState({
      activeSubtitleId: null,
      selectedToken: null,
      currentTime: 0
    });
    transcriptRendered = false;
    lastActiveId = null;
    lastSelectedToken = null;
    lastAttentionTarget = null;
    
    // Clear DOM
    subDisplay.innerHTML = '';
    transcriptPanel.innerHTML = '';
    document.querySelectorAll('.token.attention-target').forEach(el => el.classList.remove('attention-target'));
    renderFocusPanel();
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
    if (state.selectedToken !== lastSelectedToken || state.savedWords !== lastSavedWordsRef || true) {
      lastSelectedToken = state.selectedToken;
      lastSavedWordsRef = state.savedWords;

      renderFocusPanel();

      // Visual feedback for selected token - Apply AFTER rendering panels
      document.querySelectorAll('.token.active').forEach(el => el.classList.remove('active'));
      if (state.selectedToken) {
        document.querySelectorAll(`.token[data-token="${state.selectedToken}"]`).forEach(el => el.classList.add('active'));
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
        // Update target BEFORE state change so subscription sees it
        updateAttentionTarget();
        stateManager.setState({ selectedToken: token });
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
  
  // Local Content Loading Listeners
  btnLoadVideo.addEventListener('click', () => inputVideo.click());
  btnLoadSRT.addEventListener('click', () => inputSRT.click());
  
  btnLoadDemo.addEventListener('click', () => {
    const demoSRT = `
1
00:00:01,000 --> 00:00:04,000
你好，欢迎来到LinguaPlay。

2
00:00:05,000 --> 00:00:08,000
我们一起学习中文。
    `;
    if (video.src.startsWith('blob:')) {
      URL.revokeObjectURL(video.src);
    }
    video.src = "https://www.w3schools.com/html/mov_bbb.mp4";
    video.load();
    
    const subs = parseSRT(demoSRT);
    resetContentState();
    stateManager.setState({ subtitles: subs, videoLoaded: true });
    updateLoadStatus("Demo Mode Active");
  });

  inputVideo.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      if (video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src);
      }
      const url = URL.createObjectURL(file);
      video.src = url;
      video.load();
      stateManager.setState({ videoLoaded: true });
      updateLoadStatus(`Video: ${file.name}`);
    }
  });

  inputSRT.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        try {
          const subs = parseSRT(text);
          if (subs.length === 0) throw new Error("Empty subtitle set");
          resetContentState();
          stateManager.setState({ subtitles: subs });
          updateLoadStatus(`SRT: ${file.name}`);
        } catch (err) {
          updateLoadStatus(`Parse Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      };
      reader.readAsText(file);
    }
  });

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
