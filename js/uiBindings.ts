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
import { tokenTrie } from './tokenTrie.ts';
import { segmentationPostProcessor } from './segmentationPostProcessor.ts';

export function initUI() {
  const appContainer = document.getElementById('app-container')!;
  
  // UI State
  let currentSpeed = 1.0;
  let isDevMode = false;
  let translationMode: 'natural' | 'literal' = 'natural';
  let activeTab = 'word';
  let subVisibility = { chinese: true, english: true, literal: false };
  let videoFile: File | null = null;
  let srtFile: File | null = null;
  let currentVideoUrl: string | null = null;

  // Render Templates
  function getV1Template() {
    return `
      <div id="main-content">
        <div id="controls-bar" class="h-[48px] flex items-center justify-between px-4 bg-slate-800 border-y border-slate-700 shrink-0 z-20">
          <div class="flex items-center gap-3">
            <button id="btn-load-video" class="ui-btn-compact">Load Content</button>
            <button id="btn-load-srt" class="ui-btn-compact">Load Subtitles</button>
            <button id="btn-load-demo-extended" class="ui-btn-compact ml-1">Load Demo (Extended)</button>
            <select id="view-mode-select" class="ui-btn-compact bg-slate-700 border-none outline-none cursor-pointer ml-2">
              <option value="CINEMA">Cinema</option>
              <option value="STUDY">Study</option>
              <option value="INTENSIVE" selected>Intensive</option>
            </select>
            <button id="btn-slow-mode" class="ui-btn-compact ml-2">Speed: 1.0x</button>
          </div>

          <div class="flex items-center gap-4">
            <div id="status-line" class="hidden md:block text-[10px] uppercase tracking-widest opacity-40 truncate max-w-[200px]">ready</div>
            <div id="status-lexicon" class="text-[10px] opacity-40 hidden sm:block">Lexicon: Loading...</div>
            <div class="ui-version-toggle ml-2">
              <div class="ui-version-btn ${stateManager.getState().uiVersion === 'v1' ? 'active' : ''}" data-version="v1">V1</div>
              <div class="ui-version-btn ${stateManager.getState().uiVersion === 'v2' ? 'active' : ''}" data-version="v2">V2</div>
            </div>
            <label class="flex items-center gap-2 text-[10px] uppercase tracking-widest cursor-pointer opacity-70 hover:opacity-100 transition-opacity font-bold">
              <input type="checkbox" id="toggle-dev-mode" class="rounded border-slate-600 bg-slate-700 text-accent-primary focus:ring-accent-primary">
              Dev Mode
            </label>
          </div>
        </div>

        <div id="video-surface">
          <video controls>
            <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
          </video>
          <div id="subtitle-display" class="hidden"></div>
        </div>

        <input type="file" id="input-video" accept="video/*" class="hidden">
        <input type="file" id="input-srt" accept=".srt" class="hidden">

        <div id="workspace">
          <div id="transcript-panel"></div>
          <div id="focus-panel">
            <div class="flex h-full items-center justify-center opacity-30 text-center px-8">
              Tap a word in the subtitles to analyze vocabulary.
            </div>
          </div>
          <div id="sentence-lab" class="collapsed">
            <div id="sentence-lab-header" class="flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors">
              <span class="text-xs font-bold uppercase tracking-widest opacity-60">Sentence Lab</span>
              <span class="lab-toggle-icon text-[10px] opacity-40">▼</span>
            </div>
            <div id="sentence-lab-content" class="p-4 bg-slate-900/50">
              <div id="sentence-analysis" class="mb-4 p-3 bg-slate-800/40 rounded border border-slate-700/50 text-[10px] font-mono text-slate-400 hidden"></div>
              <div id="sentence-lab-workspace" class="flex flex-wrap gap-2 min-h-[60px] p-3 border-2 border-dashed border-slate-700 rounded-lg bg-slate-900/80"></div>
              <div id="sentence-lab-controls" class="flex flex-wrap gap-2 mt-4">
                <button id="btn-lab-tts" class="ui-btn-compact bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30">🔊 Sentence TTS</button>
                <button id="btn-lab-replay" class="ui-btn-compact bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30">▶ Replay Movie Line</button>
                <div class="h-6 w-[1px] bg-slate-700 mx-1"></div>
                <button id="btn-lab-structure" class="ui-btn-compact bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700">Structure</button>
                <button id="btn-lab-shuffle" class="ui-btn-compact bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700">Shuffle</button>
                <button id="btn-lab-reset" class="ui-btn-compact bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700">Reset</button>
              </div>
            </div>
          </div>
          <div id="phrase-explorer" class="hidden border-t border-slate-700 bg-slate-900/80">
            <div id="phrase-explorer-header" class="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
              <span class="text-xs font-bold uppercase tracking-widest opacity-60">Phrase Explorer</span>
              <button id="btn-close-explorer" class="text-lg opacity-40 hover:opacity-100">×</button>
            </div>
            <div id="phrase-explorer-content" class="p-4 overflow-y-auto max-h-[300px]"></div>
          </div>
        </div>
      </div>
    `;
  }

  function getV2Template() {
    return `
      <div id="main-content" class="ui-v2 flex flex-col bg-slate-900">
        <div id="controls-bar" class="h-[48px] flex items-center justify-between px-4 bg-slate-800 border-b border-slate-700 shrink-0 z-20">
          <div class="flex items-center gap-3">
            <button id="btn-load-video" class="ui-btn-compact">Load Content</button>
            <button id="btn-load-srt" class="ui-btn-compact">Load Subtitles</button>
            <button id="btn-load-demo-extended" class="ui-btn-compact ml-1">Load Demo (Extended)</button>
            <select id="view-mode-select" class="ui-btn-compact bg-slate-700 border-none outline-none cursor-pointer ml-2">
              <option value="CINEMA">Cinema</option>
              <option value="STUDY" selected>Study</option>
              <option value="INTENSIVE">Intensive</option>
            </select>
            <button id="btn-slow-mode" class="ui-btn-compact ml-2">Speed: 1.0x</button>
          </div>

          <div class="flex items-center gap-4">
            <div id="status-lexicon" class="text-[10px] opacity-40 hidden sm:block">Lexicon: Loading...</div>
            <div class="ui-version-toggle ml-2">
              <div class="ui-version-btn ${stateManager.getState().uiVersion === 'v1' ? 'active' : ''}" data-version="v1">V1</div>
              <div class="ui-version-btn ${stateManager.getState().uiVersion === 'v2' ? 'active' : ''}" data-version="v2">V2</div>
            </div>
            <label class="flex items-center gap-2 text-[10px] uppercase tracking-widest cursor-pointer opacity-70 hover:opacity-100 transition-opacity font-bold">
              <input type="checkbox" id="toggle-dev-mode" class="rounded border-slate-600 bg-slate-700 text-accent-primary focus:ring-accent-primary">
              Dev Mode
            </label>
          </div>
        </div>

        <div id="video-surface" class="relative flex-shrink-0 bg-black flex justify-center items-center">
          <video controls class="w-full h-full object-contain">
            <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
          </video>
          <div id="subtitle-display" class="hidden"></div>
        </div>

        <div id="transcript-panel" class="flex-shrink-0 bg-slate-900 border-b border-slate-700 overflow-y-auto w-full max-h-[14vh] min-h-[40px] px-4">
        </div>

        <div id="quick-word-panel" class="flex-shrink-0 bg-slate-800 p-3 border-b border-slate-700 flex items-center gap-4 min-h-[50px] w-full">
          <div class="text-slate-500 text-[10px] uppercase tracking-widest italic">Select a word to begin...</div>
        </div>

        <div id="sentence-panel" class="flex-shrink-0 bg-slate-900 p-3 border-b border-slate-700 min-h-[40px] w-full">
          <div class="flex items-center justify-between">
            <div id="sentence-meaning-text" class="text-sm text-slate-300 opacity-80">Sentence translation will appear here.</div>
            <button id="btn-toggle-sentence-mode" class="ui-btn-compact bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors">
              ${translationMode === 'natural' ? 'Natural' : 'Literal'}
            </button>
          </div>
        </div>

        <div id="study-workspace" class="flex-1 flex flex-col bg-slate-900 w-full min-h-0">
          <div id="tab-bar" class="flex-shrink-0 flex overflow-x-auto bg-slate-800 border-b border-slate-700 scrollbar-none">
            <div class="tab-btn ${activeTab === 'word' ? 'active' : ''}" data-tab="word">Word</div>
            <div class="tab-btn ${activeTab === 'sentence' ? 'active' : ''}" data-tab="sentence">Sentence</div>
            <div class="tab-btn ${activeTab === 'sentencelab' ? 'active' : ''}" data-tab="sentencelab">SentenceLab</div>
            <div class="tab-btn ${activeTab === 'phrase' ? 'active' : ''}" data-tab="phrase">Phrase Explorer</div>
            <div class="tab-btn ${activeTab === 'grammar' ? 'active' : ''}" data-tab="grammar">Grammar</div>
            <div class="tab-btn ${activeTab === 'practice' ? 'active' : ''}" data-tab="practice">Practice</div>
          </div>
          <div id="tab-content" class="flex-1 overflow-y-auto p-4 relative">
             <div class="flex h-full items-center justify-center opacity-20 text-center px-8 text-sm">
               Select a token or sentence to populate study tools.
             </div>
          </div>
        </div>

        <input type="file" id="input-video" accept="video/*" class="hidden">
        <input type="file" id="input-srt" accept=".srt" class="hidden">
      </div>
    `;
  }

  let transcriptRendered = false;
  let lastActiveId: number | null = null;
  let lastSelectedToken: string | null = null;
  let lastSavedWordsRef: Set<string> | null = null;
  let lastAttentionTarget: string | null = null;
  let lastReviewQueueRef: any = null;
  let showSentenceStructure = false;
  let sentenceLabOriginalTokens: string[] = [];

  function bindSharedEvents() {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (!video) {
      console.error("[UI] Video element not found during event binding");
      return;
    }
    const btnLoadVideo = document.getElementById('btn-load-video')!;
    const btnLoadSRT = document.getElementById('btn-load-srt')!;
    const btnLoadDemoExtended = document.getElementById('btn-load-demo-extended')!;
    const btnSlowMode = document.getElementById('btn-slow-mode');
    const viewModeSelect = document.getElementById('view-mode-select') as HTMLSelectElement;
    const toggleDevMode = document.getElementById('toggle-dev-mode') as HTMLInputElement;
    const inputVideo = document.getElementById('input-video') as HTMLInputElement;
    const inputSRT = document.getElementById('input-srt') as HTMLInputElement;

    // Version Toggle
    document.querySelectorAll('.ui-version-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const version = btn.getAttribute('data-version') as 'v1' | 'v2';
        stateManager.setState({ uiVersion: version });
        renderUI();
      });
    });

    // File Loading
    btnLoadVideo.onclick = () => inputVideo.click();
    btnLoadSRT.onclick = () => inputSRT.click();
    
    if (btnLoadDemoExtended) {
      btnLoadDemoExtended.onclick = async () => {
        try {
          const response = await fetch('/public/data/demo_large.srt');
          const text = await response.text();
          const subs = parseSRT(text);
          transcriptRendered = false;
          stateManager.setState({ subtitles: subs });
          console.log(`[UI] Extended Demo loaded: ${subs.length} lines`);
        } catch (err) {
          console.error('Failed to load extended demo:', err);
        }
      };
    }

    inputVideo.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
        videoFile = file;
        currentVideoUrl = URL.createObjectURL(file);
        video.src = currentVideoUrl;
        video.load();
        resetContentState();
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
            srtFile = file;
            resetContentState();
            stateManager.setState({ subtitles: subs });
          } catch (err) {
            console.error("SRT Parse Failed:", err);
          }
        };
        reader.readAsText(file);
      }
    });

    // Video Events
    video.addEventListener('timeupdate', () => {
      const currentTime = video.currentTime;
      stateManager.setState({ currentTime });
      syncSubtitles(currentTime);
    });

    // Speed Control
    if (btnSlowMode) {
      btnSlowMode.addEventListener('click', () => {
        if (currentSpeed === 1.0) currentSpeed = 0.75;
        else if (currentSpeed === 0.75) currentSpeed = 0.5;
        else currentSpeed = 1.0;
        video.playbackRate = currentSpeed;
        btnSlowMode.textContent = `Speed: ${currentSpeed}x`;
      });
    }

    // View Mode
    if (viewModeSelect) {
      document.body.classList.add(`mode-${viewModeSelect.value.toLowerCase()}`);
      viewModeSelect.addEventListener('change', (e) => {
        const mode = (e.target as HTMLSelectElement).value.toLowerCase();
        document.body.classList.remove('mode-cinema', 'mode-study', 'mode-intensive');
        document.body.classList.add(`mode-${mode}`);
        stateManager.setState({ selectedToken: stateManager.getState().selectedToken });
      });
    }

    // Dev Mode
    if (toggleDevMode) {
      toggleDevMode.addEventListener('change', (e) => {
        isDevMode = (e.target as HTMLInputElement).checked;
        stateManager.setState({ selectedToken: stateManager.getState().selectedToken });
      });
    }
  }

  function bindV1Events() {
    initSentenceLab();
    // V1 specific logic for transcript panel
    const transcriptPanel = document.getElementById('transcript-panel')!;
    let lastUserScroll = 0;
    transcriptPanel.addEventListener('scroll', () => {
      lastUserScroll = Date.now();
    });
  }

  function bindV2Events() {
    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab')!;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateTabContent();
      });
    });

    // Subtitle Toggles
    document.querySelectorAll('.sub-toggle').forEach(input => {
      input.addEventListener('change', (e) => {
        const type = (e.target as HTMLInputElement).getAttribute('data-type') as keyof typeof subVisibility;
        subVisibility[type] = (e.target as HTMLInputElement).checked;
        updateSubtitleStack();
      });
    });

    // Sentence Mode Toggle
    const btnToggleSentence = document.getElementById('btn-toggle-sentence-mode');
    if (btnToggleSentence) {
      btnToggleSentence.addEventListener('click', () => {
        translationMode = translationMode === 'natural' ? 'literal' : 'natural';
        btnToggleSentence.textContent = translationMode === 'natural' ? 'Natural' : 'Literal';
        updateSentencePanel();
      });
    }
  }

  function renderUI() {
    const version = stateManager.getState().uiVersion;
    if (version === 'v1') {
      appContainer.innerHTML = getV1Template();
      bindSharedEvents();
      bindV1Events();
    } else {
      appContainer.innerHTML = getV2Template();
      bindSharedEvents();
      bindV2Events();
    }
    // Re-trigger state update to populate content
    stateManager.setState({});
  }

  function updateSubtitleStack() {
    const state = stateManager.getState();
    const subtitleDisplay = document.getElementById('subtitle-display');
    if (!subtitleDisplay) return;

    if (state.activeSubtitleId === null) {
      subtitleDisplay.classList.add('hidden');
      subtitleDisplay.innerHTML = '';
      return;
    }

    const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
    if (!sub) return;

    subtitleDisplay.classList.remove('hidden');
    subtitleDisplay.innerHTML = renderSubtitleRow(sub, state.savedWords, "overlay-active");

    subtitleDisplay.querySelectorAll('.token').forEach(el => {
      el.addEventListener('click', () => {
        const token = el.getAttribute('data-token')!;
        (window as any).selectToken(token);
      });
    });
  }

  function updateQuickWordPanel() {
    const state = stateManager.getState();
    const panel = document.getElementById('quick-word-panel');
    if (!panel) return;

    if (!state.selectedToken) {
      panel.innerHTML = '<div class="text-slate-500 text-[10px] uppercase tracking-widest italic">Select a word to begin...</div>';
      return;
    }

    const res = dictionaryEngine.getEntry(state.selectedToken);
    if (!res.entry) {
      panel.innerHTML = `<div class="text-slate-300 font-bold">${state.selectedToken}</div><div class="text-slate-500 text-xs">Not in dictionary</div>`;
      return;
    }

    panel.innerHTML = `
      <div class="flex items-center gap-3 w-full">
        <div class="flex items-baseline gap-2">
          <div class="text-xl font-bold text-accent-primary">${state.selectedToken}</div>
          <div class="text-sm text-slate-400 font-mono">${res.entry.pinyin}</div>
        </div>
        <div class="h-4 w-[1px] bg-slate-700 mx-1"></div>
        <div class="text-sm text-slate-200 truncate flex-1">${res.entry.meaning.split(';')[0]}</div>
        <button class="ui-btn-compact ml-auto" onclick="window.speakSentence('${state.selectedToken}')">🔊</button>
      </div>
    `;
  }

  function updateSentencePanel() {
    const state = stateManager.getState();
    const textEl = document.getElementById('sentence-meaning-text');
    if (!textEl) return;

    if (state.activeSubtitleId === null) {
      textEl.textContent = 'Sentence translation will appear here.';
      textEl.classList.add('opacity-60');
      return;
    }

    const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
    if (!sub) return;

    textEl.classList.remove('opacity-60');
    if (translationMode === 'natural') {
       const naturalTranslations: Record<string, string> = {
        "你好！好久不见！欢迎来到我的新家。": "Hello! Long time no see! Welcome to my new home.",
        "你好！哇，你的新家真漂亮，很大。": "Hello! Wow, your new home is really beautiful and big.",
        "谢谢。请进，请坐。你想喝点什么？": "Thank you. Please come in, please sit. What would you like to drink?",
        "给我一杯水吧，谢谢。": "Give me a glass of water, please. Thank you.",
        "好的。你觉得这个小区怎么样？": "Okay. What do you think of this neighborhood?",
        "我觉得这个小区很好，很安静，也很方便。": "I think this neighborhood is very good, very quiet, and also very convenient.",
        "对，附近有一个大超市，还有一个公园。": "Yes, there is a big supermarket nearby, and also a park.",
        "太好了。你每天都去公园散步吗？": "Great. Do you go for a walk in the park every day?",
        "是的，我每天早上都去公园跑步。锻炼身体很重要。": "Yes, I go running in the park every morning. Exercising is very important.",
        "那很好。你今天晚上有空吗？我们一起吃晚饭吧。": "That's good. Are you free tonight? Let's have dinner together.",
        "好久不见": "Long time no see.",
        "我希望那家饭馆不用排队": "I hope that restaurant doesn't have a line.",
        "我希望那家饭馆不用排队。": "I hope that restaurant doesn't have a line.",
        "走吧，我已经饿了。": "Let's go, I'm already hungry.",
        "你不用担心": "You don't need to worry.",
        "你不用担心。": "You don't need to worry.",
        "我觉得这个办法可以。": "I think this method works.",
        "如果人太多，我们也可以先去附近走一走。": "If there are too many people, we can also go for a walk nearby first."
      };
      textEl.textContent = naturalTranslations[sub.text] || sub.text;
    } else {
      const rawTokens = tokenTrie.segment(sub.text);
      const tokens = segmentationPostProcessor.process(rawTokens);
      textEl.innerHTML = tokens.map(t => {
        const res = dictionaryEngine.getEntry(t);
        return `<span class="text-slate-300">${res.entry?.meaning ? res.entry.meaning.split(';')[0].trim() : t}</span>`;
      }).join(' <span class="opacity-30 mx-1">|</span> ');
    }
  }

  function updateTabContent() {
    const state = stateManager.getState();
    const content = document.getElementById('tab-content');
    if (!content) return;

    if (activeTab === 'word') {
      if (!state.selectedToken) {
        content.innerHTML = '<div class="flex h-full items-center justify-center opacity-20 text-center px-8 text-sm">Select a token in the subtitles to see details.</div>';
        return;
      }
      renderWordTab(state.selectedToken, content);
    } else if (activeTab === 'sentence') {
      if (state.activeSubtitleId === null) {
        content.innerHTML = '<div class="flex h-full items-center justify-center opacity-20 text-center px-8 text-sm">Play the video to see sentence analysis.</div>';
        return;
      }
      renderSentenceTab(state.activeSubtitleId, content);
    } else if (activeTab === 'sentencelab') {
      if (state.activeSubtitleId === null) {
        content.innerHTML = '<div class="flex h-full items-center justify-center opacity-20 text-center px-8 text-sm">Play the video to use SentenceLab.</div>';
        return;
      }
      renderSentenceLabTab(state.activeSubtitleId, content);
    } else if (activeTab === 'phrase') {
      if (!state.selectedToken) {
        content.innerHTML = '<div class="flex h-full items-center justify-center opacity-20 text-center px-8 text-sm">Select a token to explore phrases.</div>';
        return;
      }
      renderPhraseTab(state.selectedToken, content);
    } else {
      content.innerHTML = `<div class="flex h-full items-center justify-center opacity-20 text-center px-8 text-sm">${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tools coming soon.</div>`;
    }
  }

  function renderWordTab(token: string, container: HTMLElement) {
    const res = dictionaryEngine.getEntry(token);
    if (!res.entry) {
      container.innerHTML = `<div class="p-4">Word "${token}" not found in dictionary.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="p-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-4xl font-bold text-accent-primary">${token}</h2>
            <p class="text-xl text-slate-400 font-mono">${res.entry.pinyin}</p>
          </div>
          <button class="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors" onclick="window.speakSentence('${token}')">🔊</button>
        </div>
        
        <div class="space-y-4">
          <section>
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Meaning</h3>
            <div class="bg-slate-800/50 p-3 rounded border border-slate-700/50 text-lg">
              ${res.entry.meaning}
            </div>
          </section>

          <section>
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">HSK Level</h3>
            <div class="inline-block px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs font-bold border border-blue-500/30">
              HSK ${res.entry.hsk || 'N/A'}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function renderSentenceTab(subtitleId: number, container: HTMLElement) {
    const state = stateManager.getState();
    const sub = state.subtitles.find(s => s.id === subtitleId);
    if (!sub) return;

    const rawTokens = tokenTrie.segment(sub.text);
    const tokens = segmentationPostProcessor.process(rawTokens);

    container.innerHTML = `
      <div class="p-2">
        <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Structural Breakdown</h3>
        <div class="space-y-3">
          ${tokens.map(t => {
            const res = dictionaryEngine.getEntry(t);
            const isChinese = /[\u4e00-\u9fa5]/.test(t);
            if (!isChinese) return '';
            return `
              <div class="flex items-center gap-4 p-3 bg-slate-800/30 rounded border border-slate-700/30 hover:bg-slate-800/50 transition-colors cursor-pointer" onclick="window.selectToken('${t}')">
                <div class="text-xl font-bold text-slate-200 w-16">${t}</div>
                <div class="flex-1">
                  <div class="text-xs text-slate-400 font-mono">${res.entry?.pinyin || ''}</div>
                  <div class="text-sm text-slate-300">${res.entry?.meaning.split(';')[0] || ''}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderSentenceLabTab(subtitleId: number, container: HTMLElement) {
    const state = stateManager.getState();
    const sub = state.subtitles.find(s => s.id === subtitleId);
    if (!sub) return;

    container.innerHTML = `
      <div id="sentence-lab-v2" class="h-full flex flex-col">
        <div id="sentence-lab-workspace" class="flex flex-wrap gap-2 min-h-[100px] p-4 border-2 border-dashed border-slate-700 rounded-lg bg-slate-900/80 mb-4"></div>
        <div class="flex flex-wrap gap-2">
          <button id="btn-lab-tts" class="ui-btn-compact bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30">🔊 Sentence TTS</button>
          <button id="btn-lab-replay" class="ui-btn-compact bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30">▶ Replay Movie Line</button>
          <button id="btn-lab-shuffle" class="ui-btn-compact bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700">Shuffle</button>
          <button id="btn-lab-reset" class="ui-btn-compact bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700">Reset</button>
        </div>
      </div>
    `;
    
    updateSentenceLab(sub);
    bindSentenceLabEvents();
  }

  function bindSentenceLabEvents() {
    const workspace = document.getElementById('sentence-lab-workspace')!;
    const btnTts = document.getElementById('btn-lab-tts')!;
    const btnReplay = document.getElementById('btn-lab-replay')!;
    const btnReset = document.getElementById('btn-lab-reset')!;
    const btnShuffle = document.getElementById('btn-lab-shuffle')!;

    if (!workspace) return;

    btnReset?.addEventListener('click', () => {
      const state = stateManager.getState();
      if (state.activeSubtitleId !== null) {
        const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
        if (sub) updateSentenceLab(sub);
      }
    });

    btnShuffle?.addEventListener('click', () => {
      const tokens = Array.from(workspace.querySelectorAll('.lab-token'));
      const shuffled = [...tokens].sort(() => Math.random() - 0.5);
      workspace.innerHTML = '';
      shuffled.forEach(el => workspace.appendChild(el));
    });

    btnTts?.addEventListener('click', () => {
      const tokens = Array.from(workspace.querySelectorAll('.lab-token')).map(el => el.getAttribute('data-token'));
      const sentence = tokens.join('');
      (window as any).speakSentence(sentence);
    });

    btnReplay?.addEventListener('click', () => {
      const state = stateManager.getState();
      if (state.activeSubtitleId !== null) {
        const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
        if (sub) (window as any).replayFrom(sub.start, sub.end);
      }
    });

    // Drag and drop
    let draggedEl: HTMLElement | null = null;
    workspace.addEventListener('pointerdown', (e) => {
      const target = (e.target as HTMLElement).closest('.lab-token') as HTMLElement;
      if (target) {
        draggedEl = target;
        draggedEl.classList.add('dragging');
        draggedEl.setPointerCapture(e.pointerId);
      }
    });

    workspace.addEventListener('pointermove', (e) => {
      if (!draggedEl) return;
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lab-token') as HTMLElement;
      if (target && target !== draggedEl && target.parentElement === workspace) {
        const rect = target.getBoundingClientRect();
        const next = (e.clientX - rect.left) > (rect.width / 2);
        if (next) target.after(draggedEl);
        else target.before(draggedEl);
      }
    });

    workspace.addEventListener('pointerup', (e) => {
      if (draggedEl) {
        draggedEl.classList.remove('dragging');
        draggedEl.releasePointerCapture(e.pointerId);
        draggedEl = null;
      }
    });
  }

  function renderPhraseTab(token: string, container: HTMLElement) {
    container.innerHTML = `<div id="phrase-explorer-v2"></div>`;
    const inner = document.getElementById('phrase-explorer-v2')!;
    
    const entry = dictionaryEngine.getEntry(token).entry;
    if (!entry) return;

    const examples = [
      { zh: `${token}很好。`, en: `${token} is very good.` },
      { zh: `我喜欢${token}。`, en: `I like ${token}.` },
      { zh: `你${token}吗？`, en: `Are you ${token}?` }
    ];

    inner.innerHTML = `
      <div class="space-y-6">
        <section>
          <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Example Sentences</h3>
          <div class="space-y-3">
            ${examples.map(ex => `
              <div class="p-3 bg-slate-800/30 rounded border border-slate-700/30">
                <div class="flex justify-between items-start mb-1">
                  <div class="text-lg text-slate-200">${ex.zh}</div>
                  <button class="text-xs opacity-40 hover:opacity-100" onclick="window.speakSentence('${ex.zh}')">🔊</button>
                </div>
                <div class="text-sm text-slate-400 italic">${ex.en}</div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  }

  (window as any).selectToken = (token: string) => {
    stateManager.setState({ selectedToken: token });
    if (stateManager.getState().uiVersion === 'v2') {
      activeTab = 'word';
      updateTabContent();
      updateQuickWordPanel();
    }
  };

  function initSentenceLab() {
    const lab = document.getElementById('sentence-lab')!;
    const header = document.getElementById('sentence-lab-header')!;
    const workspace = document.getElementById('sentence-lab-workspace')!;
    const btnTts = document.getElementById('btn-lab-tts')!;
    const btnReplay = document.getElementById('btn-lab-replay')!;
    const btnReset = document.getElementById('btn-lab-reset')!;
    const btnShuffle = document.getElementById('btn-lab-shuffle')!;
    const btnStructure = document.getElementById('btn-lab-structure')!;

    if (!lab || !header || !workspace || !btnTts || !btnReplay) return;

    header.addEventListener('click', () => {
      lab.classList.toggle('collapsed');
    });

    btnReset?.addEventListener('click', () => {
      const state = stateManager.getState();
      if (state.activeSubtitleId !== null) {
        const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
        if (sub) updateSentenceLab(sub);
      }
    });

    btnShuffle?.addEventListener('click', () => {
      const tokens = Array.from(workspace.querySelectorAll('.lab-token'));
      const shuffled = [...tokens].sort(() => Math.random() - 0.5);
      workspace.innerHTML = '';
      shuffled.forEach(el => workspace.appendChild(el));
    });

    btnStructure?.addEventListener('click', () => {
      showSentenceStructure = !showSentenceStructure;
      btnStructure.classList.toggle('bg-blue-600/40', showSentenceStructure);
      btnStructure.classList.toggle('text-blue-300', showSentenceStructure);
      const state = stateManager.getState();
      if (state.activeSubtitleId !== null) {
        const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
        if (sub) updateSentenceLab(sub);
      }
    });

    workspace.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.lab-token') as HTMLElement;
      if (target) {
        const token = target.getAttribute('data-token');
        if (token) {
          playClickSound();
          (window as any).speakSentence(token);
          updatePhraseExplorer(token);
        }
      }
    });

    let draggedEl: HTMLElement | null = null;
    workspace.addEventListener('pointerdown', (e) => {
      const target = (e.target as HTMLElement).closest('.lab-token') as HTMLElement;
      if (target) {
        draggedEl = target;
        draggedEl.classList.add('dragging');
        draggedEl.setPointerCapture(e.pointerId);
      }
    });

    workspace.addEventListener('pointermove', (e) => {
      if (!draggedEl) return;
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lab-token') as HTMLElement;
      if (target && target !== draggedEl && target.parentElement === workspace) {
        const rect = target.getBoundingClientRect();
        const next = (e.clientX - rect.left) > (rect.width / 2);
        if (next) target.after(draggedEl);
        else target.before(draggedEl);
      }
    });

    workspace.addEventListener('pointerup', (e) => {
      if (draggedEl) {
        draggedEl.classList.remove('dragging');
        draggedEl.releasePointerCapture(e.pointerId);
        draggedEl = null;
      }
    });

    btnTts.addEventListener('click', () => {
      const tokens = Array.from(workspace.querySelectorAll('.lab-token')).map(el => el.getAttribute('data-token'));
      const sentence = tokens.join('');
      (window as any).speakSentence(sentence);
    });

    btnReplay.addEventListener('click', () => {
      const state = stateManager.getState();
      if (state.activeSubtitleId !== null) {
        const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
        if (sub) (window as any).replayFrom(sub.start, sub.end);
      }
    });
  }

  function updatePhraseExplorer(token: string) {
    const explorer = document.getElementById('phrase-explorer');
    const content = document.getElementById('phrase-explorer-content');
    if (!explorer || !content) return;

    const entry = dictionaryEngine.getEntry(token).entry;
    if (!entry) {
      explorer.classList.add('hidden');
      return;
    }

    explorer.classList.remove('hidden');
    const examples = [
      { zh: `${token}很好。`, en: `${token} is very good.` },
      { zh: `我喜欢${token}。`, en: `I like ${token}.` },
      { zh: `你${token}吗？`, en: `Are you ${token}?` }
    ];

    content.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-bold text-accent-primary mb-1">${token}</h2>
        <p class="text-lg opacity-80 italic mb-2">${entry.pinyin}</p>
        <p class="text-lg">${entry.meaning}</p>
        <div class="flex gap-2 mt-4">
          <button class="ui-btn-compact" onclick="window.speakSentence('${token}')">🔊 Pronounce</button>
        </div>
      </div>
      <div class="mb-6">
        <h3 class="explorer-section-title">Example Sentences</h3>
        <div class="flex flex-col gap-3">
          ${examples.map(ex => `
            <div class="explorer-example-item">
              <div class="flex justify-between items-start">
                <div class="explorer-example-chinese">${ex.zh}</div>
                <button class="text-xs opacity-40 hover:opacity-100" onclick="window.speakSentence('${ex.zh.replace(/'/g, "\\'")}')">🔊</button>
              </div>
              <div class="explorer-example-translation">${ex.en}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function playClickSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  }

  function updateSentenceLab(subtitle: any) {
    const workspace = document.getElementById('sentence-lab-workspace');
    const analysisEl = document.getElementById('sentence-analysis');
    if (!workspace) return;

    const rawTokens = tokenTrie.segment(subtitle.text);
    const tokens = segmentationPostProcessor.process(rawTokens);
    sentenceLabOriginalTokens = [...tokens];

    workspace.innerHTML = tokens.map(t => {
      const res = dictionaryEngine.getEntry(t);
      const isChinese = /[\u4e00-\u9fa5]/.test(t);
      if (!isChinese) return `<div class="lab-token non-chinese" data-token="${t}">${t}</div>`;
      
      let structureClass = '';
      if (showSentenceStructure) {
        if (res.entry?.pos === 'verb') structureClass = 'pos-verb';
        else if (res.entry?.pos === 'noun') structureClass = 'pos-noun';
        else if (res.entry?.pos === 'adj') structureClass = 'pos-adj';
      }

      return `
        <div class="lab-token ${structureClass}" data-token="${t}">
          <div class="lab-token-pinyin">${res.entry?.pinyin || ''}</div>
          <div class="lab-token-zh">${t}</div>
        </div>
      `;
    }).join('');

    if (analysisEl) {
      analysisEl.classList.remove('hidden');
      analysisEl.textContent = `Tokens: ${tokens.length} | Characters: ${subtitle.text.length}`;
    }
  }

  function resetContentState() {
    transcriptRendered = false;
    lastActiveId = null;
    lastSelectedToken = null;
    const transcriptPanel = document.getElementById('transcript-panel');
    if (transcriptPanel) transcriptPanel.innerHTML = '';
    const focusPanel = document.getElementById('focus-panel');
    if (focusPanel) focusPanel.innerHTML = '<div class="flex h-full items-center justify-center opacity-30 text-center px-8">Tap a word in the subtitles to analyze vocabulary.</div>';
  }

  (window as any).speakSentence = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    window.speechSynthesis.speak(utterance);
  };

  (window as any).replayFrom = (start: number, end: number) => {
    const video = document.querySelector('video')!;
    if (video) {
       video.currentTime = start;
       video.play();
       if (end) {
         const checkEnd = () => {
           if (video.currentTime >= end) {
             video.pause();
             video.removeEventListener('timeupdate', checkEnd);
           }
         };
         video.addEventListener('timeupdate', checkEnd);
       }
    }
  };

  function playInterval(start: number, end: number) {
    const video = document.querySelector('video')!;
    if (!video) return;
    video.currentTime = start;
    video.play();
    const checkEnd = () => {
      if (video.currentTime >= end) {
        video.pause();
        video.removeEventListener('timeupdate', checkEnd);
      }
    };
    video.addEventListener('timeupdate', checkEnd);
  }

  async function loadDemo() {
    const video = document.querySelector('video');
    if (!video) {
      console.error("[UI] Video element not found during demo load");
      return;
    }
    video.src = "https://www.w3schools.com/html/mov_bbb.mp4";
    try {
      const response = await fetch('/data/demo_subtitles.srt');
      const srtText = await response.text();
      const subs = parseSRT(srtText);
      resetContentState();
      stateManager.setState({ subtitles: subs });
    } catch (err) {
      console.error("Demo Load Failed:", err);
    }
  }

  stateManager.subscribe((state) => {
    const version = state.uiVersion;
    
    // Update Subtitles
    if (version === 'v1') {
      const subtitleDisplay = document.getElementById('subtitle-display');
      if (subtitleDisplay) {
        if (state.activeSubtitleId !== null) {
          const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
          if (sub) {
            subtitleDisplay.classList.remove('hidden');
            subtitleDisplay.innerHTML = renderSubtitleRow(sub, state.savedWords);
            
            // Bind token clicks in V1
            subtitleDisplay.querySelectorAll('.sub-token').forEach(el => {
              el.addEventListener('click', () => {
                const token = el.getAttribute('data-token')!;
                (window as any).selectToken(token);
              });
            });
          }
        } else {
          subtitleDisplay.classList.add('hidden');
        }
      }
    } else {
      updateSubtitleStack();
      updateQuickWordPanel();
      updateSentencePanel();
      updateTabContent();
    }

    // Update Transcript (Both versions)
    if (state.subtitles.length > 0 && !transcriptRendered) {
      const transcriptPanel = document.getElementById('transcript-panel');
      if (transcriptPanel) {
        transcriptPanel.innerHTML = state.subtitles.map(sub => `
          <div class="transcript-row" data-id="${sub.id}" onclick="window.replayFrom(${sub.start}, ${sub.end})">
            <span class="text-[10px] opacity-30 font-mono w-12 shrink-0">${Math.floor(sub.start)}s</span>
            <div class="flex-1">${sub.text}</div>
          </div>
        `).join('');
        transcriptRendered = true;
      }
    }

    // Highlight active transcript row (Both versions)
    if (state.activeSubtitleId !== lastActiveId) {
      const rows = document.querySelectorAll('.transcript-row');
      rows.forEach(r => r.classList.remove('active'));
      const activeRow = document.querySelector(`.transcript-row[data-id="${state.activeSubtitleId}"]`);
      if (activeRow) {
        activeRow.classList.add('active');
        activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      lastActiveId = state.activeSubtitleId;

      // Update SentenceLab on sub change
      const sub = state.subtitles.find(s => s.id === state.activeSubtitleId);
      if (sub) updateSentenceLab(sub);
    }

    // Update Focus Panel (V1 only)
    if (version === 'v1' && state.selectedToken !== lastSelectedToken) {
      const focusPanel = document.getElementById('focus-panel');
      if (focusPanel && state.selectedToken) {
        const res = dictionaryEngine.getEntry(state.selectedToken);
        focusPanel.innerHTML = `
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-4xl font-bold text-accent-primary">${state.selectedToken}</h2>
              <button class="p-2 bg-slate-800 rounded-full" onclick="window.speakSentence('${state.selectedToken}')">🔊</button>
            </div>
            <p class="text-xl text-slate-400 mb-4 font-mono">${res.entry?.pinyin || ''}</p>
            <div class="bg-slate-800/50 p-4 rounded border border-slate-700/50 mb-6">
              <p class="text-lg">${res.entry?.meaning || 'Definition not found'}</p>
            </div>
            <button class="ui-btn-compact w-full py-3" onclick="window.explorePhrase('${state.selectedToken}')">Explore Phrases</button>
          </div>
        `;
      }
      lastSelectedToken = state.selectedToken;
    }
  });

  renderUI();

  return { loadDemo };
}
