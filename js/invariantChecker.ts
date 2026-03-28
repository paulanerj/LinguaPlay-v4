import fs from 'fs';
import path from 'path';

/**
 * Invariant Checker
 * Scans the codebase for violations of R5 system hardening rules.
 */
export class InvariantChecker {
  private jsDir = path.join(process.cwd(), 'js');

  async runCheck(): Promise<boolean> {
    console.log("\\n=== RUNNING INVARIANT CHECKER ===");
    let isCompliant = true;

    const files = this.getAllJsFiles(this.jsDir);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.basename(file);

      if (fileName === 'invariantChecker.ts') continue;

      // 1. Multiple time sources
      if (fileName !== 'timeAuthority.ts' && content.includes('Date.now()')) {
        console.error(`[VIOLATION] Date.now() found in ${fileName}. Use timeAuthority.getNow() instead.`);
        isCompliant = false;
      }

      // 2. Entropy sources
      if (content.includes('Math.random()')) {
        console.error(`[VIOLATION] Math.random() found in ${fileName}. Determinism compromised.`);
        isCompliant = false;
      }

      // 3. Async drift
      if (content.includes('setTimeout(') || content.includes('setInterval(')) {
        // Allow in uiBindings for UI-specific things, but flag elsewhere
        if (fileName !== 'uiBindings.ts' && fileName !== 'attentionDebug.ts' && fileName !== 'orchestrationDebug.ts') {
           console.error(`[VIOLATION] Async drift (setTimeout/setInterval) found in ${fileName}.`);
           isCompliant = false;
        }
      }

      // 4. State mutation violations (basic check)
      // Look for stateManager.getState().something = ...
      const stateMutationRegex = /stateManager\\.getState\\(\\)\\.[a-zA-Z0-9_]+\\s*=[^=]/g;
      if (stateMutationRegex.test(content)) {
        console.error(`[VIOLATION] Direct state mutation found in ${fileName}. Use stateManager.setState().`);
        isCompliant = false;
      }
    }

    if (isCompliant) {
      console.log("\\n[SUCCESS] Codebase complies with all R5 invariants.");
    }

    return isCompliant;
  }

  private getAllJsFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(this.getAllJsFiles(file));
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        results.push(file);
      }
    });
    return results;
  }
}

export const invariantChecker = new InvariantChecker();
