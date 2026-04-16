# LinguaPlay UI_V2 Contract

## Layout Hierarchy
The UI_V2 interface follows a strict vertical hierarchy to ensure clarity and immersion.

1. **CONTROL BAR**: Global settings, content loading, and UI version toggle.
2. **VIDEO SURFACE**: Pinned video player. Height varies by mode (55vh for Netflix, 40vh for Study).
3. **SUBTITLE STACK**: Dual synchronized subtitle lines (Native + Translation/Literal).
4. **QUICK WORD PANEL**: Immediate feedback for selected tokens (Word, Pinyin, Meaning).
5. **SENTENCE PANEL**: Sentence-level translation and literal breakdown.
6. **STUDY WORKSPACE**: Tabbed interface for deep learning tools.

## Subtitle Toggle Rules
- **Chinese**: Toggle visibility of native text.
- **English**: Toggle visibility of natural translation.
- **Literal**: Toggle visibility of word-by-word breakdown.
- **Layout Integrity**: Toggling visibility must not cause layout shifts.

## Workspace Tab Architecture
The study workspace is divided into functional tabs:
- **Word**: Detailed dictionary entry and usage examples.
- **Sentence**: Sentence-level analysis and literal breakdown.
- **SentenceLab**: Interactive sentence reconstruction (drag-and-drop).
- **Phrase Explorer**: Discovery of multi-word expressions.
- **Grammar**: (Future) Structural analysis.
- **Practice**: (Future) Active recall exercises.

## Interaction Model
- **Token Click**: Pauses video, updates Quick Word Panel, and switches Workspace to 'Word' tab.
- **Sentence Lab**: Reuses current subtitle token stream for interactive practice.
- **Scrolling**: Only the `#study-workspace` area is allowed to scroll. Video and subtitles remain pinned.

## Responsive Design
- **Mobile**: Vertical stack (Video -> Subtitles -> Quick Panels -> Tabs).
- **Pinned Elements**: Video and Subtitle Stack must remain visible at all times.
