/**
 * PURPOSE: UI Event Bindings and DOM manipulation.
 * WHY THIS EXISTS: Connects user interactions to the state and engine.
 */

import { stateManager } from './state.ts';
import { dictionaryEngine } from './dictionaryEngine.ts';
import { renderSubtitleRow } from './subtitleRenderer.ts';
import { syncSubtitles } from './subtitleSync.ts';
import { getHeatLabel, getHSKLevel } from './frequencyHeatmap.ts';
import { attentionEngine } from './attentionEngine.ts';
import { parseSRT } from './subtitleParser.ts';
import { initAttentionDebug } from './attentionDebug.ts';

export function initUI() {
  initAttentionDebug();
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
      const debugLabel = document.getElementById('debug-attention-label');
      if (debugLabel) debugLabel.classList.add('hidden');
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
    
    const debugLabel = document.getElementById('debug-attention-label');
    if (debugLabel) debugLabel.classList.add('hidden');

    if (lastAttentionTarget) {
      // Add to all instances of this token in active contexts
      let firstEl: HTMLElement | null = null;
      document.querySelectorAll(`.token[data-token="${lastAttentionTarget}"]`).forEach(el => {
        const row = el.closest('.subtitle-row');
        if (row && (row.classList.contains('overlay-active') || row.classList.contains('active'))) {
          el.classList.add('attention-target');
          if (state.pedagogicalDemo) {
            el.classList.add('pedagogical-pulse');
          }
          if (!firstEl) firstEl = el as HTMLElement;
        }
      });
      console.log(`[AttentionSignal] DOM highlight applied to: ${lastAttentionTarget}`);

      // Position debug label
      if (firstEl && debugLabel) {
        const rect = firstEl.getBoundingClientRect();
        debugLabel.style.left = `${rect.left}px`;
        debugLabel.style.top = `${rect.top - 25}px`;
        debugLabel.classList.remove('hidden');
      }
    }
  }

  function renderFocusPanel() {
    const state = stateManager.getState();
    const token = state.selectedToken || lastAttentionTarget;
    const isSuggested = !state.selectedToken && !!lastAttentionTarget;

    if (!token) {
      let reasonLabel = '';
      if (lastAttentionTarget) {
        const heatLabel = getHeatLabel(lastAttentionTarget, state.savedWords);
        const reasonMap: Record<string, string> = {
          'unknown': 'New word',
          'rare': 'Rare word',
          'mid': 'Medium familiarity',
          'common': 'Review opportunity'
        };
        reasonLabel = reasonMap[heatLabel.toLowerCase()] || `${heatLabel} difficulty lexical target`;
      }

      focusPanel.innerHTML = `
        <div class="flex h-full flex-col items-center justify-center opacity-30 text-center gap-4">
          ${lastAttentionTarget ? `
            <div class="mb-4 p-4 bg-accent-primary/10 rounded-xl border border-accent-primary/20 animate-pulse">
              <div class="text-[10px] uppercase tracking-widest text-accent-primary mb-1 font-bold">Suggested Focus: ${lastAttentionTarget}</div>
              <div class="text-xs text-white/60 italic">Reason: ${reasonLabel}</div>
            </div>
          ` : '<p>Select a token to view details and examples.</p>'}
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

    const result = dictionaryEngine.getEntry(token);
    const entry = result.entry;
    const isSaved = state.savedWords.has(token);
    const heatLabel = getHeatLabel(token, state.savedWords);
    
    // Find examples (limit to 5 for performance)
    const examples = state.subtitles.filter(s => s.text.includes(token)).slice(0, 5);
    const examplesHtml = examples.length > 0 
      ? examples.map(s => renderSubtitleRow(s, state.savedWords, 'example-row')).join('')
      : '<div class="text-xs opacity-40 italic p-4 text-center border border-dashed border-slate-700 rounded">No examples available in current corpus</div>';

    const isFirstSub = state.activeSubtitleId === (state.subtitles[0]?.id || 0);
    const pedagogicalMsg = (state.pedagogicalDemo && isFirstSub && isSuggested) ? `
      <div class="mt-4 p-3 bg-blue-900/40 border border-blue-400/30 rounded-lg text-xs leading-relaxed">
        <div class="font-bold text-blue-300 mb-1">How it works:</div>
        LinguaPlay analyzes subtitles in real-time. The <span class="text-accent-primary font-bold">highlighted word</span> is your optimal next learning target based on your history and word difficulty.
      </div>
    ` : '';

    let statusMessage = '';
    let statusColor = 'text-white/60';

    switch (result.truthStatus) {
      case 'FOUND':
        statusMessage = `HSK ${entry?.hsk || 'N/A'} Lexicon Entry`;
        statusColor = 'text-green-400';
        break;
      case 'CURATED':
        statusMessage = 'Curated Learning Token';
        statusColor = 'text-blue-400';
        break;
      case 'MISSING':
        statusMessage = 'Word not yet in learning dictionary';
        statusColor = 'text-orange-400';
        break;
      case 'NON_LEXICAL':
        statusMessage = 'Not a Chinese lexical token';
        statusColor = 'text-slate-500';
        break;
      case 'PENDING':
        statusMessage = 'Dictionary loading...';
        statusColor = 'text-yellow-400';
        break;
    }

    let reasonLabel = '';
    if (isSuggested && token) {
      const heatLabel = getHeatLabel(token, state.savedWords);
      const reasonMap: Record<string, string> = {
        'unknown': 'New word',
        'rare': 'Rare word',
        'mid': 'Medium familiarity',
        'common': 'Review opportunity'
      };
      reasonLabel = reasonMap[heatLabel.toLowerCase()] || `${heatLabel} difficulty lexical target`;
    }

    focusPanel.innerHTML = `
      ${isSuggested ? `
        <div class="mb-2 p-2 bg-accent-primary/10 rounded-lg border border-accent-primary/20">
          <div class="text-[10px] uppercase tracking-widest text-accent-primary mb-1 font-bold opacity-80 animate-pulse">Suggested Focus</div>
          <div class="text-[10px] text-white/60 italic">Reason: ${reasonLabel}</div>
        </div>
      ` : ''}
      <div class="flex justify-between items-start mb-2">
        <h2 class="text-3xl font-bold text-accent-primary">${token}</h2>
        <button id="btn-save-word" class="save-btn ${isSaved ? 'saved' : ''}">
          ${isSaved ? '★ Saved' : '☆ Save'}
        </button>
      </div>
      <div class="text-[10px] uppercase tracking-widest ${statusColor} mb-4 font-bold">${statusMessage}</div>
      
      <div class="mb-6">
        <p class="text-xl italic opacity-80">${entry?.pinyin || (result.truthStatus === 'MISSING' ? 'pinyin unknown' : '')}</p>
        <p class="text-lg mt-2">${entry?.meaning || (result.truthStatus === 'MISSING' ? 'This token is not in the current lexicon. Try searching for it online.' : '')}</p>
        ${result.truthStatus === 'MISSING' ? `<a href="https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=${token}" target="_blank" class="text-xs text-accent-primary underline mt-2 inline-block">Search on MDBG</a>` : ''}
      </div>
      
      <div class="grid grid-cols-2 gap-2 text-sm mb-4">
        <div class="bg-slate-800 p-2 rounded border border-slate-700">
          <span class="opacity-50">Difficulty:</span> 
          <span class="font-semibold text-accent-primary">${heatLabel}</span>
        </div>
        <div class="bg-slate-800 p-2 rounded border border-slate-700">
          <span class="opacity-50">HSK Level:</span> 
          <span class="font-semibold text-accent-primary">${entry?.hsk || getHSKLevel(token) || 'N/A'}</span>
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
        <h3 class="text-lg font-semibold mb-1 border-b border-slate-700 pb-1">Example Sandbox</h3>
        <div class="text-[10px] opacity-40 italic mb-2">Examples from this video (not full dictionary)</div>
        <div class="flex flex-col gap-2">
          ${examplesHtml}
        </div>
      </div>
      ${pedagogicalMsg}
    `;
    console.log(`[AttentionSignal] Focus panel synced for: ${token} (Suggested: ${isSuggested})`);
  }

  function updateLoadStatus(msg: string, isDiagnostic = false) {
    loadStatus.textContent = msg;
    const diagLabel = document.getElementById('diagnostic-label');
    if (diagLabel) {
      diagLabel.classList.toggle('hidden', !isDiagnostic);
    }
  }

  function resetContentState() {
    attentionEngine.resetSessionReviewedTokens();
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
    const state = stateManager.getState();
    const token = target.getAttribute('data-token')!;
    const result = dictionaryEngine.getEntry(token);
    const entry = result.entry;
    
    if (entry) {
      const isAttention = target.classList.contains('attention-target');
      const pedagogicalHint = (state.pedagogicalDemo && isAttention) ? '<div class="mt-1 text-[10px] text-accent-primary font-bold animate-pulse">Start by clicking this word</div>' : '';
      
      tooltip.innerHTML = `
        <div class="font-bold">${entry.pinyin}</div>
        <div class="text-xs opacity-80">${entry.meaning}</div>
        ${pedagogicalHint}
      `;
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
你好，我们一起学习中文。(HSK1 Found)

2
00:00:05,000 --> 00:00:08,000
这是一个极其复杂的系统架构测试。(HSK4+ Rare)

3
00:00:09,000 --> 00:00:12,000
来到这个系统的用户。(Common Found)

4
00:00:13,000 --> 00:00:16,000
LinguaPlay is powerful. (Latin Non-Lexical)

5
00:00:17,000 --> 00:00:20,000
帮助帮助帮助帮助。(Curated/Common)

6
00:00:21,000 --> 00:00:24,000
这是一个极其罕见的词汇：饕餮。(Missing/Rare)

7
00:00:25,000 --> 00:00:28,000
标点符号测试：，。！？；：(Punctuation Non-Lexical)
    `;
    if (video.src.startsWith('blob:')) {
      URL.revokeObjectURL(video.src);
    }
    video.src = "https://www.w3schools.com/html/mov_bbb.mp4";
    video.load();
    
    const subs = parseSRT(demoSRT);
    resetContentState();
    stateManager.setState({ subtitles: subs, videoLoaded: true, pedagogicalDemo: true });
    updateLoadStatus("Diagnostic Demo Active", true);
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
      stateManager.setState({ videoLoaded: true, pedagogicalDemo: false });
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
          stateManager.setState({ subtitles: subs, pedagogicalDemo: false });
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
