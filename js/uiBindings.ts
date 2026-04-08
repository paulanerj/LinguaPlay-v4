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

import { timeAuthority } from './timeAuthority.ts';
import { cognitiveSelectors } from './cognitiveSelectors.ts';
import { engineLoop } from './engineLoop.ts';

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
  const btnSlowMode = document.getElementById('btn-slow-mode');
  const viewModeSelect = document.getElementById('view-mode-select') as HTMLSelectElement;
  const toggleDevMode = document.getElementById('toggle-dev-mode') as HTMLInputElement;
  const sessionMetrics = document.getElementById('session-metrics') as HTMLDivElement;
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
  let currentSpeed = 1.0;
  let isDevMode = false;

  // Initialize view mode
  if (viewModeSelect) {
    document.body.classList.add(`mode-${viewModeSelect.value.toLowerCase()}`);
    viewModeSelect.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value.toLowerCase();
      document.body.classList.remove('mode-cinema', 'mode-study', 'mode-intensive');
      document.body.classList.add(`mode-${mode}`);
    });
  }

  if (toggleDevMode) {
    toggleDevMode.addEventListener('change', (e) => {
      isDevMode = (e.target as HTMLInputElement).checked;
      if (isDevMode) {
        sessionMetrics.classList.remove('hidden');
      } else {
        sessionMetrics.classList.add('hidden');
      }
      // Re-render focus panel to show/hide developer metadata
      stateManager.setState({ selectedToken: stateManager.getState().selectedToken });
    });
  }

  if (btnSlowMode) {
    btnSlowMode.addEventListener('click', () => {
      if (currentSpeed === 1.0) currentSpeed = 0.75;
      else if (currentSpeed === 0.75) currentSpeed = 0.5;
      else currentSpeed = 1.0;
      
      video.playbackRate = currentSpeed;
      btnSlowMode.textContent = `Speed: ${currentSpeed}x`;
    });
  }

  // Record & Compare MVP State
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let myAudioBlob: Blob | null = null;
  let myAudioUrl: string | null = null;
  let isRecording = false;

  (window as any).playSourceAudio = () => {
    const state = stateManager.getState();
    if (state.activeSubtitleId !== null) {
      const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
      if (sub && video) {
        video.currentTime = sub.start;
        video.play();
        const checkEnd = () => {
          if (video.currentTime >= sub.end) {
            video.pause();
            video.removeEventListener('timeupdate', checkEnd);
          }
        };
        video.addEventListener('timeupdate', checkEnd);
      }
    }
  };

  (window as any).toggleRecording = async () => {
    const btnRecord = document.getElementById('btn-record-audio');
    const status = document.getElementById('recording-status');
    const btnPlayMine = document.getElementById('btn-play-mine');
    const btnCompare = document.getElementById('btn-compare-again');

    if (isRecording) {
      mediaRecorder?.stop();
      isRecording = false;
      if (btnRecord) {
        btnRecord.textContent = 'Record';
        btnRecord.classList.remove('animate-pulse');
      }
      if (status) status.textContent = 'Recording saved.';
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        myAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        if (myAudioUrl) URL.revokeObjectURL(myAudioUrl);
        myAudioUrl = URL.createObjectURL(myAudioBlob);
        
        if (btnPlayMine) btnPlayMine.classList.remove('hidden');
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      isRecording = true;
      
      if (btnRecord) {
        btnRecord.textContent = 'Stop';
        btnRecord.classList.add('animate-pulse');
      }
      if (status) status.textContent = 'Recording... Speak now.';
      if (btnPlayMine) btnPlayMine.classList.add('hidden');

    } catch (err) {
      console.error("Microphone access denied", err);
      if (status) status.textContent = 'Microphone access denied.';
    }
  };

  (window as any).playMyAudio = () => {
    if (myAudioUrl) {
      const audio = new Audio(myAudioUrl);
      audio.play();
    }
  };

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
          const now = timeAuthority.getNow();
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

  btnDemo.addEventListener('click', async () => {
    // Revoke previous URL if it exists
    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
      currentVideoUrl = null;
    }

    videoFile = null;
    srtFile = null;
    video.src = "https://www.w3schools.com/html/mov_bbb.mp4";
    
    try {
      // Load demo lexicon first
      await dictionaryEngine.loadLargeLexicon('/data/demo_lexicon.json');

      // Load demo subtitles
      const response = await fetch('/data/demo_subtitles.srt');
      if (!response.ok) throw new Error("Failed to load demo subtitles");
      const srtText = await response.text();
      
      const subs = parseSRT(srtText);
      resetContentState();
      stateManager.setState({ subtitles: subs });
      
      // Compute review candidates
      const now = timeAuthority.getNow();
      const reviewCandidates = cognitiveSelectors.getReviewCandidates(subs, now);
      stateManager.setState({ topReviewCandidates: reviewCandidates });
      
      updateStatus();
    } catch (err) {
      console.error("Demo Load Failed:", err);
      statusLine.textContent = 'demo load failed';
    }
  });

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

    // Update Session Metrics
    const metrics = state.sessionMetrics;
    if (metrics) {
      const elSeen = document.getElementById('metric-seen');
      const elReviewed = document.getElementById('metric-reviewed');
      const elRescued = document.getElementById('metric-rescued');
      if (elSeen) elSeen.textContent = metrics.tokensSeen.toString();
      if (elReviewed) elReviewed.textContent = metrics.tokensReviewed.toString();
      if (elRescued) elRescued.textContent = metrics.rescueTokensResolved.toString();
    }
    
    // Update Pressure
    const pressure = state.activeOrchestrationDecision?.reviewPressureScore || 0;
    const elPressure = document.getElementById('metric-pressure');
    if (elPressure) {
      elPressure.textContent = `${Math.round(pressure * 100)}%`;
      if (pressure > 0.8) {
        elPressure.className = 'font-bold text-red-500 animate-pulse';
      } else if (pressure > 0.5) {
        elPressure.className = 'font-bold text-orange-400';
      } else {
        elPressure.className = 'font-bold text-green-400';
      }
    }

    // Handle Video Pausing for Reviews
    const decision = state.activeGuidedControlDecision;
    if (decision) {
      const shouldPause = decision.shouldSurfaceReviewEntry || 
                          decision.reviewProgressState === 'ROW_PROPOSED' || 
                          decision.reviewProgressState === 'ROW_ACTIVE';
      if (shouldPause && !video.paused) {
        video.pause();
      }
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
        const currentSub = state.subtitles.find(s => s.id === state.activeSubtitleId);
        if (currentSub) {
          subDisplay.innerHTML = '';
          const rowHtml = renderSubtitleRow(currentSub, state.savedWords, 'overlay-active');
          subDisplay.innerHTML = `<div class="relative group pointer-events-auto">
                    ${rowHtml}
                    <button class="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-slate-800/80 rounded-full text-slate-300 hover:text-white hover:bg-slate-700" onclick="window.replaySubtitle()">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    </button>
                  </div>`;
          subDisplay.classList.remove('hidden');
        }

        // Transcript highlight & scroll
        document.querySelectorAll('.transcript-row.active').forEach(el => el.classList.remove('active'));
        const activeRow = transcriptPanel.querySelector(`.transcript-row[data-id="${state.activeSubtitleId}"]`);
        if (activeRow) {
          activeRow.classList.add('active');
          activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Instrument Exposure & Record Memory: Passive View for all tokens in the active row
        const currentSubForExposure = state.subtitles.find(s => s.id === state.activeSubtitleId);
        if (currentSubForExposure && currentSubForExposure.tokens) {
          const now = timeAuthority.getNow();
          currentSubForExposure.tokens.forEach(token => {
            // Log Exposure
            logExposure({
              token,
              timestamp: now,
              subtitleIndex: state.activeSubtitleId,
              attentionState: 'passive',
              interactionType: 'view'
            });
          });
        }

        // Attention Engine Integration
        attentionEngine.resetAttentionCycle();
        
        if (isNewActive) {
          engineLoop.processEvent({ 
            type: 'SUBTITLE_TRANSITION', 
            subtitleId: state.activeSubtitleId, 
            tokens: currentSubForExposure?.tokens || [] 
          });
        }
      } else {
        subDisplay.innerHTML = '';
        subDisplay.classList.add('hidden');
        document.querySelectorAll('.transcript-row.active').forEach(el => el.classList.remove('active'));
      }
    }

    // 3. Handle Focus Panel & Example Sandbox
    if (state.lastAttentionTarget !== lastAttentionTarget) {
      document.querySelectorAll('.token.attention-target').forEach(el => el.classList.remove('attention-target'));
      lastAttentionTarget = state.lastAttentionTarget || null;
      
      if (lastAttentionTarget) {
        const activeRow = subDisplay.querySelector('.overlay-active');
        if (activeRow) {
          activeRow.querySelectorAll(`.token[data-token="${lastAttentionTarget}"]`).forEach(el => {
            el.classList.add('attention-target');
          });
        }
        
        // Instrument Exposure: Target
        logExposure({
          token: lastAttentionTarget,
          timestamp: timeAuthority.getNow(),
          subtitleIndex: state.activeSubtitleId,
          attentionState: 'target',
          interactionType: 'view'
        });
      }
    }

    // Handle Selected Token Highlighting
    if (state.selectedToken !== lastSelectedToken) {
      document.querySelectorAll('.token.selected').forEach(el => el.classList.remove('selected'));
      if (state.selectedToken) {
        document.querySelectorAll(`.token[data-token="${state.selectedToken}"]`).forEach(el => {
          el.classList.add('selected');
        });
      }
    }

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
        focusPanel.classList.add('active');
        const lookup = dictionaryEngine.getEntry(state.selectedToken);
        const entry = lookup.entry;
        const status = lookup.truthStatus;
        
        const isSaved = state.savedWords.has(state.selectedToken);
        const heatLabel = getHeatLabel(state.selectedToken, state.savedWords);
        const isSuggested = state.selectedToken === lastAttentionTarget;
        
        // Memory Stats
        const memory = learningMemory.getRecord(state.selectedToken);
        const lastSeen = memory ? new Date(memory.lastSeenAt).toLocaleString() : 'Never';

        // Find examples (limit to 1 for MVP)
        const examples = state.subtitles.filter(s => s.text.includes(state.selectedToken!)).slice(0, 1);
        const examplesHtml = examples.map(s => renderSubtitleRow(s, state.savedWords, 'example-row')).join('');

        focusPanel.innerHTML = `
          ${isSuggested ? '<div class="text-[10px] uppercase tracking-widest text-accent-primary mb-1 font-bold opacity-80">Suggested Focus</div>' : ''}
          <div class="flex justify-between items-start mb-4 pr-6">
            <h2 class="text-3xl font-bold text-accent-primary">${state.selectedToken}</h2>
            <button id="btn-save-word" class="save-btn ${isSaved ? 'saved' : ''}">
              ${isSaved ? '★ Saved' : '☆ Save'}
            </button>
          </div>
          <div class="mb-4">
            ${entry ? `
              <p class="text-xl italic opacity-80">${entry.pinyin}</p>
              <p class="text-lg mt-2">${entry.meaning}</p>
            ` : `
              <p class="text-sm opacity-60 italic">${lookup.reason}</p>
            `}
          </div>
          
          <div class="mb-4">
            <h3 class="text-sm font-semibold mb-2 border-b border-slate-700 pb-1">Example</h3>
            <div class="flex flex-col gap-2">
              ${examples.length > 0 ? examplesHtml : '<div class="text-sm opacity-40 italic p-2 border border-dashed border-slate-700 rounded text-center">No examples available.</div>'}
            </div>
          </div>

          <!-- Record & Compare MVP -->
          <div class="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 class="text-xs uppercase tracking-wider opacity-40 mb-2 font-bold">Pronunciation Practice</h4>
            <div class="flex flex-wrap gap-2 text-xs">
              <button class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors" onclick="window.playSourceAudio()">
                Listen
              </button>
              <button id="btn-record-audio" class="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors" onclick="window.toggleRecording()">
                Record
              </button>
              <button id="btn-play-mine" class="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded font-bold transition-colors hidden" onclick="window.playMyAudio()">
                Play Mine
              </button>
            </div>
            <div id="recording-status" class="text-[10px] mt-2 opacity-60 italic"></div>
          </div>

          ${isDevMode ? `
          <details class="mt-4 text-xs opacity-60 group">
            <summary class="cursor-pointer font-bold hover:text-white transition-colors">Developer Metadata</summary>
            <div class="mt-2 pl-2 border-l-2 border-slate-700">
              <div class="grid grid-cols-2 gap-2 mb-4">
                <div class="bg-slate-800 p-2 rounded border border-slate-700">
                  <span class="opacity-50">Difficulty:</span> 
                  <span class="font-semibold text-accent-primary">${heatLabel}</span>
                </div>
                <div class="bg-slate-800 p-2 rounded border border-slate-700 opacity-50">
                  <span>Freq Rank:</span> --
                </div>
              </div>

              <!-- Memory Metadata Section -->
              <div class="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 class="text-[10px] uppercase tracking-wider opacity-40 mb-2 font-bold">Memory Trace</h4>
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
            </div>
          </details>
          ` : ''}
        `;
      } else {
        let reviewQueueHtml = '';
        const decision = state.activeGuidedControlDecision;
        let hasReview = false;
        
        if (decision && decision.shouldSurfaceReviewEntry && decision.proposedReviewSubtitleId !== null) {
          hasReview = true;
          const entry = state.reviewQueuePreview?.find(e => e.subtitleId === decision.proposedReviewSubtitleId);
          const dueCount = entry?.dueTokensCount || entry?.targetTokens.length || 0;
          const topTokens = entry?.targetTokens.slice(0, 3).join(', ') || '';
          
          reviewQueueHtml = `
            <div class="w-full mt-4 p-4 bg-accent-primary/10 border border-accent-primary/30 rounded-lg text-left shadow-lg">
              <h4 class="text-xs uppercase tracking-wider text-accent-primary mb-2 font-bold flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-accent-primary animate-pulse"></span>
                Review Ready
              </h4>
              <div class="text-sm font-semibold mb-1">
                You have ${dueCount} important word${dueCount !== 1 ? 's' : ''} to review.
              </div>
              <div class="text-[10px] opacity-80 mb-3 italic">
                Including: ${topTokens}
              </div>
              <div class="flex gap-2 mt-2">
                <button class="flex-1 py-2 bg-accent-primary hover:bg-accent-primary/80 text-white rounded text-xs font-bold transition-colors" onclick="window.acceptReviewEntry()">
                  Start Review
                </button>
                <button class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-colors" onclick="window.declineReviewEntry()">
                  Skip for now
                </button>
              </div>
            </div>
          `;
        } else if (decision && decision.reviewProgressState === 'ROW_PROPOSED' && decision.proposedReviewSubtitleId !== null) {
          hasReview = true;
          reviewQueueHtml = `
            <div class="w-full mt-4 p-4 bg-accent-secondary/10 border border-accent-secondary/30 rounded-lg text-left shadow-lg">
              <h4 class="text-xs uppercase tracking-wider text-accent-secondary mb-2 font-bold flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-accent-secondary animate-pulse"></span>
                Review Active
              </h4>
              <div class="text-[10px] opacity-80 mb-3">
                Please navigate to Subtitle #${decision.proposedReviewSubtitleId} to continue your review.
              </div>
              <button class="w-full py-2 bg-accent-secondary hover:bg-accent-secondary/80 text-white rounded text-xs font-bold transition-colors" onclick="document.querySelector('.transcript-row[data-id=\\'${decision.proposedReviewSubtitleId}\\']')?.click()">
                Go to Subtitle #${decision.proposedReviewSubtitleId}
              </button>
            </div>
          `;
        } else if (decision && decision.reviewProgressState === 'ROW_ACTIVE') {
          hasReview = true;
          const entry = state.reviewQueuePreview?.find(e => e.subtitleId === decision.proposedReviewSubtitleId);
          const targetTokens = entry?.targetTokens || [];
          const tokenHtml = targetTokens.map(t => `<span class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-accent-primary font-bold">${t}</span>`).join(' ');
          
          reviewQueueHtml = `
            <div class="w-full mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-left shadow-lg">
              <h4 class="text-xs uppercase tracking-wider text-green-400 mb-2 font-bold flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Reviewing Row
              </h4>
              <div class="text-[10px] opacity-80 mb-2">
                Target words:
              </div>
              <div class="flex flex-wrap gap-1 mb-4">
                ${tokenHtml}
              </div>
              <div class="flex flex-col gap-2">
                <button class="w-full py-2 bg-green-500 hover:bg-green-400 text-white rounded text-xs font-bold transition-colors" onclick="window.reviewGotIt('${targetTokens[0] || ''}')">
                  Got it
                </button>
                <div class="flex gap-2">
                  <button class="flex-1 py-2 bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 rounded text-xs font-bold transition-colors" onclick="window.reviewStillLearning('${targetTokens[0] || ''}')">
                    Still learning
                  </button>
                  <button class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-colors" onclick="window.reviewSkip()">
                    Skip
                  </button>
                </div>
              </div>
            </div>
          `;
        }

        if (hasReview) {
          focusPanel.classList.add('active');
          focusPanel.innerHTML = `
            <div class="flex h-full flex-col items-center justify-center text-center gap-4">
              ${reviewQueueHtml}
            </div>
          `;
        } else {
          focusPanel.classList.remove('active');
          focusPanel.innerHTML = '';
        }
      }
    }
  });

  // Global Window functions for Review Actions
  (window as any).acceptReviewEntry = () => {
    engineLoop.processEvent({ type: 'REVIEW_ACCEPT' });
  };

  (window as any).declineReviewEntry = () => {
    engineLoop.processEvent({ type: 'REVIEW_DECLINE' });
  };

  (window as any).resolveReviewRow = () => {
    engineLoop.processEvent({ type: 'REVIEW_RESOLVE' });
  };

  (window as any).reviewGotIt = (token: string) => {
    engineLoop.processEvent({ type: 'REVIEW_GOT_IT', token });
  };

  (window as any).reviewStillLearning = (token: string) => {
    engineLoop.processEvent({ type: 'REVIEW_STILL_LEARNING', token });
  };

  (window as any).reviewSkip = () => {
    engineLoop.processEvent({ type: 'REVIEW_SKIP' });
  };

  (window as any).replaySubtitle = () => {
    const state = stateManager.getState();
    if (state.activeSubtitleId !== null) {
      const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
      if (sub && video) {
        video.currentTime = sub.start;
        video.play();
      }
    }
  };

  // Global Event Delegation (Clicks)
  document.body.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Token Click
    if (target.classList.contains('token')) {
      const token = target.getAttribute('data-token');
      if (token) {
        // Audio Interaction Recovery: Play pronunciation
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(token);
        utterance.lang = "zh-CN";
        window.speechSynthesis.speak(utterance);

        // Pause video
        if (video && !video.paused) {
          video.pause();
        }

        const now = timeAuthority.getNow();
        // Instrument Exposure: Selected
        logExposure({
          token,
          timestamp: now,
          subtitleIndex: stateManager.getState().activeSubtitleId,
          attentionState: 'selected',
          interactionType: 'click'
        });

        engineLoop.processEvent({ type: 'TOKEN_CLICK', token });
      }
      return;
    }

    // Transcript / Example Row Click (Seek)
    const row = target.closest('.subtitle-row') as HTMLElement;
    if (row && (row.classList.contains('transcript-row') || row.classList.contains('example-row'))) {
      const start = parseFloat(row.getAttribute('data-start') || '0');
      console.log(`[Seek] Clicked subtitle start: ${start}`);
      console.log(`[Seek] Video currentTime before: ${video.currentTime}`);
      video.currentTime = start;
      video.play();
      console.log(`[Seek] Video currentTime after: ${video.currentTime}`);
      return;
    }

    // Save Button Click
    if (target.id === 'btn-save-word') {
      const state = stateManager.getState();
      if (state.selectedToken) {
        engineLoop.processEvent({ type: 'TOKEN_SAVE', token: state.selectedToken });

        // Efficient DOM update for saved tokens across the app
        document.querySelectorAll(`.token[data-token="${state.selectedToken}"]`).forEach(el => {
          el.classList.toggle('saved', stateManager.getState().savedWords.has(state.selectedToken!));
        });
      }
      return;
    }

    // Unselect token if clicking outside interactive elements
    if (!target.closest('#focus-panel') && !target.closest('.subtitle-row') && !target.closest('.ui-btn')) {
      stateManager.setState({ selectedToken: null });
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
