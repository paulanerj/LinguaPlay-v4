# LinguaPlay Core

LinguaPlay is a deterministic cognitive language learning engine driven by subtitles.

## Architecture
- Vanilla TypeScript
- Vite Build System
- Tailwind CSS

## Extracted Engine Primitives (Frozen)
- `/engine/Reducer.ts`: Pure State Transitions
- `/engine/BonusMaskSystem.ts`: Difficulty Classification
- `/engine/ChainEngine.ts`: Priority Progression
- `/engine/GravitySystem.ts`: Target Selection

## Frozen Subsystems
- `tokenTrie.ts`: Max-Match Segmentation
- `subtitleParser.ts`: SRT Parsing
- `subtitleSync.ts`: Video Synchronization
- `state.ts`: Pub/Sub State Loop
- `dictionaryEngine.ts`: Lexicon Merging
- `app.ts`: Bootstrap Sequence
