import { OrchestrationDecision, SessionCognitiveSnapshot, ReviewQueueEntry } from './orchestrationTypes.ts';

export function formatOrchestrationDecision(decision: OrchestrationDecision | null): string {
  if (!decision) return '<div class="text-xs opacity-50 italic">No orchestration decision</div>';

  return `
    <div class="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      <h4 class="text-xs uppercase tracking-wider opacity-40 mb-2 font-bold">Orchestration Decision</h4>
      <div class="grid grid-cols-2 gap-2 text-[10px] mb-2">
        <div class="flex flex-col">
          <span class="opacity-50">Mode</span>
          <span class="font-bold text-blue-400">${decision.mode}</span>
        </div>
        <div class="flex flex-col">
          <span class="opacity-50">Strategy</span>
          <span class="font-bold text-purple-400">${decision.focusStrategy}</span>
        </div>
        <div class="flex flex-col">
          <span class="opacity-50">Pressure Score</span>
          <span class="font-bold text-accent-primary">${decision.reviewPressureScore.toFixed(2)}</span>
        </div>
        <div class="flex flex-col">
          <span class="opacity-50">Advised Target</span>
          <span class="font-bold text-accent-secondary">${decision.advisedTarget || 'None'}</span>
        </div>
      </div>
      <div class="text-[10px] mt-2">
        <span class="opacity-50 block mb-1">Rationale:</span>
        <ul class="list-disc pl-4 opacity-80 space-y-1">
          ${decision.rationale.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

export function formatReviewQueuePreview(queue: ReviewQueueEntry[] | null): string {
  if (!queue || queue.length === 0) return '<div class="text-xs opacity-50 italic">Review queue empty</div>';

  const rowsHtml = queue.slice(0, 3).map((entry, idx) => `
    <div class="flex justify-between items-center py-1 border-b border-slate-700/50 last:border-0">
      <span class="opacity-80">#${idx + 1} (ID: ${entry.subtitleId})</span>
      <span class="text-accent-primary font-bold">${entry.priorityScore.toFixed(1)}</span>
    </div>
    <div class="text-[9px] opacity-60 pl-2 mb-1">
      Rescue: ${entry.rescueTokenCount} | Reactivate: ${entry.reactivateTokenCount} | Decay Risk: ${entry.maxDecayRisk.toFixed(2)}
    </div>
  `).join('');

  return `
    <div class="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      <h4 class="text-xs uppercase tracking-wider opacity-40 mb-2 font-bold">Review Queue Preview</h4>
      <div class="text-[10px] flex flex-col">
        ${rowsHtml}
      </div>
      ${queue.length > 3 ? `<div class="text-[9px] opacity-40 text-center mt-1">+${queue.length - 3} more</div>` : ''}
    </div>
  `;
}
