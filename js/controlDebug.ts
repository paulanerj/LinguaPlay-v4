import { GuidedControlDecision } from './controlTypes.ts';

export function formatGuidedControlDecision(decision: GuidedControlDecision | null): string {
  if (!decision) {
    return `<div class="cognitive-control-debug"><p>No guided control decision available.</p></div>`;
  }

  return `
    <div class="cognitive-control-debug">
      <h4>Guided Learning Control</h4>
      <div class="debug-grid">
        <div class="debug-row">
          <span class="debug-label">Control Mode:</span>
          <span class="debug-value font-bold text-accent-primary">${decision.controlMode}</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Review Entry State:</span>
          <span class="debug-value">${decision.reviewEntryState}</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Review Progress:</span>
          <span class="debug-value">${decision.reviewProgressState}</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Proposed Row:</span>
          <span class="debug-value">${decision.proposedReviewSubtitleId ?? 'None'}</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Proposed Target:</span>
          <span class="debug-value">${decision.proposedTargetToken ?? 'None'}</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Watch Flow:</span>
          <span class="debug-value">${decision.shouldRemainInWatchFlow ? 'YES' : 'NO'}</span>
        </div>
      </div>
      <div class="debug-rationale mt-2">
        <span class="debug-label">Rationale:</span>
        <ul class="text-[10px] opacity-80 list-disc pl-4 mt-1">
          ${decision.rationale.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}
