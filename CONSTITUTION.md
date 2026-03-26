# LinguaPlay Runtime Constitution

**Version:** RC-1  
**Status:** Frozen Baseline Governance Document  
**Scope:** Runtime Core Only (Pre-R4 Cognitive Layer)  
**Authority:** Project Architecture PM  

---

## 1. System Identity

LinguaPlay is a deterministic language-learning runtime centered on timed media and subtitle-driven cognitive interaction.

It is **not**:
*   a generic game engine
*   a multi-game cognition framework
*   an AI experimentation sandbox
*   a reward-system platform
*   an adaptive algorithm lab

All runtime evolution must preserve the identity: **Video-synchronized linguistic cognition engine**.

---

## 2. Runtime Authority Laws

These laws are invariant unless formally revised.

### 2.1 Video Time Authority Law
`video.currentTime` is the single temporal authority. All subtitle activation must be derived from video time. No independent subtitle timeline truth may exist.

**Violation examples:**
*   storing subtitle progression state as primary truth
*   predictive subtitle advancement
*   timer-driven activation

**Allowed:**
*   derived subtitle state
*   observability instrumentation

### 2.2 Subtitle Activation Determinism Law
Given identical video file, subtitle file, and lexicon state, the runtime must produce identical:
*   active subtitle sequence
*   encounter event sequence
*   attention targeting

Non-deterministic behavior is forbidden.

### 2.3 Tokenization Determinism Law
Segmentation must be deterministic, lexicon-aware, and repeatable. No probabilistic segmentation, heuristic mutation during runtime, or UI-driven token reinterpretation. Tokenization is a linguistic truth layer, not a learning inference layer.

### 2.4 Lexicon Authority Law
Lexicon state must always be explicit. Runtime must know whether it operates in `FULL` lexicon mode or `FALLBACK` lexicon mode. Silent fallback is forbidden. Lexicon state affects segmentation, attention, and memory signal meaning.

### 2.5 Memory Observational Law
Learning memory records observations only. It must not infer mastery, difficulty, or learning state. Memory stores encounter events, review events, and save events. Inference belongs to the R4 layer.

### 2.6 Attention Determinism Law
Attention targeting must be explainable from code, stable under identical inputs, and free of randomness. The attention engine may not depend on UI timing, depend on iteration accident, or mutate runtime state beyond its domain.

### 2.7 State Unidirectionality Law
Runtime state flow must remain: **Event → State → Subscriber → UI**.
**Forbidden:**
*   UI mutating core truth state outside controlled pathways
*   circular state propagation
*   hidden side-effects

---

## 3. Deterministic Invariants

The following invariants must hold at all times:
1.  Subtitle activation derived only from video time.
2.  Segmentation output stable for identical input.
3.  Memory event ordering stable across runs.
4.  Attention selection stable across runs.
5.  Lexicon mode known at all times.
6.  Debug systems read-only.
7.  No runtime randomness introduced.
8.  No async race affecting core truth.
9.  Core runtime modules do not depend on R4 logic.
10. UI does not own pedagogy.

---

## 4. Frozen Runtime Core Modules

These modules form the constitutional baseline:
*   `app.ts`
*   `subtitleSync.ts`
*   `subtitleParser.ts`
*   `subtitleRenderer.ts`
*   `tokenTrie.ts`
*   `segmentationPostProcessor.ts`
*   `dictionaryEngine.ts`
*   `attentionEngine.ts`
*   `learningMemory.ts`
*   `state.ts`
*   `uiBindings.ts`

Changes to these modules require explicit architectural justification, determinism verification, and regression validation.

---

## 5. Observability Guarantees

The runtime must expose:
*   lexicon mode
*   subtitle skip events
*   attention target trace
*   memory event trace

Observability is mandatory for future correctness.

---

## 6. R4 Integration Boundary

R4 Cognitive Layer must initially:
*   observe runtime signals
*   derive learning profiles
*   compute reinforcement candidates

R4 must **NOT** initially:
*   modify subtitle sync
*   modify tokenization
*   modify memory recording
*   override attention logic

Influence is allowed only after validation phase.

---

## 7. Anti-Drift Enforcement Rules

Future coders must not:
*   refactor runtime for aesthetic reasons
*   introduce async abstractions casually
*   merge cognitive inference into core runtime
*   generalize runtime into a platform prematurely
*   optimize before correctness

Every architectural change must answer: **Does this preserve deterministic linguistic cognition?**

---

## 8. Freeze Scope Definition

This constitution freezes:
*   runtime event model
*   segmentation pipeline
*   subtitle sync behavior
*   attention targeting logic
*   memory observation semantics
*   lexicon authority model

It does **NOT** freeze:
*   cognitive inference math
*   reinforcement scheduling
*   UX learning surfaces
*   performance tuning
*   adaptive pedagogy

---

## 9. Future Governance Model

**Evolution path:**
1.  Phase RC-1 → Runtime Stabilized
2.  Phase R4 → Cognitive Inference Layer
3.  Phase R5 → Reinforcement Engine
4.  Phase R6 → Adaptive Pedagogy

Each phase must preserve all runtime laws.

---

## 10. Enforcement Principle

This document is not descriptive. It is **prescriptive**. Any change conflicting with these laws must be treated as an **Architectural Violation**.
