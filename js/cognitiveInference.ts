import { learningMemory } from './learningMemory.ts';
import { TokenLearningProfile, CognitiveDerivationInput } from './cognitiveTypes.ts';
import { deriveProfile } from './memoryDerivations.ts';
import { timeAuthority } from './timeAuthority.ts';
import { TokenMemoryRecord } from './pedagogy.ts';

export function computeDecay(memory: TokenMemoryRecord, now: number): number {
  if (!memory || !memory.lastSeenAt) return 0;
  
  const msSinceLastSeen = now - memory.lastSeenAt;
  const hoursSinceLastSeen = msSinceLastSeen / (1000 * 60 * 60);
  
  if (hoursSinceLastSeen >= 168) return 0.9; // 7 days
  if (hoursSinceLastSeen >= 72) return 0.6;
  if (hoursSinceLastSeen >= 48) return 0.3;
  if (hoursSinceLastSeen >= 24) return 0.1;
  
  return 0;
}

export class CognitiveInference {
  /**
   * Derives a cognitive profile for a single token based on current memory and time.
   */
  deriveTokenProfile(token: string, now: number = timeAuthority.getNow()): TokenLearningProfile {
    const memoryRecord = learningMemory.getRecord(token);
    const input: CognitiveDerivationInput = {
      token,
      memoryRecord,
      now
    };
    return deriveProfile(input);
  }

  /**
   * Derives cognitive profiles for all tokens currently in memory.
   */
  deriveAllProfiles(now: number = timeAuthority.getNow()): TokenLearningProfile[] {
    const allMemory = learningMemory.getAllMemory();
    const profiles: TokenLearningProfile[] = [];
    
    for (const token of Object.keys(allMemory)) {
      profiles.push(this.deriveTokenProfile(token, now));
    }
    
    return profiles;
  }

  /**
   * Returns explanation/evidence strings for debugging a specific token.
   */
  getProfileEvidence(token: string, now: number = timeAuthority.getNow()): string[] {
    const profile = this.deriveTokenProfile(token, now);
    return profile.evidenceSummary;
  }
}

export const cognitiveInference = new CognitiveInference();
