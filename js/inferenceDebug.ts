import { TokenLearningProfile, ReinforcementCandidate } from './cognitiveTypes.ts';

export class InferenceDebug {
  /**
   * Formats a single token learning profile into a readable HTML string.
   */
  formatProfile(profile: TokenLearningProfile): string {
    return `
      <div class="cognitive-profile-debug">
        <h4>Cognitive Profile: ${profile.token}</h4>
        <ul>
          <li><strong>State:</strong> ${profile.inferredState}</li>
          <li><strong>Confidence:</strong> ${(profile.confidence * 100).toFixed(1)}%</li>
          <li><strong>Decay Risk:</strong> ${(profile.decayRisk * 100).toFixed(1)}%</li>
          <li><strong>Momentum:</strong> ${(profile.consolidationMomentum * 100).toFixed(1)}%</li>
          <li><strong>Familiarity Score:</strong> ${profile.familiarityScore.toFixed(2)}</li>
          <li><strong>Semantic Link Score:</strong> ${profile.semanticLinkScore.toFixed(2)}</li>
        </ul>
        <h5>Evidence Summary:</h5>
        <ul class="evidence-list">
          ${profile.evidenceSummary.map(evidence => `<li>${evidence}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  /**
   * Formats a list of reinforcement candidates into a readable HTML string.
   */
  formatCandidates(candidates: ReinforcementCandidate[]): string {
    if (candidates.length === 0) {
      return `<div class="cognitive-candidates-debug"><p>No reinforcement candidates available.</p></div>`;
    }

    return `
      <div class="cognitive-candidates-debug">
        <h4>Top Reinforcement Candidates</h4>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Class</th>
              <th>State</th>
              <th>Decay Risk</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${candidates.map(c => `
              <tr>
                <td><strong>${c.token}</strong></td>
                <td>${c.reinforcementClass}</td>
                <td>${c.profile.inferredState}</td>
                <td>${(c.profile.decayRisk * 100).toFixed(1)}%</td>
                <td>${(c.profile.confidence * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

export const inferenceDebug = new InferenceDebug();
