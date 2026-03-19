/**
 * ENGINE PRIMITIVE: ChainEngine
 * PURPOSE: Progression priority management.
 * INVARIANT: Immutable priority sequence.
 */

import { HeatLevel } from './BonusMaskSystem.ts';

export class ChainEngine {
  /**
   * The canonical priority sequence for learning targets.
   * Unknown -> Rare -> Mid -> Common.
   */
  static getPriorityChain(): HeatLevel[] {
    return ['unknown', 'rare', 'mid', 'common'];
  }
}
