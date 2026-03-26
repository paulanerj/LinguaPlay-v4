/**
 * PURPOSE: UI Event Bindings and DOM manipulation.
 * WHY THIS EXISTS: Connects user interactions to the state and engine.
 */

import { stateManager } from './state.ts';
import { dictionaryEngine, LexiconLookupResult, LexiconTruthStatus } from './dictionaryEngine.ts';
import { renderSubtitleRow } from './subtitleRenderer.ts';
import { syncSubtitles } from './subtitleSync.ts';
import { getHeatLabel } from './frequencyHeatmap.ts';
import { attentionEngine } from './attentionEngine.ts';
import { parseSRT } from './subtitleParser.ts';
import { logExposure } from './pedagogy.ts';
import { learningMemory } from './learningMemory.ts';

import { cognitiveSelectors } from './cognitiveSelectors.ts';
import { cognitiveOrchestrator } from './cognitiveOrchestrator.ts';
import { sessionScheduler } from './sessionScheduler.ts';
import { cognitiveInference } from './cognitiveInference.ts';
import { reinforcementPlanner } from './reinforcementPlanner.ts';
import { buildReviewQueue } from './reviewQueue.ts';

export function initUI() {
  const video = document.querySelector('video') as HTMLVideoElement;
  const subDisplay = document.getElementById('subtitle-display')!;
  const transcriptPanel = document.getElementById('transcript-panel')!;
  const focusPanel = document.getElementById('focus-panel')!;
  const tooltip = document.getElementById('quick-preview-tooltip')!;
  const statusLine = document.getElementById('status-line')!;

  const btnLoadVideo = document.getElementById('btn-load-video')!;
  const btnLoadSRT = document.getElementById('btn-load-srt')!;
  const btnDemo = document.getElementById('btn-demo')!;
  const inputVideo = document.getElementById('input-video') as HTMLInputElement;
  const inputSRT = document.getElementById('input-srt') as HTMLInputElement;

  let transcriptRendered = false;
  let lastActiveId: number | null = null;
  let lastSelectedToken: string | null = null;
  let lastSavedWordsRef: Set<string> | null = null;
  let lastAttentionTarget: string | null = null;
  let lastReviewQueueRef: any = null;

  let videoFile: File | null = null;
  let srtFile: File | null = null;
  let currentVideoUrl: string | null = null;

  function updateStatus() {
    if (!videoFile && !srtFile && !transcriptRendered) {
      statusLine.textContent = 'waiting for content';
      return;
    }
    
    const parts = [];
    if (videoFile) parts.push(`Video: ${videoFile.name}`);
    if (srtFile) parts.push(`SRT: ${srtFile.name}`);
    
    if (parts.length === 0) {
      statusLine.textContent = 'demo mode active';
    } else {
      statusLine.textContent = parts.join(' | ');
    }
  }

  function resetContentState() {
    // 1. Clear State Manager
    stateManager.setState({
      selectedToken: null,
      activeSubtitleId: null,
      currentTime: 0,
      activeCognitiveAttentionAdvice: null,
      activeSubtitleCognitivePriority: null,
      topReviewCandidates: [],
      selectedTokenLearningProfile: null,
      selectedTokenReinforcementClass: null
    });

    // 2. Clear Attention Engine
    attentionEngine.resetAttentionCycle();

    // 3. Clear UI State
    transcriptRendered = false;
    transcriptPanel.innerHTML = '';
    subDisplay.innerHTML = '';
    subDisplay.classList.add('hidden');
    
    // 4. Clear Local Tracking
    lastActiveId = null;
    lastSelectedToken = null;
    lastAttentionTarget = null;
  }

  // File Loading Bindings
  btnLoadVideo.addEventListener('click', () => inputVideo.click());
  btnLoadSRT.addEventListener('click', () => inputSRT.click());

  inputVideo.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      // Revoke previous URL if it exists
      if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
      }

      videoFile = file;
      currentVideoUrl = URL.createObjectURL(file);
      video.src = currentVideoUrl;
      
      resetContentState();
      updateStatus();
    }
  });

  inputSRT.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const subs = parseSRT(text);
          if (subs.length === 0) throw new Error("No subtitles found");
          
          srtFile = file;
          resetContentState();
          stateManager.setState({ subtitles: subs });
          
          // Compute review candidates once subtitles are loaded
          const now = Date.now();
          const reviewCandidates = cognitiveSelectors.getReviewCandidates(subs, now);
          stateManager.setState({ topReviewCandidates: reviewCandidates });
          
          updateStatus();
        } catch (err) {
          console.error("SRT Parse Failed:", err);
          statusLine.textContent = 'parse failed';
        }
      };
      reader.readAsText(file);
    }
  });

  btnDemo.addEventListener('click', () => {
    // Revoke previous URL if it exists
    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
      currentVideoUrl = null;
    }

    videoFile = null;
    srtFile = null;
    video.src = "https://www.w3schools.com/html/mov_bbb.mp4";
    
    const sampleSRT = `
1
00:00:01,000 --> 00:00:04,000
你好，欢迎来到LinguaPlay。

2
00:00:05,000 --> 00:00:08,000
我们一起学习中文。
    `;
    const subs = parseSRT(sampleSRT);
    resetContentState();
    stateManager.setState({ subtitles: subs });
    
    // Compute review candidates
    const now = Date.now();
    const reviewCandidates = cognitiveSelectors.getReviewCandidates(subs, now);
    stateManager.setState({ topReviewCandidates: reviewCandidates });
    
    updateStatus();
  });

  function updateAttentionTarget() {
    const state = stateManager.getState();
    if (state.activeSubtitleId === null) {
      lastAttentionTarget = null;
      stateManager.setState({ 
        activeCognitiveAttentionAdvice: null,
        activeSubtitleCognitivePriority: null
      });
      return;
    }

    const activeRow = subDisplay.querySelector('.overlay-active');
    if (!activeRow) return;

    const tokenEls = Array.from(activeRow.querySelectorAll('.token')) as HTMLElement[];
    const tokens = tokenEls.map(el => el.getAttribute('data-token') || '');
    
    const baselineTarget = attentionEngine.getNextTargetToken(tokens, state.savedWords);
    
    const now = Date.now();
    // Compute cognitive advice
    const advice = cognitiveSelectors.getAttentionAdvice(tokens, baselineTarget, now);
    const priority = cognitiveSelectors.getSubtitlePriority(state.activeSubtitleId, tokens, now);
    
    // Update review candidates
    const reviewCandidates = cognitiveSelectors.getReviewCandidates(state.subtitles, now);

    // Stage-3 Orchestration
    const allProfiles = cognitiveInference.deriveAllProfiles(now);
    const reinforcementCandidates = reinforcementPlanner.planReinforcement(allProfiles);
    
    // Record subtitle transition for scheduler
    sessionScheduler.recordSubtitleTransition(
      priority.priorityScore,
      priority.rescueCount,
      null // Not surfacing a review subtitle directly from here yet
    );

    const orchestrationDecision = cognitiveOrchestrator.orchestrate(
      state.activeSubtitleId,
      tokens,
      baselineTarget,
      advice.shouldOverride ? advice.advisedTarget : null,
      allProfiles,
      reinforcementCandidates,
      priority,
      reviewCandidates,
      now
    );

    const reviewQueue = buildReviewQueue(reviewCandidates, reinforcementCandidates, sessionScheduler.getState().recentlySurfacedSubtitleId);
    const snapshot = cognitiveOrchestrator.generateSnapshot(state.activeSubtitleId, orchestrationDecision, reinforcementCandidates, reviewQueue);

    // The orchestrator advises the target
    lastAttentionTarget = orchestrationDecision.advisedTarget || baselineTarget;

    stateManager.setState({
      activeCognitiveAttentionAdvice: advice,
      activeSubtitleCognitivePriority: priority,
      topReviewCandidates: reviewCandidates,
      activeCognitiveMode: orchestrationDecision.mode,
      activeFocusStrategy: orchestrationDecision.focusStrategy,
      activeOrchestrationDecision: orchestrationDecision,
      sessionCognitiveSnapshot: snapshot,
      reviewQueuePreview: reviewQueue
    });
    
    // Remove existing target class
    document.querySelectorAll('.token.attention-target').forEach(el => el.classList.remove('attention-target'));
    
    if (lastAttentionTarget) {
      // Add to all instances of this token in the active row
      activeRow.querySelectorAll(`.token[data-token="${lastAttentionTarget}"]`).forEach(el => {
        el.classList.add('attention-target');
      });

      // Instrument Exposure: Target
      logExposure({
        token: lastAttentionTarget,
        timestamp: Date.now(),
        subtitleIndex: state.activeSubtitleId,
        attentionState: 'target',
        interactionType: 'view'
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
      const modeStr = state.lexiconMode ? ` (${state.lexiconMode})` : '';
      statusEl.textContent = state.lexiconLoaded ? `Lexicon: Ready${modeStr}` : 'Lexicon: Loading...';
      statusEl.classList.toggle('text-green-400', state.lexiconLoaded);
    }

    // 1. Render Transcript Once
    if (!transcriptRendered && state.subtitles.length > 0) {
      transcriptPanel.innerHTML = state.subtitles.map(s => renderSubtitleRow(s, state.savedWords, 'transcript-row')).join('');
      transcriptRendered = true;
      updateStatus();
    }

    // 2. Handle Active Subtitle Change (Multi-line Overlay + Transcript Scroll)
    if (state.activeSubtitleId !== lastActiveId) {
      const isNewActive = state.activeSubtitleId !== null && state.activeSubtitleId !== lastActiveId;
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

        // Instrument Exposure & Record Memory: Passive View for all tokens in the active row
        const currentSub = state.subtitles.find(s => s.id === state.activeSubtitleId);
        if (currentSub && currentSub.tokens) {
          const now = Date.now();
          currentSub.tokens.forEach(token => {
            // Log Exposure
            logExposure({
              token,
              timestamp: now,
              subtitleIndex: state.activeSubtitleId,
              attentionState: 'passive',
              interactionType: 'view'
            });

            // Record Encounter (Only once per activation)
            if (isNewActive) {
              const lookup = dictionaryEngine.getEntry(token);
              if (lookup.truthStatus !== 'NON_LEXICAL') {
                learningMemory.recordEncounter(token, now);
              }
            }
          });
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
    if (state.selectedToken !== lastSelectedToken || state.savedWords !== lastSavedWordsRef || state.reviewQueuePreview !== lastReviewQueueRef) {
      // Visual feedback for selected token
      if (state.selectedToken !== lastSelectedToken) {
        document.querySelectorAll('.token.active').forEach(el => el.classList.remove('active'));
        if (state.selectedToken) {
          document.querySelectorAll(`.token[data-token="${state.selectedToken}"]`).forEach(el => el.classList.add('active'));
        }
      }

      lastSelectedToken = state.selectedToken;
      lastSavedWordsRef = state.savedWords;
      lastReviewQueueRef = state.reviewQueuePreview;

      if (state.selectedToken) {
        const lookup = dictionaryEngine.getEntry(state.selectedToken);
        const entry = lookup.entry;
        const status = lookup.truthStatus;
        
        const isSaved = state.savedWords.has(state.selectedToken);
        const heatLabel = getHeatLabel(state.selectedToken, state.savedWords);
        const isSuggested = state.selectedToken === lastAttentionTarget;
        
        // Memory Stats
        const memory = learningMemory.getRecord(state.selectedToken);
        const lastSeen = memory ? new Date(memory.lastSeenAt).toLocaleString() : 'Never';

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
            <div class="text-[10px] uppercase tracking-widest opacity-50 mb-1 font-bold">
              ${status === 'CURATED' ? 'Curated Learning Token' : 
                status === 'FOUND' ? 'Dictionary Entry' : 
                status === 'MISSING' ? 'Word not yet in learning dictionary' : 
                'Not a Chinese lexical token'}
            </div>
            ${entry ? `
              <p class="text-xl italic opacity-80">${entry.pinyin}</p>
              <p class="text-lg mt-2">${entry.meaning}</p>
            ` : `
              <p class="text-sm opacity-60 italic">${lookup.reason}</p>
            `}
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

          <!-- Memory Metadata Section -->
          <div class="mb-6 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 class="text-xs uppercase tracking-wider opacity-40 mb-2 font-bold">Memory Trace</h4>
            <div class="grid grid-cols-3 gap-2 text-[10px] mb-2">
              <div class="flex flex-col">
                <span class="opacity-50">Encounters</span>
                <span class="font-bold text-accent-primary">${memory?.encounterCount || 0}</span>
              </div>
              <div class="flex flex-col">
                <span class="opacity-50">Reviews</span>
                <span class="font-bold text-accent-primary">${memory?.reviewCount || 0}</span>
              </div>
              <div class="flex flex-col">
                <span class="opacity-50">Saves</span>
                <span class="font-bold text-accent-primary">${memory?.saveCount || 0}</span>
              </div>
            </div>
            <div class="text-[10px]">
              <span class="opacity-50">Last Seen:</span>
              <span class="opacity-80">${lastSeen}</span>
            </div>
            <div class="text-[10px] mt-1">
              <span class="opacity-50">Cognitive State:</span>
              <span class="opacity-80 italic">${state.selectedTokenLearningProfile ? state.selectedTokenLearningProfile.inferredState : 'Not yet inferred'}</span>
            </div>
            ${state.selectedTokenReinforcementClass ? `
            <div class="text-[10px] mt-1">
              <span class="opacity-50">Reinforcement Class:</span>
              <span class="opacity-80 font-bold text-accent-secondary">${state.selectedTokenReinforcementClass}</span>
            </div>
            ` : ''}
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
              ${examples.length > 0 ? examplesHtml : '<div class="text-sm opacity-40 italic p-4 border border-dashed border-slate-700 rounded text-center">No examples available in current subtitle corpus.</div>'}
            </div>
          </div>
        `;
      } else {
        let reviewQueueHtml = '';
        if (state.activeOrchestrationDecision?.shouldSurfaceReviewQueue && state.reviewQueuePreview && state.reviewQueuePreview.length > 0) {
          const topReview = state.reviewQueuePreview[0];
          reviewQueueHtml = `
            <div class="w-full max-w-[250px] mt-4 p-3 bg-accent-primary/10 border border-accent-primary/30 rounded-lg text-left">
              <h4 class="text-xs uppercase tracking-wider text-accent-primary mb-2 font-bold flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-accent-primary animate-pulse"></span>
                Review Opportunity
              </h4>
              <div class="text-[10px] opacity-80 mb-2">
                The orchestrator suggests reviewing a previous subtitle to rescue decaying knowledge.
              </div>
              <button class="w-full py-2 bg-accent-primary/20 hover:bg-accent-primary/40 text-accent-primary rounded text-xs font-bold transition-colors" onclick="document.querySelector('.transcript-row[data-id=\\'${topReview.subtitleId}\\']')?.click()">
                Review Subtitle #${topReview.subtitleId}
              </button>
            </div>
          `;
        }

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
            ${reviewQueueHtml}
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
        const now = Date.now();
        // Instrument Exposure: Selected
        logExposure({
          token,
          timestamp: now,
          subtitleIndex: stateManager.getState().activeSubtitleId,
          attentionState: 'selected',
          interactionType: 'click'
        });

        // Record Review in Memory
        learningMemory.recordReview(token, now);

        attentionEngine.markTokenReviewed(token);
        
        const profile = cognitiveSelectors.getProfile(token, now);
        const candidates = cognitiveSelectors.getReinforcementCandidates(now);
        const candidate = candidates.find(c => c.token === token);
        
        stateManager.setState({ 
          selectedToken: token,
          selectedTokenLearningProfile: profile,
          selectedTokenReinforcementClass: candidate ? candidate.reinforcementClass : null
        });
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
        const now = Date.now();
        const newSaved = new Set(state.savedWords);
        if (newSaved.has(state.selectedToken)) {
          newSaved.delete(state.selectedToken);
        } else {
          newSaved.add(state.selectedToken);
        }
        stateManager.setState({ savedWords: newSaved });
        
        // Record Save in Memory
        learningMemory.recordSave(state.selectedToken, now);

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
    const lookup = dictionaryEngine.getEntry(token);
    const entry = lookup.entry;
    
    if (entry) {
      tooltip.innerHTML = `<div class="font-bold">${entry.pinyin}</div><div class="text-xs opacity-80">${entry.meaning}</div>`;
      const rect = target.getBoundingClientRect();
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.top}px`;
      tooltip.classList.remove('hidden');
    } else if (lookup.truthStatus === 'MISSING') {
      tooltip.innerHTML = `<div class="text-[10px] opacity-60 italic">${lookup.reason}</div>`;
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
