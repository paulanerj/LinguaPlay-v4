LinguaPlay UI Contract — Version 2

File: /docs/ui_contract_v2.md

1. Purpose

This document defines the official UI architecture for LinguaPlay Version 2 (UI_V2).

Its purpose is to prevent UI drift and ensure that future development maintains a stable and predictable interface.

LinguaPlay combines video immersion with interactive language study tools. The UI must preserve both aspects simultaneously.

This contract defines:

• layout hierarchy
• interaction rules
• subtitle rendering behavior
• workspace structure
• responsive layout rules
• architecture boundaries

All UI changes must respect this contract.

2. Core Design Philosophy

LinguaPlay follows a three-layer learning architecture.

IMMERSION
(video + subtitles)

UNDERSTANDING
(word + sentence meaning)

EXPLORATION
(study tools)

Each layer progressively deepens the learner’s engagement with the language.

3. UI Hierarchy (Locked Layout)

The UI must follow this vertical structure.

CONTROL BAR
VIDEO SURFACE
SUBTITLE OVERLAY
TRANSCRIPT PANEL
WORD MEANING PANEL
SENTENCE MEANING PANEL
STUDY WORKSPACE

No UI modifications may rearrange this hierarchy without updating this contract.

4. Control Bar

The control bar appears at the top of the interface.

Functions:

Load Content
Load Subtitles
Load Demo
Mode Selector
Playback Speed
Developer Mode
UI Version Toggle

The control bar must remain fixed and visible.

5. Video Surface

The video surface is the primary immersion element.

Rules:

• always visible
• never scrolls off screen
• subtitles overlay directly on the video

Height rules:

Netflix Mode: ~55vh
Study Mode: ~40vh

Video playback behavior is controlled exclusively by the video element.

6. Subtitle Overlay

Subtitles must render over the video surface.

Structure:

#video-surface
    video
    #subtitle-overlay

Subtitle tokens are rendered individually.

Example:

我 希望 那 家 饭馆 不用 排队

Each token must be:

• clickable
• color coded
• dictionary-aware

The overlay must support both Chinese and English subtitles.

7. Subtitle Translation Modes

The system supports two translation modes.

Natural Translation

Example:

好久不见
It’s been a long time since I’ve seen you.

Literal Translation

Example:

好久不见
long time | not | see

Literal translation must be generated using token meanings from the dictionary engine.

No new translation logic may modify the segmentation pipeline.

8. Subtitle Visibility Toggles

The UI must support toggling subtitle layers.

CN
EN
LIT

Possible states:

Chinese only

Chinese + English

Chinese + Literal

These toggles must not cause layout shifts.

9. Transcript Panel

The transcript panel displays the subtitle history.

Example:

▶ 你好，好久不见。
▶ 你最近怎么样？
▶ 我最近有点忙。

Functions:

• replay specific subtitle lines
• navigate dialogue history

Replay interaction:

▶ button → playInterval(start,end)

Clicking the row itself must not trigger playback.

10. Word Meaning Panel

Displays quick word information for the selected token.

Example:

老婆
lǎo pó
(coll.) wife

This panel must update immediately when a token is selected.

The panel should show:

• Chinese token
• pinyin
• primary meaning

Avoid excessive metadata here.

11. Sentence Meaning Panel

Displays translation of the active sentence.

Example:

"It must be Mrs. Chen, the wife of Mr. Wang."

Includes translation toggle:

Natural | Literal

Sentence translation should not crowd the UI.

12. Study Workspace

The study workspace contains deeper language tools.

Structure:

#study-workspace
    tab-bar
    tab-content

Tabs include:

Word
Sentence
SentenceLab
Phrase Explorer
Grammar
Practice

Only one tab may be visible at a time.

13. SentenceLab

SentenceLab is an interactive grammar sandbox.

Features:

• draggable tokens
• token shuffling
• sentence reconstruction
• sentence TTS
• movie replay

SentenceLab must consume the token stream from the subtitle engine.

It must not modify segmentation logic.

14. Interaction Model

LinguaPlay supports two viewing modes.

Netflix Mode

Triggered by video play.

Behavior:

continuous playback
automatic subtitle progression

Study Mode

Triggered by language interaction.

Behavior:

video pauses
token study
sentence replay
sandbox interaction

15. Icon Usage Rules

Icons must represent real actions.

Allowed:

▶ replay audio
🔊 pronunciation
★ save
↻ repeat

Icons must never be decorative.

16. Responsive Layout Rules

The UI must work on mobile and tablet devices.

Mobile layout order:

video
subtitle overlay
transcript
word meaning
sentence meaning
tab workspace

Only the study workspace may scroll.

Video and subtitles must remain pinned.

17. Architecture Safety

The UI layer must not modify the following systems:

dictionaryEngine
tokenTrie
segmentationPostProcessor
learningMemory
subtitleSync
SentenceLab core logic

UI components must consume these systems without altering them.

18. Drift Prevention Rules

Future developers must not:

• redesign the layout without updating this contract
• move subtitle rendering outside the video surface
• replace tokenized subtitles with plain text
• remove the transcript without explicit design approval

All UI changes must reference this document.

19. Validation Checklist

Before any UI update is merged:

video remains visible
subtitle overlay active
tokens clickable
transcript replay works
word panel updates
sentence translation toggle works
SentenceLab functions
mobile layout stable

20. Versioning

This contract defines:

UI_V2

The legacy interface must remain available as:

UI_V1

Future UI revisions must create:

UI_V3

with a new contract file.

End of UI Contract
