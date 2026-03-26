import { learningMemory } from './learningMemory.ts';
import { TokenLearningProfile, CognitiveDerivationInput } from './cognitiveTypes.ts';
import { deriveProfile } from './memoryDerivations.ts';

export class CognitiveInference {
  /**
   * Derives a cognitive profile for a single token based on current memory and time.
   */
  deriveTokenProfile(token: string, now: number = Date.now()): TokenLearningProfile {
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
  deriveAllProfiles(now: number = Date.now()): TokenLearningProfile[] {
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
  getProfileEvidence(token: string, now: number = Date.now()): string[] {
    const profile = this.deriveTokenProfile(token, now);
    return profile.evidenceSummary;
  }
}

export const cognitiveInference = new CognitiveInference();
