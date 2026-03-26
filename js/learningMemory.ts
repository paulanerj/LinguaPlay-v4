/**
 * PURPOSE: Persistent Token Memory Store.
 * WHY THIS EXISTS: Tracks learner history with tokens across sessions.
 * CONTRACT:
 *   - Minimal, deterministic persistence via localStorage.
 *   - No pedagogical inference yet.
 * 
 * MEMORY INVARIANTS:
 *   - Encounter Semantics: Counts every activation of a subtitle row containing the token.
 *   - Persistence: Schema-consistent localStorage writes on every event.
 *   - R4 Dependency: This raw trace is the prerequisite for future cognitive state inference.
 * 
 * FROZEN POLICY: EncounterPolicy.PER_ACTIVATION
 *   - Re-watching the same subtitle counts as a new encounter.
 *   - This is a frozen learning model assumption for the current baseline.
 */

import { TokenMemoryRecord, TokenMemoryStore } from './pedagogy.ts';

const STORAGE_KEY = 'linguaplay_memory_v1';

class LearningMemory {
  private memory: TokenMemoryStore = {};

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.memory = JSON.parse(stored);
      }
    } catch (err) {
      console.error('[MEMORY] Failed to load memory:', err);
      this.memory = {};
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch (err) {
      console.error('[MEMORY] Failed to save memory:', err);
    }
  }

  getRecord(token: string): TokenMemoryRecord | null {
    return this.memory[token] || null;
  }

  getAllMemory(): TokenMemoryStore {
    return { ...this.memory };
  }

  recordEncounter(token: string, timestamp: number) {
    if (!this.memory[token]) {
      this.memory[token] = {
        token,
        encounterCount: 1,
        reviewCount: 0,
        saveCount: 0,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp
      };
    } else {
      this.memory[token].encounterCount++;
      this.memory[token].lastSeenAt = timestamp;
    }
    this.save();
  }

  recordReview(token: string, timestamp: number) {
    if (!this.memory[token]) {
      this.memory[token] = {
        token,
        encounterCount: 1, // Assumed seen if reviewed
        reviewCount: 1,
        saveCount: 0,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        lastReviewedAt: timestamp
      };
    } else {
      this.memory[token].reviewCount++;
      this.memory[token].lastReviewedAt = timestamp;
    }
    this.save();
  }

  recordSave(token: string, timestamp: number) {
    if (!this.memory[token]) {
      this.memory[token] = {
        token,
        encounterCount: 1, // Assumed seen if saved
        reviewCount: 0,
        saveCount: 1,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        lastSavedAt: timestamp
      };
    } else {
      this.memory[token].saveCount++;
      this.memory[token].lastSavedAt = timestamp;
    }
    this.save();
  }

  clearAllMemory() {
    this.memory = {};
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const learningMemory = new LearningMemory();
