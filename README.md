# LinguaPlay Core

LinguaPlay is a deterministic cognitive language learning engine driven by subtitles.

## Architecture
- Vanilla TypeScript
- Vite Build System
- Tailwind CSS

## Core Engine Modules (Frozen)
- `js/attentionEngine.ts`: Priority-based target selection
- `js/dictionaryEngine.ts`: Lexical truth and dictionary management
- `js/frequencyHeatmap.ts`: Token difficulty classification
- `js/learningMemory.ts`: Persistent token memory store
- `js/pedagogy.ts`: Cognitive state and exposure schemas
- `js/segmentationPostProcessor.ts`: Linguistic chunking refinement
- `js/tokenTrie.ts`: Max-Match segmentation

## Subsystems
- `js/subtitleParser.ts`: SRT Parsing
- `js/subtitleSync.ts`: Video Synchronization
- `js/state.ts`: Pub/Sub State Loop
- `js/app.ts`: Bootstrap Sequence
- `js/uiBindings.ts`: UI Event Orchestration
- `js/subtitleRenderer.ts`: DOM-based rendering
- `js/attentionDebug.ts`: Engine visualization
